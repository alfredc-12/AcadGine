"use client";

import { ArrowDownRight, ArrowUpRight, Info, Minus } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Status } from "@/components/records";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/primitives";
import { useViewportMotion } from "@/components/ui/use-viewport-motion";
import { dimensions, type Dimension, type Section } from "@/data/academic";
import { averageSete, compare, formatPercent, formatScore, integer, signed, targets, type SectionAssessment, type summarize } from "@/lib/analytics";

function ParticipationDonut({ value, responses, invitations, tone }: {
  value: number | null; responses: number; invitations: number; tone: "neutral" | "warning" | "positive";
}) {
  const { ref, motion } = useViewportMotion<HTMLDivElement>();
  const [progress, setProgress] = useState(value ?? 0);
  const current = useRef(value ?? 0);
  const drawn = useRef(false);

  useEffect(() => {
    const destination = value ?? 0;
    function draw(next: number) {
      current.current = next;
      setProgress(next);
    }
    if (value === null || motion !== "visible") {
      draw(destination);
      return;
    }

    const start = drawn.current ? current.current : 0;
    drawn.current = true;
    if (start === destination) return;
    draw(start);
    let frame = 0;
    const startedAt = performance.now();
    function advance(now: number) {
      const elapsed = Math.min(1, (now - startedAt) / 760);
      const eased = 1 - (1 - elapsed) ** 3;
      draw(start + (destination - start) * eased);
      if (elapsed < 1) frame = requestAnimationFrame(advance);
    }
    frame = requestAnimationFrame(advance);
    return () => cancelAnimationFrame(frame);
  }, [motion, value]);

  return <div ref={ref} className="participation-donut" data-motion={motion} data-tone={tone}
    role="img" aria-label={value === null ? "Participation unavailable" : `${formatPercent(value)} participation, ${responses} of ${invitations} invitations answered`}>
    <svg viewBox="0 0 100 100" aria-hidden="true">
      <circle className="donut-track" cx="50" cy="50" r="41" />
      {value !== null && progress > 0 && <circle className="donut-fill" cx="50" cy="50" r="41" pathLength="100"
        strokeDasharray={`${progress} 100`} transform="rotate(-90 50 50)" />}
    </svg>
    <strong aria-hidden="true">{formatPercent(value === null ? null : progress)}</strong>
  </div>;
}

export function TeachingEffectiveness({ rows, assessments, metrics, onOpenDimension }: {
  rows: Section[];
  assessments: SectionAssessment[];
  metrics: ReturnType<typeof summarize>;
  onOpenDimension: (dimension: Dimension, name: string, summary: string) => void;
}) {
  const dimensionMotion = useViewportMotion<HTMLDivElement>();
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
          <div ref={dimensionMotion.ref} className="dimension-list motion-bars" data-motion={dimensionMotion.motion}>
            {ratings.map((rating) => {
              const { id, name, value, change } = rating;
              const needsReview = change !== null && change <= -targets.dimensionDrop;
              const trend = change === null ? "Previous-period change N/A" : `${signed(change, 2)} points vs previous comparable period`;
              const TrendIcon = change === null || change === 0 ? Minus : change < 0 ? ArrowDownRight : ArrowUpRight;
              return <button className="dimension-row" type="button" key={id} onClick={() => openRating(rating)} data-review={needsReview}
                aria-label={`${name}, ${value === null ? "no ratings" : `${formatScore(value)} out of 5`}. ${trend}.${needsReview ? " Meets demo review threshold." : ""} View details`}>
                <span className="dimension-name">{name}</span>
                <span className="dimension-track" aria-hidden="true">
                  <span className="motion-bar" style={{ width: `${(value ?? 0) / 5 * 100}%` }} />
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
            <ParticipationDonut value={participation} responses={metrics.responses} invitations={metrics.invitations} tone={participationTone} />
            <div className="participation-copy">
              <p title={`${metrics.coverage} of ${rows.length} sections evaluated`}>
                <strong>{integer(metrics.responses)} / {integer(metrics.invitations)}</strong> responses
                <small className="sr-only">{metrics.coverage} of {rows.length} sections evaluated.</small>
              </p>
              <dl className="participation-legend" data-tone={participationTone}>
                <div><dt>Participated</dt><dd>{formatPercent(participation)}</dd></div>
                <div><dt>Did not participate</dt><dd>{formatPercent(participation === null ? null : 100 - participation)}</dd></div>
              </dl>
            </div>
          </div>
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
