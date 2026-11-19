"use client";

import { ArrowUpRight, Info } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/primitives";
import { dimensions, type Dimension, type Section } from "@/data/academic";
import { averageSete, compare, formatPercent, formatScore, integer, signed, targets, type summarize } from "@/lib/analytics";

export function TeachingEffectiveness({ rows, previous, metrics, onOpenDimension }: {
  rows: Section[];
  previous: Section[];
  metrics: ReturnType<typeof summarize>;
  onOpenDimension: (dimension: Dimension, name: string) => void;
}) {
  const ratings = dimensions.map((dimension) => {
    const value = averageSete(rows, dimension.id);
    return { ...dimension, value, change: compare(value, averageSete(previous, dimension.id), 2) };
  });
  const declines = ratings.filter(({ change }) => change !== null && change <= -targets.dimensionDrop)
    .sort((a, b) => (a.change ?? 0) - (b.change ?? 0));
  const lowest = [...ratings].sort((a, b) => (a.value ?? Infinity) - (b.value ?? Infinity))[0];
  const focus = declines.length ? declines.slice(0, 2) : lowest?.value != null ? [lowest] : [];
  const participationTone = metrics.participation !== null && metrics.participation < targets.participation ? "warning" : "neutral";

  return <section className="dashboard-section section-reveal no-print" aria-labelledby="teaching-title">
    <header className="section-heading">
      <h2 id="teaching-title">Teaching Effectiveness</h2>
      <details className="context-disclosure">
        <summary aria-label="About SETE ratings" title="About SETE ratings"><Info aria-hidden="true" /></summary>
        <p>Dimension averages are weighted by valid response counts. Review ratings alongside participation and other teaching evidence.</p>
      </details>
    </header>
    <div className="teaching-grid">
      <Card className="dimensions-card" aria-labelledby="dimension-title">
        <CardHeader><div>
          <CardTitle as="h3" id="dimension-title">Evaluation Dimensions</CardTitle>
          <CardDescription>Weighted ratings out of 5 · Change vs previous period</CardDescription>
        </div></CardHeader>
        <CardContent>
          <div className="dimension-list">
            {ratings.map(({ id, name, value, change }) => (
              <button className="dimension-row" type="button" key={id} onClick={() => onOpenDimension(id, name)}
                aria-label={`${name}, ${value === null ? "no ratings" : `${formatScore(value)} out of 5`}${change === null ? "" : `, ${signed(change, 2)} points vs previous period`}. View details`}>
                <span className="dimension-name">{name}</span>
                <span className="dimension-track" aria-hidden="true">
                  <span style={{ width: `${(value ?? 0) / 5 * 100}%` }} />
                </span>
                <strong>{formatScore(value)}</strong>
                <small data-tone={change === null || change === 0 ? "neutral" : change < 0 ? "warning" : "positive"}>
                  {change === null ? "—" : signed(change, 2)}
                </small>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>
      <Card className="teaching-summary" aria-labelledby="participation-title">
        <CardHeader><div><CardTitle as="h3" id="participation-title">Response Participation</CardTitle></div></CardHeader>
        <CardContent>
          <div className="participation-summary">
            <strong data-tone={participationTone}>{formatPercent(metrics.participation)}</strong>
            <p>{integer(metrics.responses)} of {integer(metrics.invitations)} invitations answered
              <small>{metrics.coverage} of {rows.length} sections evaluated</small>
            </p>
          </div>
          <div className="teaching-focus">
            <h3>Teaching Improvement Focus</h3>
            {focus.length ? focus.map(({ id, name, value, change }) => (
              <button type="button" className="focus-row" key={id} onClick={() => onOpenDimension(id, name)}>
                <span>{name}<small>{declines.length && change !== null
                  ? `${signed(change, 2)} points vs previous period`
                  : `${formatScore(value)} / 5 · lowest in this selection`}</small></span>
                <ArrowUpRight aria-hidden="true" />
              </button>
            )) : <p className="muted">No evaluation responses in this selection.</p>}
          </div>
        </CardContent>
      </Card>
    </div>
  </section>;
}
