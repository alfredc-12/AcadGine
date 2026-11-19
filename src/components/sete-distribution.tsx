"use client";

import { ArrowUpRight } from "lucide-react";
import { formatPercent, integer, percent, targets, type SectionAssessment } from "@/lib/analytics";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/primitives";

const ranges = [
  { label: "Below 3.0", below: 3, low: true },
  { label: "3.0–3.49", below: 3.5, low: true },
  { label: "3.5–3.99", below: 4, low: false },
  { label: "4.0–4.49", below: 4.5, low: false },
  { label: "4.5–5.0", below: 5.01, low: false },
];

export function SeteDistribution({ assessments, onOpen }: {
  assessments: SectionAssessment[];
  onOpen: (title: string, sections: SectionAssessment[], summary: string) => void;
}) {
  const groups = ranges.map((range) => ({ ...range, sections: [] as SectionAssessment[] }));
  const insufficient = assessments.filter(({ sufficientSete, rating }) => !sufficientSete || rating === null);
  const evaluated = assessments.length - insufficient.length;
  for (const assessment of assessments) {
    if (!assessment.sufficientSete || assessment.rating === null) continue;
    // Use the same precision as the section table for ratings near a boundary.
    const rating = Number(assessment.rating.toFixed(2));
    groups.find(({ below }) => rating < below)?.sections.push(assessment);
  }

  return <Card className="distribution-card" aria-labelledby="sete-distribution-title">
    <CardHeader>
      <CardTitle as="h3" id="sete-distribution-title">SETE Distribution</CardTitle>
      <span className="chart-unit" title="Sections with sufficient SETE responses">{integer(evaluated)} evaluated</span>
    </CardHeader>
    <CardContent>
      <ul className="distribution-list" aria-label="Section counts by SETE rating, out of 5">
        {groups.map(({ label, low, sections }) => {
          const count = sections.length;
          const share = percent(count, evaluated);
          const summary = `${integer(count)} of ${integer(evaluated)} evaluated sections${share === null ? "" : ` (${formatPercent(share)})`}.`;
          return <li key={label}>
            <button type="button" className="distribution-row" data-low={low} disabled={!count}
              aria-label={`${label} out of 5. ${summary}${count ? " View sections." : ""}`}
              onClick={() => onOpen(`SETE distribution · ${label}`, sections, summary)}>
              <span>{label}</span>
              <span className="distribution-track" aria-hidden="true"><span style={{ width: `${share ?? 0}%` }} /></span>
              <strong>{integer(count)}</strong>
              <span className="chart-tooltip bar-tooltip" aria-hidden="true">{summary}</span>
            </button>
          </li>;
        })}
      </ul>
      {!evaluated && <p className="distribution-empty">No sections meet the SETE evidence threshold.</p>}
      {insufficient.length > 0 && <button type="button" className="distribution-limited"
        onClick={() => onOpen("Insufficient SETE responses", insufficient,
          `${integer(insufficient.length)} of ${integer(assessments.length)} sections lack enough SETE evidence. Rating groups require at least ${targets.minResponses} valid responses and ${targets.minParticipation}% participation.`)}>
        <span>Insufficient responses</span><strong>{integer(insufficient.length)}</strong><ArrowUpRight aria-hidden="true" />
      </button>}
    </CardContent>
  </Card>;
}
