"use client";

import { useMemo, useState } from "react";
import {
  Activity, AlertTriangle, ArrowDownRight, ArrowRight, ArrowUpRight, ChevronRight, ClipboardCheck,
  GraduationCap, Info, ListFilter, Minus, Printer, TrendingUp, Vote,
} from "lucide-react";
import { useDashboard, useReportingFilter } from "@/components/app-shell";
import { SectionSeteChart, SetePassingScatter, SeteTrend } from "@/components/charts";
import { SeteDistribution } from "@/components/sete-distribution";
import { SectionDetails, SectionPerformanceTable } from "@/components/section-performance";
import { TeachingEffectiveness } from "@/components/teaching-effectiveness";
import { Status } from "@/components/records";
import { Alert, Button, Card, CardContent, CardHeader, CardTitle } from "@/components/ui/primitives";
import { DashboardSelect } from "@/components/ui/select";
import { OverviewFilters } from "@/components/overview-filters";
import { type Dimension, type Period, type Section } from "@/data/academic";
import {
  assessSections, averageSete, compare, formatPercent, formatScore, integer, percent, previousReportingPeriod, reviewTones, scopedRows,
  sectionFindings, sectionTitle, signed, summarize, targets,
  type SectionAssessment, type SectionFinding, type ReviewStatus, type Tone,
} from "@/lib/analytics";


function PriorityAlert({ notice, more, onOpen, onMore }: {
  notice: SectionFinding; more: number; onOpen: () => void; onMore: () => void;
}) {
  const Icon = notice.tone === "info" ? Info : AlertTriangle;
  return <Alert className="priority-notice" data-tone={notice.tone}>
    <div className="notice-icon"><Icon aria-hidden="true" /></div>
    <div className="notice-copy">
      <strong>{notice.title}</strong><p>{notice.summary}</p>
    </div>
    <div className="notice-actions no-print">
      {more > 0 && <Button variant="ghost" size="sm" onClick={onMore}
        aria-label={`Show ${more} more ${more === 1 ? "finding" : "findings"}`} title="More findings">
        +{more} <ChevronRight data-icon="inline-end" />
      </Button>}
      <Button variant="outline" size="icon" onClick={onOpen} aria-label={notice.action} title={notice.action}><ArrowRight /></Button>
    </div>
  </Alert>;
}

function Insights({ findings, onOpen }: { findings: SectionFinding[]; onOpen: (finding: SectionFinding) => void }) {
  return <Card className="insights-panel" aria-labelledby="insights-title">
    <CardHeader><CardTitle as="h3" id="insights-title">Insights &amp; Actions</CardTitle></CardHeader>
    <CardContent>
      {findings.length ? <div className="insight-list">
        {findings.map((finding) => {
          const Icon = finding.tone === "positive" ? TrendingUp : finding.tone === "info" ? Info : AlertTriangle;
          return <button type="button" className="insight-row" key={finding.id} onClick={() => onOpen(finding)}>
            <span className="insight-icon" data-tone={finding.tone}><Icon aria-hidden="true" /></span>
            <span className="insight-label"><strong>{finding.title}</strong><small>{finding.action}</small></span>
            <ArrowUpRight aria-hidden="true" />
          </button>;
        })}
      </div> : <p className="empty-state">No additional findings for this selection.</p>}
    </CardContent>
  </Card>;
}

