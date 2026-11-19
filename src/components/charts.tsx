"use client";

import { ArrowUpRight, ChevronRight } from "lucide-react";
import { type ReactNode, useEffect, useId, useState } from "react";
import {
  CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { useReportingFilter } from "@/components/app-shell";
import { dimensions, periods, programs, type Dimension, type Period, type Section } from "@/data/academic";
import { averageSete, formatPercent, formatScore, groupCourses, integer, scopedRows, summarize, targets, type Scope } from "@/lib/analytics";
import { Card, CardContent, CardHeader, CardTitle, Empty } from "@/components/ui/primitives";
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

export type PlotPoint = {
  label: string;
  current: number | null;
  comparison?: number | null;
  context?: string;
};
type Series = {
  key: "current" | "comparison";
  label: string;
  color: string;
  dashed?: boolean;
};

const wholeNumber = (value: number) => integer(value);

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

export function TrendPlot({ points, series, ticks, format = wholeNumber, tickFormat = format, selected, transition, onSelect, label }: {
  points: PlotPoint[];
  series: Series[];
  ticks: number[];
  format?: (value: number) => string;
  tickFormat?: (value: number) => string;
  selected?: string;
  transition?: string;
  onSelect?: (index: number) => void;
  label: string;
}) {
  const animate = useChartMotion();
  const [reading, setReading] = useState(false);
  const hasData = points.some((point) => point.current !== null || point.comparison != null);
  const axis = { fill: "var(--muted)", fontSize: 11, fontFamily: "inherit" };

  return <div className="trend-figure">
    {series.length > 1 && <div className="chart-legend">
      {series.map((item) => <span key={item.key}><i style={{ borderColor: item.color, borderTopStyle: item.dashed ? "dashed" : "solid" }} />{item.label}</span>)}
    </div>}
    {hasData ? <div className="trend-plot" aria-label={label}>
      <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 480, height: 168 }}>
        <LineChart data={points} margin={{ top: 12, right: 17, left: 0, bottom: 5 }} accessibilityLayer>
          <CartesianGrid vertical={false} stroke="var(--chart-grid)" />
          <YAxis ticks={ticks} domain={[ticks[0], ticks[ticks.length - 1]]} tick={axis} tickLine={false} axisLine={false}
            width={37} tickFormatter={tickFormat} allowDataOverflow />
          <XAxis dataKey="label" tick={axis} tickLine={false} axisLine={false} minTickGap={12} tickMargin={9} />
          {selected && <ReferenceLine x={selected} stroke="var(--accent-line)" strokeDasharray="3 4" />}
          {transition && <ReferenceLine x={transition} stroke="var(--muted)" strokeDasharray="4 4" />}
          <Tooltip
            cursor={{ stroke: "var(--chart-grid)" }}
            content={({ active, payload }) => {
              const point = payload?.[0]?.payload as PlotPoint | undefined;
              if (!active || !point) return null;
              return <div className="chart-tooltip">
                <strong>{point.label}</strong>
                {series.map(({ key, label: name }) => point[key] == null ? null : <div key={key}>
                  <span>{name}</span><b>{format(point[key])}</b>
                </div>)}
                {point.context && <small>{point.context}</small>}
              </div>;
            }}
          />
          {series.map((item) => <Line key={item.key} type="linear" dataKey={item.key} name={item.label}
            stroke={item.color} strokeWidth={2.4} strokeDasharray={item.dashed ? "6 5" : undefined}
            dot={({ cx, cy, index }) => cx == null || cy == null ? null : <g key={index}>
              {onSelect && <circle cx={cx} cy={cy} r={10} fill="transparent" className="trend-dot-hit" onClick={() => onSelect(index)} />}
              <circle cx={cx} cy={cy} r={onSelect ? 3 : 2} fill="var(--surface)" stroke={item.color} strokeWidth={1.5} pointerEvents="none" />
            </g>}
            activeDot={({ cx, cy, index }) => onSelect
              ? <g><circle cx={cx} cy={cy} r={12} fill="transparent" className="trend-dot-hit" onClick={() => onSelect(index)} />
                <circle cx={cx} cy={cy} r={5} fill={item.color} stroke="var(--surface)" strokeWidth={2} pointerEvents="none" /></g>
              : <circle cx={cx} cy={cy} r={4} fill={item.color} stroke="var(--surface)" strokeWidth={2} />}
            isAnimationActive={animate} animationDuration={400} connectNulls={false} />)}
        </LineChart>
      </ResponsiveContainer>
    </div> : <Empty>No observations for this reporting scope.</Empty>}
    <div className="chart-readout no-print">
      <button type="button" className="text-control" aria-expanded={reading} onClick={() => setReading((value) => !value)}>
        {reading ? "Hide chart data" : "View chart data"} <ChevronRight aria-hidden="true" />
      </button>
      {reading && <div className="point-list">
        {points.map((point, index) => {
          const values = series.map(({ key, label: name }) => `${name}: ${point[key] == null ? "N/A" : format(point[key])}`).join(" · ");
          return onSelect && point.current !== null ? <button type="button" key={point.label}
            className="point-row" onClick={() => onSelect(index)}>
            <span>{point.label}</span><span>{values}</span>{point.context && <small>{point.context}</small>}<ArrowUpRight aria-hidden="true" />
          </button> : <div key={point.label} className="point-row"><span>{point.label}</span><span>{values}</span>{point.context && <small>{point.context}</small>}</div>;
        })}
      </div>}
    </div>
  </div>;
}

