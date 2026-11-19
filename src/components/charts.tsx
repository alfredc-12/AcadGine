"use client";

import { ArrowUpRight, ChevronRight, Info, Minus, Plus } from "lucide-react";
import { type ReactNode, useEffect, useId, useMemo, useRef, useState } from "react";
import {
  CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Scatter, ScatterChart,
  Tooltip, XAxis, YAxis, type ScatterShapeProps,
} from "recharts";
import { useReportingFilter } from "@/components/app-shell";
import { courseByCode, dimensions, facultyById, periods, type Dimension, type Period, type Section } from "@/data/academic";
import { averageSete, compare, formatPercent, formatScore, integer, previousReportingPeriod, scopedRows, sectionTitle, signed, summarize,
  reviewTones, type Scope, type SectionAssessment } from "@/lib/analytics";
import { Button, Card, CardContent, CardHeader, CardTitle, Empty } from "@/components/ui/primitives";
import { DashboardSelect } from "@/components/ui/select";

export function ChartPanel({ title, controls, children, className }: {
  title: string; controls?: ReactNode; children: ReactNode; className?: string;
}) {
  const id = useId();
  return <Card className={className} aria-labelledby={id}>
    <CardHeader>
      <CardTitle as="h3" id={id}>{title}</CardTitle>
      {controls && <div className="chart-controls">{controls}</div>}
    </CardHeader>
    <CardContent>{children}</CardContent>
  </Card>;
}

const ratingTicks = [1, 2, 3, 4, 5];
const ratingZoomSteps = [0.5, 0.25, 0.1, 0.05];
const axis = { fill: "var(--muted)", fontSize: 11, fontFamily: "inherit" };

function trendScales(ratings: number[]) {
  const scales = [{ ticks: ratingTicks, decimals: 0 }];
  if (ratings.length === 0) return scales;

  const lowest = Math.min(...ratings);
  const highest = Math.max(...ratings);
  const center = (lowest + highest) / 2;

  for (const step of ratingZoomSteps) {
    const span = step * (ratingTicks.length - 1);
    const lowerTick = Math.max(1, Math.min(5 - span, Math.round((center - span / 2) / step) * step));
    const ticks = ratingTicks.map((tick) => Number((lowerTick + (tick - 1) * step).toFixed(2)));
    if (lowest < ticks[0] || highest > ticks[ticks.length - 1]) break;
    scales.push({ ticks, decimals: step === 0.5 || step === 0.1 ? 1 : 2 });
  }
  return scales;
}

function useChartMotion() {
  const [animate, setAnimate] = useState(false);
  useEffect(() => {
    const query = matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setAnimate(!query.matches);
    sync();
    query.addEventListener("change", sync);
    return () => query.removeEventListener("change", sync);
  }, []);
  return animate;
}

function ChartReadout({ children, controls }: { children: ReactNode; controls?: ReactNode }) {
  const [expanded, setExpanded] = useState(false);
  return <div className="chart-readout no-print">
    <div className="chart-readout-actions">
      <button type="button" className="text-control" aria-expanded={expanded} onClick={() => setExpanded((value) => !value)}>
        {expanded ? "Hide data" : "View data"} <ChevronRight aria-hidden="true" />
      </button>
      {controls}
    </div>
    {expanded && <div className="point-list">{children}</div>}
  </div>;
}

type TrendPoint = { label: string; period: Period; rows: Section[]; value: number | null; responses: number; passing: number | null; change: number | null };

