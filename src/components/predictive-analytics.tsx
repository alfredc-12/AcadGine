"use client";

import { ChevronRight, Info } from "lucide-react";
import { useDashboard } from "@/components/app-shell";
import { Card, CardContent, CardHeader, CardTitle, Table } from "@/components/ui/primitives";
import { courseByCode } from "@/data/academic";
import model from "@/data/predictive-model.json";
import { compare, formatPercent, sectionKey, signed, summarize } from "@/lib/analytics";

type ModelSection = { program: string; subjectCode: string; section: string };

function modelSectionKey(row: ModelSection) {
  return `${row.program}:${row.subjectCode}:${row.section}`;
}

function SectionLabel({ row }: { row: ModelSection }) {
  return <>
    <span className="cell-title">{courseByCode.get(row.subjectCode)?.name ?? row.subjectCode}</span>
    <small>{row.subjectCode} · Section {row.section}</small>
  </>;
}

function changeLabel(predicted: number | null, current: number | null) {
  const change = compare(predicted, current, 1);
  return change === null ? "N/A" : `${signed(change)} pp`;
}

export function PredictiveAnalytics() {
  const { scope, course, section, period, rows } = useDashboard();
  const activeSections = new Set(rows.map(sectionKey));
  const forecast = model.forecasts.find(({ sourcePeriodId }) => sourcePeriodId === period.id);
  const predictions = forecast?.predictions.filter((row) => activeSections.has(modelSectionKey(row))) ?? [];
  const total = predictions.reduce(
    (sum, row) => ({
      graded: sum.graded + row.sourceGraded,
      current: sum.current + row.sourcePassingRate * row.sourceGraded,
      predicted: sum.predicted + row.predictedPassingRate * row.sourceGraded,
    }),
    { graded: 0, current: 0, predicted: 0 },
  );
  const predicted = total.graded ? total.predicted / total.graded : null;
  const current = total.graded ? total.current / total.graded : summarize(rows).passing;
  const retrospective = model.retrospective.filter((row) => (
    row.targetYear === Number(period.year.slice(0, 4)) && row.targetSemester === period.semester
    && (scope.program === "all" || row.program === scope.program)
    && (course === "all" || row.subjectCode === course)
    && (section === "all" || modelSectionKey(row) === section)
  ));
  const metrics = model.metrics;
  const baselineAdvantage = (metrics.test_mae_percentage_points - metrics.baseline_mae_percentage_points).toFixed(2);

  return <section className="dashboard-section section-reveal no-print" aria-labelledby="predictive-title">
    <header className="section-heading"><h2 id="predictive-title">Predictive Analytics</h2></header>
    <Card aria-labelledby="predictive-model-title">
      <CardHeader>
        <CardTitle as="h3" id="predictive-model-title">Experimental Predictive Model — Synthetic Data</CardTitle>
        <details className="context-disclosure">
          <summary aria-label="About these predictions"><Info aria-hidden="true" /></summary>
          <p>The Random Forest was trained on fictional academic records. Forecasts use observed enrollment, passing rates, and SETE indicators from the prior semester. Real university validation is unavailable. SETE ratings cannot establish causes. Use predictions as one input to academic review.</p>
        </details>
      </CardHeader>
      <CardContent>
        <div className="prediction-grid">
          <div className="prediction-panel">
            <h4>Next-semester passing rate</h4>
            {forecast && <p className="prediction-context">
              AY {forecast.targetYear}–{forecast.targetYear + 1} · Semester {forecast.targetSemester} · From {period.short}
            </p>}
            <dl className="prediction-facts">
              <div><dt>Predicted</dt><dd>{formatPercent(predicted)}</dd></div>
              <div><dt>Current</dt><dd>{formatPercent(current)}</dd></div>
              <div><dt>Predicted change</dt><dd>{changeLabel(predicted, current)}</dd></div>
            </dl>
            {predictions.length ? <>
              <p className="prediction-context">{predictions.length} of {rows.length} sections · Weighted by current graded enrollments</p>
              <div className="prediction-table">
                <Table aria-label="Next-semester section predictions">
                  <thead><tr>
                    <th scope="col">Section</th><th scope="col" className="number">Current</th>
                    <th scope="col" className="number">Predicted</th><th scope="col" className="number">Change</th>
                  </tr></thead>
                  <tbody>{predictions.map((row) => <tr key={modelSectionKey(row)}>
                    <td><SectionLabel row={row} /></td>
                    <td className="number">{formatPercent(row.sourcePassingRate)}</td>
                    <td className="number">{formatPercent(row.predictedPassingRate)}</td>
                    <td className="number">{changeLabel(row.predictedPassingRate, row.sourcePassingRate)}</td>
                  </tr>)}</tbody>
                </Table>
              </div>
            </> : <p className="prediction-context">No compatible forward predictions for this selection in {period.short}.</p>}
          </div>

          <div className="prediction-panel">
            <h4>Held-out evaluation</h4>
            <dl className="prediction-facts">
              <div><dt>Random Forest MAE</dt><dd>{metrics.test_mae_percentage_points.toFixed(2)} <small>pp</small></dd></div>
              <div><dt>Random Forest RMSE</dt><dd>{metrics.test_rmse_percentage_points.toFixed(2)} <small>pp</small></dd></div>
              <div><dt>Baseline MAE</dt><dd>{metrics.baseline_mae_percentage_points.toFixed(2)} <small>pp</small></dd></div>
            </dl>
            <p className="prediction-context">The baseline MAE was {baselineAdvantage} percentage points lower on the {metrics.test_rows} held-out synthetic records.</p>
            <details className="disclosure prediction-retrospective">
              <summary>Retrospective predictions <ChevronRight aria-hidden="true" /></summary>
              <div className="disclosure-body">
                <p>{period.label} · Actuals come from the separate held-out synthetic dataset.</p>
                {retrospective.length ? <div className="prediction-table">
                  <Table aria-label="Held-out actual, predicted, and baseline passing rates">
                    <thead><tr>
                      <th scope="col">Section</th><th scope="col" className="number">Actual</th>
                      <th scope="col" className="number">Predicted</th><th scope="col" className="number">Baseline</th>
                    </tr></thead>
                    <tbody>{retrospective.map((row) => <tr key={modelSectionKey(row)}>
                      <td><SectionLabel row={row} /></td>
                      <td className="number">{formatPercent(row.actualPassingRate)}</td>
                      <td className="number">{formatPercent(row.predictedPassingRate)}</td>
                      <td className="number">{formatPercent(row.baselinePassingRate)}</td>
                    </tr>)}</tbody>
                  </Table>
                </div> : <p>No retrospective records for this selection.</p>}
              </div>
            </details>
          </div>
        </div>
      </CardContent>
    </Card>
  </section>;
}