export function SeteTrend({ scope, period, course = "all", onOpen }: {
  scope: Scope; period: Period; course?: string; onOpen: (period: Period, rows: Section[], dimension: Dimension | "all") => void;
}) {
  const [dimension, setDimension] = useReportingFilter<Dimension | "all">("all");
  const observations = periods.map((item) => {
    const rows = scopedRows({ ...scope, period: item.id }, course);
    const summary = summarize(rows, item);
    return { item, rows, label: item.short, current: averageSete(rows, dimension),
      context: `${integer(summary.responses)} valid responses` };
  });
  const metric = dimension === "all" ? "Average SETE rating" : dimensions.find(({ id }) => id === dimension)?.name ?? "Rating";
  return <ChartPanel title="SETE performance trend"
    controls={<DashboardSelect<Dimension | "all"> label="Evaluation dimension" value={dimension}
      onChange={setDimension} active={dimension !== "all"}
      options={[{ value: "all", label: "All dimensions" }, ...dimensions.map(({ id, name }) => ({ value: id, label: name }))]} />}>
    <span className="chart-unit">Rating / 5</span>
    <TrendPlot label="SETE ratings out of 5 by semester, with a displayed range of 3 to 5" points={observations}
      series={[{ key: "current", label: metric, color: "var(--chart-accent)" }]}
      ticks={[3, 3.5, 4, 4.5, 5]} format={formatScore} tickFormat={(value) => String(value)}
      selected={period.short} onSelect={(index) => {
        const item = observations[index];
        if (item) onOpen(item.item, item.rows.filter((row) => row.scores && row.responses > 0), dimension);
      }} />
  </ChartPanel>;
}

type GroupedCourse = ReturnType<typeof groupCourses>[number];