export function SeteTrend({ scope, period, course, section, onOpen }: {
  scope: Scope; period: Period; course: string; section: string;
  onOpen: (period: Period, rows: Section[], dimension: Dimension | "all") => void;
}) {
  const [dimension, setDimension] = useReportingFilter<Dimension | "all">("all");
  const [zoom, setZoom] = useReportingFilter(0);
  const animate = useChartMotion();
  const plot = useRef<HTMLDivElement>(null);
  const lastWheel = useRef(-Infinity);
  const series: TrendPoint[] = useMemo(() => {
    const observations = periods.map((item) => {
      const rows = scopedRows({ ...scope, period: item.id }, course, section);
      const { responses, passing } = summarize(rows);
      return { period: item, rows, label: item.short, value: averageSete(rows, dimension), responses, passing };
    });
    const valuesByPeriod = new Map(observations.map((point) => [point.period.id, point.value]));
    return observations.map((point) => {
      const previous = previousReportingPeriod(point.period.id);
      return { ...point, change: compare(point.value, previous ? valuesByPeriod.get(previous.id) ?? null : null, 2) };
    });
  }, [scope, course, section, dimension]);
  const ratings = series.flatMap(({ value }) => value === null ? [] : [value]);
  const hasData = ratings.length > 0;
  const scales = trendScales(ratings);
  const maxZoom = scales.length - 1;
  const level = Math.min(zoom, maxZoom);
  const { ticks, decimals } = scales[level];
  const lower = ticks[0];
  const upper = ticks[ticks.length - 1];

  useEffect(() => {
    const element = plot.current;
    if (!element) return;

    function wheel(event: WheelEvent) {
      if (!event.deltaY || event.ctrlKey || Math.abs(event.deltaX) > Math.abs(event.deltaY)) return;
      const next = Math.max(0, Math.min(maxZoom, level + (event.deltaY < 0 ? 1 : -1)));
      if (next === level) return;

      event.preventDefault();
      if (event.timeStamp - lastWheel.current < 140) return;
      lastWheel.current = event.timeStamp;
      setZoom(next);
    }

    element.addEventListener("wheel", wheel, { passive: false });
    return () => element.removeEventListener("wheel", wheel);
  }, [hasData, level, maxZoom, setZoom]);

  function openPoint(index: number) {
    const entry = series[index];
    if (entry?.value != null) onOpen(entry.period, entry.rows.filter((row) => row.scores && row.responses > 0), dimension);
  }

  return <ChartPanel title="SETE Performance Across Years"
    controls={<DashboardSelect<Dimension | "all"> label="Evaluation dimension" value={dimension}
      onChange={setDimension} active={dimension !== "all"}
      options={[{ value: "all", label: "All dimensions" }, ...dimensions.map(({ id, name }) => ({ value: id, label: name }))]} />}>
    <div className="trend-meta">
      <span className="chart-unit">Rating / 5</span>
      <span className="trend-period">Selected · {period.short}</span>
    </div>
    {hasData ? <div ref={plot} className="trend-plot" aria-label="SETE ratings by semester. Scroll over the plot to zoom vertically.">
      <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 550, height: 172 }}>
        <LineChart data={series} margin={{ top: 12, right: 15, left: 0, bottom: 5 }} accessibilityLayer>
          <CartesianGrid vertical={false} stroke="var(--chart-grid)" />
          <YAxis ticks={ticks} domain={[lower, upper]} tick={axis} tickFormatter={(value: number) => value.toFixed(decimals)}
            tickLine={false} axisLine={false} width={36} allowDataOverflow />
          <XAxis dataKey="label" tick={axis} tickLine={false} axisLine={false} minTickGap={12} tickMargin={8} />
          <ReferenceLine x={period.short} stroke="var(--chart-accent)" strokeOpacity={0.65} strokeDasharray="3 4" />
          <Tooltip cursor={{ stroke: "var(--chart-grid)" }} content={({ active, payload }) => {
            const point = payload?.[0]?.payload as TrendPoint | undefined;
            if (!active || !point) return null;
            return <div className="chart-tooltip">
              <strong>{point.period.label}</strong>
              <div><span>SETE</span><b>{formatScore(point.value)} / 5</b></div>
              <div><span>Valid responses</span><b>{integer(point.responses)}</b></div>
              <div><span>Passing rate</span><b>{formatPercent(point.passing)}</b></div>
              <small>{point.change === null ? "Previous-period change N/A" : `${signed(point.change, 2)} pts vs previous period`}</small>
            </div>;
          }} />
          <Line dataKey="value" type="linear" stroke="var(--chart-accent)" strokeWidth={2.4}
            dot={({ cx, cy, index }) => {
              if (cx == null || cy == null) return null;
              const selected = series[index]?.period.id === period.id;
              return <g key={index}>
                <circle cx={cx} cy={cy} r={12} fill="transparent" className="trend-dot-hit" onClick={() => openPoint(index)} />
                <circle cx={cx} cy={cy} r={selected ? 5 : 3.5} fill={selected ? "var(--chart-accent)" : "var(--surface)"}
                  stroke="var(--chart-accent)" strokeWidth={1.6} pointerEvents="none" />
              </g>;
            }}
            activeDot={({ cx, cy, index }) => <g>
              <circle cx={cx} cy={cy} r={12} fill="transparent" className="trend-dot-hit" onClick={() => openPoint(index)} />
              <circle cx={cx} cy={cy} r={5} fill="var(--chart-accent)" stroke="var(--surface)" strokeWidth={2} pointerEvents="none" />
            </g>}
            connectNulls={false} isAnimationActive={animate} animationDuration={430} />
        </LineChart>
      </ResponsiveContainer>
    </div> : <Empty>No SETE observations for this selection.</Empty>}
    {hasData && <ChartReadout controls={
      <div className="chart-zoom" role="group" aria-label="Vertical zoom">
        <span className="sr-only" role="status">Vertical scale {lower.toFixed(decimals)} to {upper.toFixed(decimals)}</span>
        <Button variant="outline" size="icon" aria-label="Zoom out vertically" title="Zoom out vertically" disabled={level === 0}
          onClick={() => setZoom(level - 1)}><Minus aria-hidden="true" /></Button>
        <Button variant="outline" size="icon" aria-label="Zoom in vertically" title="Zoom in vertically" disabled={level === maxZoom}
          onClick={() => setZoom(level + 1)}><Plus aria-hidden="true" /></Button>
      </div>
    }>{series.map((point, index) => {
      const values = <><span>{point.label}</span><span>{formatScore(point.value)} SETE · {formatPercent(point.passing)} passing</span>
        <small>{point.responses} responses · {point.change === null ? "change N/A" : `${signed(point.change, 2)} pts vs previous`}</small></>;
      return point.value !== null ? <button type="button" className="point-row" key={point.label} onClick={() => openPoint(index)}>
        {values}<ArrowUpRight aria-hidden="true" />
      </button> : <div className="point-row" key={point.label}>{values}</div>;
    })}</ChartReadout>}
  </ChartPanel>;
}

