"use client";

import { ArrowDownRight, ArrowUpRight, Info, Minus } from "lucide-react";
import { Status } from "@/components/records";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/primitives";
import { dimensions, type Dimension, type Section } from "@/data/academic";
import { averageSete, compare, formatPercent, formatScore, integer, signed, targets, type SectionAssessment, type summarize } from "@/lib/analytics";

export function TeachingEffectiveness({ rows, assessments, metrics, onOpenDimension }: {
  rows: Section[];
  assessments: SectionAssessment[];
  metrics: ReturnType<typeof summarize>;
  onOpenDimension: (dimension: Dimension, name: string, summary: string) => void;
}) {
  const pairs = assessments.flatMap(({ row, previous, change }) => previous && change !== null ? [{ row, previous }] : []);
  const currentComparable = pairs.map(({ row }) => row);
  const previousComparable = pairs.map(({ previous }) => previous);
  const ratings = dimensions.map((dimension) => {
    const value = averageSete(rows, dimension.id);
    return { ...dimension, value, change: compare(averageSete(currentComparable, dimension.id), averageSete(previousComparable, dimension.id), 2) };
  });
  const declines = ratings.filter(({ change }) => change !== null && change <= -targets.dimensionDrop)
    .sort((a, b) => (a.change ?? 0) - (b.change ?? 0));
  const lowest = [...ratings].sort((a, b) => (a.value ?? Infinity) - (b.value ?? Infinity))[0];
  const focus = declines.length ? declines.slice(0, 2) : lowest?.value != null ? [lowest] : [];
  const participation = metrics.participation;
  const belowTarget = participation !== null && participation < targets.participation;
  const participationTone = participation === null ? "neutral" : belowTarget ? "warning" : "positive";

  function openRating(rating: (typeof ratings)[number], reason?: string) {
    const parts = [rating.value === null ? "No ratings." : `Weighted rating: ${formatScore(rating.value)} / 5.`,
      rating.change === null ? "Previous-period change N/A." : `${signed(rating.change, 2)} points vs previous period.`];
    onOpenDimension(rating.id, rating.name, [...parts, reason].filter(Boolean).join(" "));
  }

  return <section className="dashboard-section section-reveal no-print" aria-labelledby="teaching-title" data-tour-target="teaching" tabIndex={-1}>
    <header className="section-heading">
      <h2 id="teaching-title">Teaching Effectiveness</h2>
      <details className="context-disclosure">
        <summary aria-label="About SETE ratings" title="About SETE ratings"><Info aria-hidden="true" /></summary>
        <p>These example dimensions use a 5-point scale, weighted by valid responses. Trend arrows use comparable sections with sufficient evidence in both periods. Review SETE alongside other teaching evidence.</p>
      </details>
    </header>
    <div className="teaching-grid">
      <Card className="dimensions-card" aria-labelledby="dimension-title">
        <CardHeader>
          <CardTitle as="h3" id="dimension-title">Evaluation Dimensions</CardTitle>
          <span className="chart-unit">Out of 5</span>
        </CardHeader>
        <CardContent>
          <div className="dimension-list">
            {ratings.map((rating) => {
              const { id, name, value, change } = rating;
              const needsReview = change !== null && change <= -targets.dimensionDrop;
              const trend = change === null ? "Previous-period change N/A" : `${signed(change, 2)} points vs previous comparable period`;
              const TrendIcon = change === null || change === 0 ? Minus : change < 0 ? ArrowDownRight : ArrowUpRight;
              return <button className="dimension-row" type="button" key={id} onClick={() => openRating(rating)} data-review={needsReview}
                aria-label={`${name}, ${value === null ? "no ratings" : `${formatScore(value)} out of 5`}. ${trend}.${needsReview ? " Meets demo review threshold." : ""} View details`}>
                <span className="dimension-name">{name}</span>
                <span className="dimension-track" aria-hidden="true">
                  <span style={{ width: `${(value ?? 0) / 5 * 100}%` }} />
                </span>
                <strong>{formatScore(value)}</strong>
                <span className="dimension-trend" aria-hidden="true" title={trend}
                  data-tone={change === null || change === 0 ? "neutral" : change < 0 ? "warning" : "positive"}>{change === null ? "N/A" : <TrendIcon />}</span>
              </button>;
            })}
          </div>
        </CardContent>
      </Card>
      <Card className="teaching-summary" aria-labelledby="participation-title">
        <CardHeader>
          <CardTitle as="h3" id="participation-title">Participation</CardTitle>
          <Status tone={participationTone}>{participation === null ? "No invitations" : belowTarget ? "Below target" : "Meets target"}</Status>
        </CardHeader>
        <CardContent>
          <div className="participation-summary">
            <strong>{formatPercent(participation)}</strong>
            <p title={`${metrics.coverage} of ${rows.length} sections evaluated`}>{integer(metrics.responses)} / {integer(metrics.invitations)} responses
              <small className="sr-only">{metrics.coverage} of {rows.length} sections evaluated.</small></p>
          </div>
          {participation !== null && <div className="participation-meter" data-tone={participationTone}
            role="meter" aria-label="SETE participation" aria-valuenow={Number(participation.toFixed(1))}
            aria-valuemin={0} aria-valuemax={100} aria-valuetext={formatPercent(participation)}>
            <span aria-hidden="true" style={{ width: `${participation}%` }} />
          </div>}
          {focus.length > 0 && <div className="teaching-focus">
            <h4>Review focus</h4>
            <div>{focus.map((rating) => (
              <button type="button" className="focus-row" key={rating.id}
                onClick={() => openRating(rating, declines.length ? "This decline meets the demo review threshold." : "This dimension has the lowest rating in the current selection.")}>
                <span>{rating.name}</span>
                <ArrowUpRight aria-hidden="true" />
              </button>
            ))}</div>
          </div>}
        </CardContent>
      </Card>
    </div>
  </section>;
}