export function CoursePassingChart({ courses, onOpen }: {
  courses: GroupedCourse[]; onOpen: (course: GroupedCourse) => void;
}) {
  const [sort, setSort] = useReportingFilter<string>("low");
  const [page, setPage] = useReportingFilter<number>(0);
  const graded = courses.filter(({ metrics }) => metrics.passing !== null);
  const ordered = [...graded].sort((a, b) => sort === "name" ? a.name.localeCompare(b.name)
    : ((a.metrics.passing ?? 0) - (b.metrics.passing ?? 0)) * (sort === "low" ? 1 : -1));
  const pageSize = 5;
  const lastPage = Math.max(0, Math.ceil(ordered.length / pageSize) - 1);
  const currentPage = Math.min(page, lastPage);
  const offset = currentPage * pageSize;
  const visible = ordered.slice(offset, offset + pageSize);
  const nextPage = currentPage < lastPage ? currentPage + 1 : 0;

  return <ChartPanel title="Course passing rates"
    controls={<DashboardSelect label="Sort course passing rates" value={sort} active={sort !== "low"}
      onChange={(value) => { setSort(value); setPage(0); }}
      options={[{ value: "low", label: "Lowest first" }, { value: "high", label: "Highest first" },
        { value: "name", label: "By course name" }]} />}>
    {visible.length ? <div className="passing-chart">
      {visible.map((item) => {
        const { metrics } = item;
        const value = metrics.passing ?? 0;
        const below = value < targets.passing;
        const detail = `${metrics.passed} passed of ${metrics.graded} graded`;
        return <button type="button" key={item.code} className="passing-row" data-below={below} onClick={() => onOpen(item)}
          aria-label={`${item.name}, ${formatPercent(value)}, ${detail}${below ? ", below demo target" : ""}. View details`}>
          <span className="passing-label">{item.name}</span>
          <span className="passing-track" aria-hidden="true">
            <span className="passing-bar" style={{ width: `${value}%` }} />
            <span className="passing-target" style={{ left: `${targets.passing}%` }} />
          </span>
          <strong>{formatPercent(value)}</strong>
          <span className="bar-tooltip chart-tooltip" aria-hidden="true">{item.code} · {detail} · {targets.passing}% demo target</span>
        </button>;
      })}
      <div className="passing-axis" aria-hidden="true"><span /><div><span>0%</span><span>50%</span><span>100%</span></div><span /></div>
      {lastPage > 0 && <div className="passing-pagination no-print">
        <span aria-live="polite">{offset + 1}–{offset + visible.length} of {graded.length}</span>
        <button type="button" className="text-control" onClick={() => setPage(nextPage)}>
          {nextPage === 0 ? "First" : "Next"} <ChevronRight aria-hidden="true" />
        </button>
      </div>}
    </div> : <Empty>No graded enrollments for this reporting scope.</Empty>}
  </ChartPanel>;
}

export function CapacityChart({ rows, period, onOpen }: {
  rows: Section[]; period: Period; onOpen: (name: string, rows: Section[]) => void;
}) {
  const groups = programs.flatMap(({ id, name }) => {
    const programRows = rows.filter((row) => row.program === id);
    return programRows.length ? [{ id, name, rows: programRows, metrics: summarize(programRows, period) }] : [];
  });
  const maximum = Math.max(4, Math.ceil(Math.max(0, ...groups.flatMap(({ metrics }) => [metrics.enrolled, metrics.seats])) / 40)) * 40;

  return <ChartPanel title="Enrollment & capacity"
    controls={<div className="chart-legend capacity-legend"><span><i className="legend-enrolled" />Enrolled</span>
      <span><i className="legend-capacity" />Approved seats</span></div>}>
    {groups.length ? <div className="capacity-chart">
      {groups.map((group) => {
        const { metrics } = group;
        const high = metrics.capacity !== null && metrics.capacity >= targets.capacityWarning;
        const over = metrics.enrolled > metrics.seats;
        const above = group.rows.filter((row) => row.enrolled > row.seats).length;
        const note = over ? "Over capacity" : above ? `${above} ${above === 1 ? "section over" : "sections over"}` : high ? "Near capacity" : null;
        return <button type="button" className="capacity-row" key={group.id} onClick={() => onOpen(group.name, group.rows)}
          aria-label={`${group.name}, ${metrics.enrolled} enrolled of ${metrics.seats} seats, ${formatPercent(metrics.capacity)}${note ? `, ${note}` : ""}. View details`}>
          <span className="capacity-identity"><strong>{group.id}</strong></span>
          <span className="capacity-scale" aria-hidden="true">
            <span className="capacity-approved" style={{ width: `${metrics.seats / maximum * 100}%` }} />
            <span className="capacity-enrolled" data-over={over} style={{ width: `${metrics.enrolled / maximum * 100}%` }} />
            <span className="capacity-marker" style={{ left: `${metrics.seats / maximum * 100}%` }} />
          </span>
          <span className="capacity-value"><strong>{integer(metrics.enrolled)} <small>/ {integer(metrics.seats)} seats</small></strong>
            <small data-tone={over || above ? "critical" : high ? "warning" : "neutral"}>{formatPercent(metrics.capacity)}{note && ` · ${note}`}</small>
          </span>
          <span className="bar-tooltip chart-tooltip" aria-hidden="true">{group.name}</span>
        </button>;
      })}
      <div className="capacity-axis" aria-hidden="true"><span /><div>{[0, 1, 2, 3, 4].map((step) =>
        <span key={step}>{integer(step * maximum / 4)}</span>)}</div><span /></div>
    </div> : <Empty>No capacity records for this reporting scope.</Empty>}
  </ChartPanel>;
}