export function SectionSeteChart({ assessments, selected, onOpen }: {
  assessments: SectionAssessment[]; selected: string; onOpen: (assessment: SectionAssessment) => void;
}) {
  const [sort, setSort] = useReportingFilter<string>("low");
  const [page, setPage] = useReportingFilter(0);
  const ordered = assessments.filter(({ rating }) => rating !== null)
    .sort((a, b) => ((a.rating ?? 0) - (b.rating ?? 0)) * (sort === "low" ? 1 : -1));
  const pageSize = 5;
  const last = Math.max(0, Math.ceil(ordered.length / pageSize) - 1);
  const current = Math.min(page, last);
  const offset = current * pageSize;
  const visible = ordered.slice(offset, offset + pageSize);

  return <ChartPanel title="SETE Effectiveness by Section" controls={
    <DashboardSelect label="Sort SETE ratings" value={sort} active={sort === "high"}
      onChange={(value) => { setSort(value); setPage(0); }}
      options={[{ value: "low", label: "Lowest first" }, { value: "high", label: "Highest first" }]} />
  }>
    {visible.length ? <div className="section-bars">
      {visible.map((item) => {
        const { row, rating, status, participation, sufficientSete } = item;
        const title = sectionTitle(row);
        const note = !sufficientSete ? "Limited SETE evidence" : status === "Insufficient Data" ? "Limited grades" : status;
        const tone = sufficientSete ? reviewTones[status] : "info";
        return <button type="button" className="section-bar-row" key={row.id} data-selected={selected === row.id}
          data-tone={tone} onClick={() => onOpen(item)}
          aria-label={`${title}, ${formatScore(rating)} out of 5, ${row.responses} responses, ${formatPercent(participation)} participation. ${note}. View details`}>
          <span className="section-bar-label">{courseByCode.get(row.course)?.name ?? row.course}<small>Section {row.section}</small></span>
          <span className="section-bar-track" aria-hidden="true"><span className="section-bar-fill" style={{ width: `${(rating ?? 0) / 5 * 100}%` }} /></span>
          <span className="section-bar-rating"><strong>{formatScore(rating)}</strong>
            {(tone === "critical" || tone === "warning" || tone === "info") && <i aria-hidden="true" title={note} />}
          </span>
          <span className="bar-tooltip chart-tooltip" aria-hidden="true">{note} · {row.responses} / {row.invitations} responses · {formatPercent(participation)}</span>
        </button>;
      })}
      <div className="section-bar-axis" aria-hidden="true"><span /><div>{[0, ...ratingTicks].map((tick) => <span key={tick}>{tick}</span>)}</div><span>/ 5</span></div>
      {last > 0 && <div className="passing-pagination no-print">
        <span aria-live="polite">{offset + 1}–{offset + visible.length} of {ordered.length}</span>
        <button type="button" className="text-control" onClick={() => setPage(current < last ? current + 1 : 0)}>
          {current === last ? "First" : "Next"} <ChevronRight aria-hidden="true" />
        </button>
      </div>}
    </div> : <Empty>No section ratings for this selection.</Empty>}
  </ChartPanel>;
}

