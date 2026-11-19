"""Generate the static Acadgine prediction bundle from the original model archive."""

import argparse
import csv
import io
import json
import math
from pathlib import Path
import subprocess
from zipfile import ZipFile

import joblib
import pandas as pd
import sklearn


ROOT = Path(__file__).resolve().parents[1]
DEFAULT_OUTPUT = ROOT / "src" / "data" / "predictive-model.json"

# Import the dashboard's local records and shared rate calculations without starting Next.js.
EXPORT_INPUTS = """
import { registerHooks } from "node:module";

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier.startsWith("@/")) {
      return nextResolve(new URL("./src/" + specifier.slice(2) + ".ts", import.meta.url).href, context);
    }
    return nextResolve(specifier, context);
  },
});

const { periods, sections } = await import("./src/data/academic.ts");
const { averageSete, percent } = await import("./src/lib/analytics.ts");
process.stdout.write(JSON.stringify({
  periods,
  sections: sections.map((row) => ({
    period: row.period,
    program: row.program,
    subject_code: row.course,
    section: row.section,
    enrolled: row.enrolled,
    graded: row.graded,
    passing: percent(row.passed, row.graded),
    sete: averageSete([row]),
    participation: percent(row.responses, row.invitations),
  })),
}));
"""


def read_evaluation(archive, metrics):
    csv_text = archive.read("acadgine_predictions.csv").decode("utf-8-sig")
    rows = [
        {
            "targetYear": int(row["target_academic_year"][3:7]),
            "targetSemester": int(row["target_semester"]),
            "program": row["program"],
            "subjectCode": row["subject_code"],
            "section": row["section"],
            "actualPassingRate": float(row["next_semester_passing_rate_pct"]),
            "predictedPassingRate": float(row["predicted_passing_rate_pct"]),
            "baselinePassingRate": float(row["baseline_passing_rate_pct"]),
        }
        for row in csv.DictReader(io.StringIO(csv_text))
    ]
    if len(rows) != metrics["test_rows"]:
        raise ValueError("The supplied evaluation CSV and metrics record different held-out counts.")
    return rows


def forecast_period(model, features, categories, period, rows):
    target_year = int(period["year"][:4]) + (period["semester"] == 2)
    target_semester = 1 if period["semester"] == 2 else 2
    inputs = []
    sources = []

    for row in rows:
        if row["period"] != period["id"]:
            continue
        if any(row[field] not in values for field, values in categories.items()):
            continue
        # The saved preprocessing passes numeric inputs through. The original SETE fill
        # value was not supplied, so only observed ratings can be used with imputed = 0.
        if any(row[field] is None for field in ("passing", "sete", "participation")):
            continue

        inputs.append({
            "program": row["program"],
            "subject_code": row["subject_code"],
            "section": row["section"],
            "target_semester": target_semester,
            "previous_enrollment": row["enrolled"],
            "previous_passing_rate_pct": row["passing"],
            "previous_sete_rating_1to5": row["sete"],
            "previous_sete_participation_pct": row["participation"],
            "previous_sete_rating_imputed": 0,
        })
        sources.append(row)

    predictions = []
    if inputs:
        frame = pd.DataFrame.from_records(inputs, columns=features)
        outputs = model.predict(frame)
        for row, output in zip(sources, outputs, strict=True):
            predicted = float(output)
            if not math.isfinite(predicted) or not 0 <= predicted <= 100:
                raise ValueError("The model emitted a value outside the percentage scale.")
            predictions.append({
                "program": row["program"],
                "subjectCode": row["subject_code"],
                "section": row["section"],
                "sourceGraded": row["graded"],
                "sourcePassingRate": row["passing"],
                "predictedPassingRate": predicted,
            })

    return {
        "sourcePeriodId": period["id"],
        "targetYear": target_year,
        "targetSemester": target_semester,
        "predictions": predictions,
    }


def generate(model_archive, output):
    if sklearn.__version__ != "1.8.0":
        raise RuntimeError("Use scikit-learn 1.8.0, the version stored in the trained artifact.")

    raw = subprocess.run(
        ["node", "--input-type=module", "--eval", EXPORT_INPUTS],
        cwd=ROOT, check=True, capture_output=True, encoding="utf-8",
    )
    data = json.loads(raw.stdout)

    with ZipFile(model_archive) as archive:
        metrics = json.loads(archive.read("acadgine_model_metrics.json"))
        evaluation_rows = read_evaluation(archive, metrics)
        with archive.open("acadgine_random_forest.joblib") as model_file:
            model = joblib.load(model_file)

    features = metrics["input_features"]
    expected_features = [
        "program", "subject_code", "section", "target_semester", "previous_enrollment",
        "previous_passing_rate_pct", "previous_sete_rating_1to5",
        "previous_sete_participation_pct", "previous_sete_rating_imputed",
    ]
    if features != expected_features or list(model.feature_names_in_) != features:
        raise ValueError("The supplied metrics and model do not match Acadgine's feature schema.")
    if type(model.steps[-1][1]).__name__ != "RandomForestRegressor":
        raise ValueError("The archive does not contain the expected trained Random Forest.")
    encoder = model.named_steps["preprocessing"].named_transformers_["categorical"]
    categories = {
        field: set(values)
        for field, values in zip(encoder.feature_names_in_, encoder.categories_, strict=True)
    }
    forecasts = [
        forecast_period(model, features, categories, period, data["sections"])
        for period in data["periods"]
    ]

    bundle = {
        "metrics": metrics,
        "forecasts": forecasts,
        "retrospective": evaluation_rows,
    }
    output.write_text(json.dumps(bundle, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    total = sum(len(period["predictions"]) for period in forecasts)
    print(f"Wrote {total} forward predictions and {len(evaluation_rows)} held-out retrospective rows.")
    print("Forecast counts by source period:", [len(period["predictions"]) for period in forecasts])


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("archive", type=Path, help="Trusted ZIP containing the trained model and evaluation files.")
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT)
    args = parser.parse_args()
    generate(args.archive, args.output)