export function Overview() {
  const { scope, course, section, rows, previous, period, previousPeriod, filterVersion, openDetail } = useDashboard();
  const [status, setStatus] = useReportingFilter<ReviewStatus | "all">("all");
  const [openedSection, setOpenedSection] = useState("");
  const assessments = useMemo(() => assessSections(rows, previous), [rows, previous]);
  const metrics = summarize(rows);
  const prior = summarize(previous);
  const evaluated = assessments.filter((item) => item.evaluated);
  const review = assessments.filter(({ status }) => status === "Needs Review");
  const comparable = assessments.filter(({ change }) => change !== null);
  const comparableRating = averageSete(comparable.map(({ row }) => row));
  const priorComparableRating = averageSete(comparable.flatMap(({ previous: record }) => record ? [record] : []));
  const improved = comparable.filter((item) => item.improved);
  const improvement = percent(improved.length, comparable.length);
  const records = status === "all" ? assessments : assessments.filter((item) => item.status === status);
  const findings = sectionFindings(assessments);
  const alerts = findings.filter((finding) => finding.tone !== "positive");
  const priority = alerts[0];
  const insights = findings.filter((finding) => finding.id !== priority?.id).slice(0, 3);
  const selected = section !== "all" ? rows[0]?.id ?? "" : openedSection;

  function showRecords(title: string, records: SectionAssessment[], summary: string, options?: { comparison?: boolean; dimension?: Dimension }) {
    openDetail({ title, description: period.label, content: <>
      <p className="detail-summary">{summary}</p>
      <SectionPerformanceTable assessments={records} {...options} />
    </> });
  }

  function showSection(item: SectionAssessment) {
    setOpenedSection(item.row.id);
    openDetail({ title: sectionTitle(item.row), description: period.label,
      content: <SectionDetails assessment={item} period={period} /> });
  }

  function showFinding(finding: SectionFinding) {
    showRecords(finding.title, finding.sections, `${finding.summary}. ${finding.action}.`,
      { comparison: finding.id === "decline" || finding.id === "improved" });
  }

  function showAlerts() {
    openDetail({ title: "Additional findings", description: period.label, content: <div className="notice-list">
      {alerts.slice(1).map((finding) => <details className="disclosure" key={finding.id}>
        <summary>{finding.title}<ChevronRight aria-hidden="true" /></summary>
        <div className="disclosure-body"><p>{finding.summary}. {finding.action}.</p>
          <SectionPerformanceTable assessments={finding.sections} comparison={finding.id === "decline"} />
        </div>
      </details>)}
    </div> });
  }

  function showTrendData(item: Period, matchingRows: Section[], dimension: Dimension | "all") {
    const previous = previousReportingPeriod(item.id);
    const previousRows = previous ? scopedRows({ ...scope, period: previous.id }, course, section) : [];
    const score = averageSete(matchingRows, dimension);
    const change = compare(score, averageSete(previousRows, dimension), 2);
    const scopeMetrics = summarize(scopedRows({ ...scope, period: item.id }, course, section));
    openDetail({ title: "Semester SETE records", description: item.label, content: <>
      <p className="detail-summary">{formatScore(score)} / 5 · {integer(scopeMetrics.responses)} valid responses · {formatPercent(scopeMetrics.passing)} passing
        {change === null ? " · Previous-period change N/A" : ` · ${signed(change, 2)} pts vs previous period`}.</p>
      <SectionPerformanceTable assessments={assessSections(matchingRows, previousRows)}
        dimension={dimension === "all" ? undefined : dimension} />
    </> });
  }

  const cards = [
    { id: "sete", title: "Overall SETE rating", icon: Activity, number: formatScore(metrics.sete), unit: metrics.sete === null ? "" : "/ 5",
      change: compare(comparableRating, priorComparableRating, 2), decimals: 2, deltaUnit: "pts", status: metrics.coverage ? "Student ratings" : "No responses",
      tone: "info", onOpen: () => showRecords("Overall SETE rating", assessments.filter(({ rating }) => rating !== null),
        `Weighted by ${integer(metrics.responses)} valid responses across ${metrics.coverage} sections. ${comparable.length
          ? `Comparable sections: ${formatScore(comparableRating)} / 5 vs ${formatScore(priorComparableRating)} / 5 in the previous period.`
          : "No sections meet the comparison criteria in both periods."}`) },
    { id: "passing", title: "Student passing rate", icon: GraduationCap, number: metrics.passing === null ? "N/A" : metrics.passing.toFixed(1), unit: metrics.passing === null ? "" : "%",
      change: compare(metrics.passing, prior.passing, 1), decimals: 1, deltaUnit: "pp",
      status: metrics.passing === null ? "No grades" : metrics.passing < targets.passing ? "Below benchmark" : "Meets benchmark",
      tone: metrics.passing === null ? "neutral" : metrics.passing < targets.passing ? "warning" : "positive",
      onOpen: () => showRecords("Student passing rate", assessments.filter(({ row }) => row.graded > 0),
        `${integer(metrics.passed)} of ${integer(metrics.graded)} finalized enrollments passed. Previous period: ${formatPercent(prior.passing)}. Demo benchmark: ${targets.passing}%.`) },
    { id: "review", title: "Sections needing review", icon: ClipboardCheck, number: String(review.length), unit: `/ ${evaluated.length}`,
      change: null, decimals: 0, deltaUnit: "", status: !evaluated.length ? "Insufficient data" : review.length ? "Needs review" : "No review flags",
      tone: !evaluated.length ? "info" : review.length ? "critical" : "positive", onOpen: () => showRecords("Sections needing review", review,
        `${review.length} of ${evaluated.length} sections evaluated. Evaluation requires enough evidence for at least one measure. Substantial or multiple concerns trigger review.`) },
    { id: "participation", title: "SETE participation rate", icon: Vote, number: metrics.participation === null ? "N/A" : metrics.participation.toFixed(1), unit: metrics.participation === null ? "" : "%",
      change: compare(metrics.participation, prior.participation, 1), decimals: 1, deltaUnit: "pp", status: metrics.participation === null ? "No invitations"
        : metrics.participation < targets.participation ? "Low participation" : "Meets benchmark",
      tone: metrics.participation === null ? "neutral" : metrics.participation < targets.participation ? "warning" : "positive",
      onOpen: () => showRecords("SETE participation rate", assessments,
        `${integer(metrics.responses)} of ${integer(metrics.invitations)} invitations returned valid responses. Previous period: ${formatPercent(prior.participation)}.`) },
    { id: "improvement", title: "Teaching improvement rate", icon: TrendingUp, number: improvement === null ? "N/A" : improvement.toFixed(1), unit: improvement === null ? "" : "%",
      change: null, decimals: 0, deltaUnit: "", status: improvement === null ? "No comparable data" : `${improved.length} improved`,
      tone: improvement === null ? "info" : improved.length ? "positive" : "neutral", onOpen: () => showRecords("Teaching improvement rate", comparable,
        previousPeriod
          ? `${improved.length} of ${comparable.length} comparable sections improved. Comparisons match subject, section and professor with ${previousPeriod.label} and require adequate participation in both periods.`
          : "Teaching improvement is N/A because there is no previous reporting period.", { comparison: true }) },
  ];

  return <div className="page-stack overview">
    <div className="page-heading">
      <h1>Program Overview</h1>
      <div className="heading-action no-print">
        <Button variant="outline" aria-label="Print overview" title="Print overview" onClick={() => window.print()}>
          <Printer data-icon="inline-start" /><span>Print overview</span>
        </Button>
      </div>
    </div>
    <OverviewFilters />
    {priority && <PriorityAlert notice={priority} more={alerts.length - 1} onOpen={() => showFinding(priority)} onMore={showAlerts} />}

    <section className="kpi-grid" aria-label="Key performance indicators" data-tour-target="kpis" tabIndex={-1}>
      {cards.map(({ id, title, icon: Icon, number, unit, change, decimals, deltaUnit, status, tone, onOpen }) => {
        const Trend = change === null || change === 0 ? Minus : change < 0 ? ArrowDownRight : ArrowUpRight;
        const delta = change === null ? "N/A" : `${signed(change, decimals)} ${deltaUnit}`;
        const showTrend = id !== "review" && id !== "improvement";
        const comparison = change === null ? "Previous-period change N/A" : `${delta} vs previous period${id === "sete" ? " for comparable sections" : ""}`;
        return <Button key={id} variant="ghost" className="kpi" onClick={onOpen}>
          <span className="kpi-title"><Icon aria-hidden="true" />{title}</span>
          <span className="kpi-value" key={number}>{number}{unit && <small>{unit}</small>}</span>
          <span className="kpi-meta">
            {showTrend && <span className="kpi-change" title={comparison}
              data-tone={change === null || change === 0 ? "neutral" : change < 0 ? "warning" : "positive"}>
              {change !== null && <Trend aria-hidden="true" />}<span aria-hidden="true">{delta}</span><span className="sr-only">{comparison}</span>
            </span>}
            <Status tone={tone as Tone}>{status}</Status>
          </span>
        </Button>;
      })}
    </section>

    <section className="dashboard-section performance-section" aria-labelledby="performance-title" data-tour-target="analytics" tabIndex={-1}>
      <header className="section-heading"><h2 id="performance-title">SETE &amp; Academic Analytics</h2></header>
      <div className="dashboard-grid chart-grid">
        <div className="span-seven"><SeteTrend scope={scope} period={period} course={course} section={section} onOpen={showTrendData} /></div>
        <div className="span-five"><SectionSeteChart assessments={assessments} selected={selected} onOpen={showSection} /></div>
        <div className="span-full"><SetePassingScatter assessments={assessments} selected={selected} onOpen={showSection} /></div>
      </div>
    </section>

    <section className="dashboard-section section-reveal no-print" aria-labelledby="records-title" data-tour-target="sections" tabIndex={-1}>
      <header className="section-heading"><h2 id="records-title">Section Performance</h2></header>
      <Card className="section-records"><CardContent>
        <SectionPerformanceTable key={filterVersion} assessments={records} onOpen={showSection}
          exportName={`acadgine-sections-${period.year.replace("–", "-")}-s${period.semester}-${scope.program.toLowerCase()}`}
          statusFilter={<DashboardSelect<ReviewStatus | "all"> label="Review status" icon={ListFilter} value={status} onChange={setStatus} active={status !== "all"}
            options={[{ value: "all", label: "All statuses" },
              ...(Object.keys(reviewTones) as ReviewStatus[]).map((value) => ({ value, label: value }))]} />} />
      </CardContent></Card>
    </section>

    <TeachingEffectiveness rows={rows} assessments={assessments} metrics={metrics} onOpenDimension={(dimension, name, summary) =>
      showRecords(name, assessments.filter(({ row }) => row.scores && row.responses > 0), summary, { dimension })} />

    <section className="dashboard-section section-reveal no-print" aria-labelledby="sete-insights-title" data-tour-target="insights" tabIndex={-1}>
      <header className="section-heading"><h2 id="sete-insights-title">SETE Insights &amp; Actions</h2></header>
      <div className="decision-grid">
        <Insights findings={insights} onOpen={showFinding} />
        <SeteDistribution assessments={assessments} onOpen={showRecords} />
      </div>
    </section>

  </div>;
}