type ScatterDatum = { x: number; y: number; assessment: SectionAssessment };

export function SetePassingScatter({ assessments, selected, onOpen }: {
  assessments: SectionAssessment[];
  selected: string;
  onOpen: (assessment: SectionAssessment) => void;
}) {
  const animate = useChartMotion();
  const points: ScatterDatum[] = assessments.flatMap((assessment) => assessment.rating === null || assessment.passing === null
    ? [] : [{ x: assessment.rating, y: assessment.passing, assessment }]);

  function renderPoint({ cx, cy, payload, isActive }: ScatterShapeProps) {
    const datum = payload as ScatterDatum | undefined;
    if (cx == null || cy == null || !datum) return null;
    const item = datum.assessment;
    const highlighted = isActive || selected === item.row.id;
    return <g className="scatter-point" data-selected={highlighted} data-limited={!item.sufficientSete}
      data-tone={reviewTones[item.status]} onClick={() => onOpen(item)}>
      <circle cx={cx} cy={cy} r={12} fill="transparent" />
      <circle className="scatter-mark" cx={cx} cy={cy} r={highlighted ? 6.5 : 4.6} pointerEvents="none" />
    </g>;
  }

  return <ChartPanel title="SETE vs. Student Passing Rate" controls={<details className="context-disclosure no-print">
    <summary aria-label="How to interpret the scatter plot"><Info aria-hidden="true" /></summary>
    <p>Each point is a section with both results available. Hollow points have limited SETE evidence. Grades and SETE measure different outcomes, and a relationship cannot establish causation.</p>
  </details>}>
    {points.length ? <>
      <span className="chart-unit">Passing rate (%)</span>
      <div className="scatter-plot" aria-label="Section scatter plot, SETE rating from 1 to 5 and passing rate from 0 to 100 percent">
        <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 780, height: 210 }}>
          <ScatterChart margin={{ top: 9, right: 16, bottom: 4, left: 0 }} accessibilityLayer>
            <CartesianGrid stroke="var(--chart-grid)" />
            <XAxis type="number" dataKey="x" domain={[1, 5]} ticks={ratingTicks} tick={axis} tickLine={false} axisLine={false} allowDataOverflow />
            <YAxis type="number" dataKey="y" domain={[0, 100]} ticks={[0, 25, 50, 75, 100]} tick={axis}
              tickLine={false} axisLine={false} width={31} allowDataOverflow />
            <Tooltip cursor={{ stroke: "var(--accent-line)", strokeDasharray: "4 4" }} content={({ active, payload }) => {
              const datum = payload?.[0]?.payload as ScatterDatum | undefined;
              if (!active || !datum) return null;
              const { row, rating, passing, participation, sufficientSete } = datum.assessment;
              return <div className="chart-tooltip scatter-tooltip">
                <strong>{sectionTitle(row)}</strong>
                <small>{facultyById.get(row.faculty)?.name ?? row.faculty}</small>
                <div><span>SETE</span><b>{formatScore(rating)} / 5</b></div>
                <div><span>Passing</span><b>{formatPercent(passing)}</b></div>
                <div><span>Evaluated students</span><b>{integer(row.responses)}</b></div>
                <div><span>Participation</span><b>{formatPercent(participation)}</b></div>
                {!sufficientSete && <small>Limited SETE evidence</small>}
              </div>;
            }} />
            <Scatter data={points} shape={renderPoint} activeShape={renderPoint} isAnimationActive={animate} animationDuration={390} />
          </ScatterChart>
        </ResponsiveContainer>
      </div>
      <span className="chart-unit scatter-unit">SETE rating / 5</span>
      <ChartReadout>{points.map(({ assessment }) => <button type="button" className="point-row" key={assessment.row.id} onClick={() => onOpen(assessment)}>
        <span>{sectionTitle(assessment.row)}</span><span>{formatScore(assessment.rating)} SETE · {formatPercent(assessment.passing)} passing</span>
        <ArrowUpRight aria-hidden="true" />
      </button>)}</ChartReadout>
    </> : <Empty>No sections have both SETE and finalized grades in this selection.</Empty>}
  </ChartPanel>;
}
