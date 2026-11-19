"use client";

import {
  Activity, AlertTriangle, ArrowDownRight, ArrowRight, ArrowUpRight, ChevronRight, ClipboardCheck,
  GraduationCap, Info, Printer, RotateCcw, UsersRound, Vote,
} from "lucide-react";
import { useDashboard, useReportingFilter } from "@/components/app-shell";
import { CapacityChart, CoursePassingChart, SeteTrend } from "@/components/charts";
import { EnrollmentForecast } from "@/components/forecast";
import { TeachingEffectiveness } from "@/components/teaching-effectiveness";
import { RecordsTable, SectionTable, Status, sectionColumns } from "@/components/records";
import { Alert, Button, Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/primitives";
import { DashboardSelect } from "@/components/ui/select";
import { courseByCode, courses as allCourses, facultyById, programs, type Period, type Section } from "@/data/academic";
import { compare, formatPercent, formatScore, gradeStatus, groupCourses, integer, signed, summarize, targets,
  type Notice, type Scope, type Tone } from "@/lib/analytics";

function useRecordDetails() {
  const { openDetail, period } = useDashboard();
  return {
    openRecords(title: string, rows: Section[], detailPeriod: Period = period, description = detailPeriod.label, summary?: string, metric?: string) {
      openDetail({ title, description, content: <>{summary && <p className="detail-summary">{summary}</p>}
        <SectionTable rows={rows} period={detailPeriod} metric={metric} /></> });
    },
    openSection(row: Section) {
      const title = `${courseByCode.get(row.course)?.name ?? row.course} · Section ${row.section}`;
      const grade = row.finalized ? `Finalized ${row.finalized}` : "Awaiting submission";
      openDetail({ title, description: `${row.course} · ${facultyById.get(row.faculty)?.name ?? row.faculty} · ${period.label}`,
        content: <><dl className="detail-facts">
          <div><dt>Grade deadline</dt><dd>{row.deadline}</dd></div><div><dt>Submission</dt><dd>{grade}</dd></div>
          <div><dt>Passed / graded</dt><dd>{row.passed} / {row.graded}</dd></div>
          <div><dt>Valid SETE responses / invitations</dt><dd>{row.responses} / {row.invitations}</dd></div>
        </dl><SectionTable rows={[row]} period={period} /></>,
      });
    },
    openAlerts(notices: Notice[]) {
      openDetail({
        title: "Academic alerts", description: period.label,
        content: <div className="notice-list">{notices.map((notice) => <details key={notice.id} className="disclosure">
          <summary><span>{notice.title}</span><ChevronRight aria-hidden="true" /></summary>
          <div className="disclosure-body">
            <p>{notice.message}</p>
            <SectionTable rows={notice.rows} period={period} metric={notice.id} />
          </div>
        </details>)}</div>,
      });
    },
  };
}

function NoticeBanner({ notice, more, onOpen, onOpenAll }: {
  notice: Notice; more: number; onOpen: () => void; onOpenAll: () => void;
}) {
  return <Alert className="priority-notice" data-tone={notice.tone}>
    <div className="notice-icon" aria-hidden="true">{notice.tone === "info" ? <Info /> : <AlertTriangle />}</div>
    <div className="notice-copy">
      <span className="sr-only">{notice.tone === "info" ? "Information" : notice.tone === "critical" ? "Critical alert" : "Warning"}</span>
      <strong>{notice.title}</strong><p>{notice.message}</p>
    </div>
    <div className="notice-actions no-print">
      {more > 0 && <Button variant="ghost" size="sm" onClick={onOpenAll}>
        +{more} more {more === 1 ? "alert" : "alerts"}
      </Button>}
      <Button variant="outline" size="sm" onClick={onOpen}>{notice.action} <ArrowRight data-icon="inline-end" /></Button>
    </div>
  </Alert>;
}

const insightCopy: Record<string, string> = {
  capacity: "Consider opening seats in the affected sections.",
  grades: "Follow up with the section leads.",
  passing: "Review course outcomes before planning academic support.",
  participation: "Check coverage before interpreting ratings.",
};

function Insights({ findings, onOpen }: { findings: Notice[]; onOpen: (notice: Notice) => void }) {
  return <Card className="insights-panel" aria-labelledby="insights-title">
    <CardHeader><div><CardTitle as="h3" id="insights-title">Insights &amp; Actions</CardTitle><CardDescription>Priorities from the current selection</CardDescription></div></CardHeader>
    <CardContent>
      {findings.length ? <div className="insight-list">
        {findings.map((notice) => <button type="button" className="insight-row" key={notice.id} onClick={() => onOpen(notice)}>
          <span className="insight-icon" aria-hidden="true" data-tone={notice.tone}>{notice.tone === "info" ? <Info /> : <AlertTriangle />}</span>
          <span><strong>{notice.title}</strong>
            <small>{notice.message} {notice.tone === "info" ? notice.action + "." : insightCopy[notice.id]}</small>
          </span>
          <ArrowUpRight aria-hidden="true" />
        </button>)}
      </div> : <p className="empty-state">No follow-ups flagged by the demo thresholds.</p>}
    </CardContent>
  </Card>;
}

function getFindings(notices: Notice[], rows: Section[], metrics: ReturnType<typeof summarize>) {
  const findings = notices.slice(0, 3);
  if (findings.length < 3 && metrics.responses > 0 && !notices.some(({ id }) => id === "participation")) {
    findings.push({
      id: "sete", tone: "info", title: "Teaching evaluation coverage",
      message: `${integer(metrics.responses)} valid responses across ${metrics.coverage} sections.`,
      action: "Check section coverage before comparing ratings", rows: rows.filter((row) => row.responses > 0),
    });
  }
  if (findings.length < 3 && metrics.seats > metrics.enrolled && !notices.some(({ id }) => id === "capacity")) {
    findings.push({
      id: "capacity", tone: "info", title: "Seats available",
      message: `${integer(metrics.seats - metrics.enrolled)} approved seats remain across the selected sections.`,
      action: "Review availability before opening another section", rows,
    });
  }
  return findings;
}

function OverviewFilters() {
  const { scope, course, setProgram, setCourse, resetFilters } = useDashboard();
  const coursesInScope = allCourses.filter(({ program }) => scope.program === "all" || program === scope.program);

  return <div className="overview-filters no-print" role="group" aria-label="Dashboard filters">
    <div className="filter-field">
      <label htmlFor="program-filter">Program</label>
      <DashboardSelect<Scope["program"]> id="program-filter" label="Program" value={scope.program} onChange={setProgram}
        active={scope.program !== "all"}
        options={[{ value: "all", label: "All programs" }, ...programs.map(({ id, name }) => ({ value: id, label: name }))]} />
    </div>
    <div className="filter-field">
      <label htmlFor="course-filter">Course</label>
      <DashboardSelect id="course-filter" label="Course" value={course} onChange={setCourse}
        active={course !== "all"} disabled={!coursesInScope.length}
        options={[{ value: "all", label: "All courses" }, ...coursesInScope.map(({ code, name }) => ({ value: code, label: `${code} · ${name}` }))]} />
    </div>
    <Button className="filter-reset" variant="ghost" onClick={resetFilters}>
      <RotateCcw data-icon="inline-start" /> Reset filters
    </Button>
  </div>;
}

export function Overview() {
  const { scope, course, rows, previous, period, previousPeriod, notices, filterVersion } = useDashboard();
  const { openRecords, openSection, openAlerts } = useRecordDetails();
  const [status, setStatus] = useReportingFilter<string>("all");
  const metrics = summarize(rows, period);
  const prior = previousPeriod ? summarize(previous, previousPeriod) : null;
  const courses = groupCourses(rows, period);
  const capacityFlag = rows.some((row) => row.enrolled > row.seats);
  const activeAlerts = notices[0];
  const findings = getFindings(notices, rows, metrics);
  const records = status === "all" ? rows : rows.filter((row) => gradeStatus(row, period) === status);
  const readNotice = (notice: Notice) => openRecords(notice.title, notice.rows, period, period.label, notice.message, notice.id);

  const kpis = [
    { key: "passing", name: "Course passing rate", icon: GraduationCap, value: metrics.passing, previous: prior?.passing,
      detail: `${integer(metrics.passed)} of ${integer(metrics.graded)} graded enrollments passed`, benchmark: `Demo target ${targets.passing}%`,
      status: metrics.passing === null ? "No grades" : metrics.passing >= targets.passing ? "On target" : "Below target",
      tone: metrics.passing === null ? "neutral" : metrics.passing >= targets.passing ? "positive" : "warning",
      rows: rows.filter((row) => row.graded > 0) },
    { key: "capacity", name: "Enrollment capacity utilization", icon: UsersRound, value: metrics.capacity, previous: prior?.capacity,
      detail: `${integer(metrics.enrolled)} of ${integer(metrics.seats)} approved seats`, benchmark: `Demo warning at ${targets.capacityWarning}%`,
      status: metrics.capacity === null ? "No seats" : capacityFlag ? "Section overflow" : metrics.capacity >= targets.capacityWarning ? "Near capacity" : "Within capacity",
      tone: metrics.capacity === null ? "neutral" : capacityFlag ? "critical" : metrics.capacity >= targets.capacityWarning ? "warning" : "positive",
      rows },
    { key: "submission", name: "On-time grade submission", icon: ClipboardCheck, value: metrics.submission, previous: prior?.submission,
      detail: `${metrics.finalized} finalized · ${metrics.overdue} overdue`, benchmark: `Demo target ${targets.onTime}%`,
      status: metrics.submission === null ? "No deadlines" : metrics.overdue ? "Grades overdue" : metrics.submission >= targets.onTime ? "On target" : "Below target",
      tone: metrics.submission === null ? "neutral" : metrics.overdue || metrics.submission < targets.onTime ? "warning" : "positive",
      rows: rows.filter((row) => row.deadline <= period.snapshot) },
    { key: "sete", name: "Average SETE rating", icon: Activity, value: metrics.sete, previous: prior?.sete,
      detail: `${metrics.coverage} of ${rows.length} sections evaluated`, benchmark: "5-point scale",
      status: metrics.sete === null ? "No responses" : "Evaluations available", tone: metrics.sete === null ? "neutral" : "info",
      rows: rows.filter((row) => row.scores && row.responses > 0) },
    { key: "participation", name: "SETE response rate", icon: Vote, value: metrics.participation, previous: prior?.participation,
      detail: `${integer(metrics.responses)} of ${integer(metrics.invitations)} invitations`, benchmark: `Demo target ${targets.participation}%`,
      status: metrics.participation === null ? "No invitations" : metrics.participation >= targets.participation ? "On target" : "Low participation",
      tone: metrics.participation === null ? "neutral" : metrics.participation >= targets.participation ? "positive" : "warning",
      rows: rows.filter((row) => row.invitations > 0) },
  ];

  return <div className="page-stack overview">
    <div className="page-heading">
      <div><h1>Program Overview</h1><p>Academic Performance &amp; Teaching Effectiveness</p></div>
      <div className="heading-action no-print">
        <Button variant="outline" aria-label="Print overview" title="Print overview" onClick={() => window.print()}>
          <Printer data-icon="inline-start" /><span>Print overview</span>
        </Button>
      </div>
    </div>
    <OverviewFilters />
    {activeAlerts && <NoticeBanner notice={activeAlerts} more={notices.length - 1}
      onOpen={() => readNotice(activeAlerts)} onOpenAll={() => openAlerts(notices)} />}
    {notices.length > 1 && <ul className="print-alerts" aria-label="Additional academic alerts">
      {notices.slice(1).map((notice) => <li key={notice.id} data-tone={notice.tone}><strong>{notice.title}.</strong> {notice.message}</li>)}
    </ul>}

    <section className="kpi-grid" aria-label="Key performance indicators">
      {kpis.map((kpi) => {
        const score = kpi.key === "sete";
        const decimals = score ? 2 : 1;
        const change = compare(kpi.value, kpi.previous ?? null, decimals);
        const format = score ? formatScore : formatPercent;
        const changeTone: Tone = change === null || change === 0 || kpi.key === "capacity" ? "neutral" : change > 0 ? "positive" : "warning";
        const delta = change === null ? "No prior comparison" : `${signed(change, decimals)} ${score ? "pts" : "pp"}`;
        return <Button key={kpi.key} variant="ghost" className="kpi"
          onClick={() => openRecords(kpi.name, kpi.rows, period,
            `${period.label} · ${kpi.benchmark}`, `${format(kpi.value)}${score && kpi.value !== null ? " / 5" : ""} · ${kpi.detail}. ${kpi.key === "submission" ? `Reporting date: ${period.snapshot}. ` : ""}${previousPeriod ? `Previous semester: ${format(kpi.previous ?? null)}.` : ""}`, kpi.key)}>
          <span className="kpi-title"><kpi.icon aria-hidden="true" /><strong>{kpi.name}</strong><ArrowUpRight className="kpi-arrow" aria-hidden="true" /></span>
          <span className="kpi-value">{kpi.value === null ? "N/A" : kpi.value.toFixed(decimals)}{kpi.value !== null && <small>{score ? "/ 5" : "%"}</small>}</span>
          <span className="kpi-detail">{kpi.detail}</span>
          <span className="kpi-meta">
            <span className="kpi-change" data-tone={changeTone} title={previousPeriod ? `Prior: ${format(kpi.previous ?? null)}` : undefined}>
              {change !== null && change !== 0 && (change > 0 ? <ArrowUpRight /> : <ArrowDownRight />)}
              {delta}{change !== null && <small>vs previous period</small>}
            </span>
            <Status tone={kpi.tone as Tone}>{kpi.status}</Status>
          </span>
          <span className="kpi-benchmark">{kpi.benchmark}</span>
        </Button>;
      })}
    </section>

    <section className="dashboard-section performance-section" aria-labelledby="performance-title">
      <header className="section-heading"><h2 id="performance-title">Performance Analytics</h2></header>
      <div className="dashboard-grid chart-grid">
      <div className="span-seven"><SeteTrend scope={scope} period={period} course={course}
        onOpen={(item, detailRows, dimension) => openRecords("Semester SETE records", detailRows, item, item.label,
          undefined, dimension === "all" ? "sete" : dimension)} /></div>
      <div className="span-five"><CoursePassingChart courses={courses} onOpen={(course) => openRecords(
        `${course.name} · Passing rate`, course.rows.filter((row) => row.graded > 0), period, `${course.code} · ${period.label}`,
        `${course.metrics.passed} of ${course.metrics.graded} graded enrollments passed · ${targets.passing}% demo target.`, "passing")} /></div>
      <div className="span-full"><CapacityChart rows={rows} period={period}
        onOpen={(name, detailRows) => openRecords(`${name} · Capacity`, detailRows, period, period.label, undefined, "capacity")} /></div>
      </div>
    </section>

    <TeachingEffectiveness rows={rows} previous={previous} metrics={metrics} onOpenDimension={(dimension, name) =>
      openRecords(name, rows.filter((row) => row.scores && row.responses > 0), period, period.label, undefined, dimension)} />

    <section className="dashboard-section section-reveal no-print" aria-labelledby="planning-title">
      <header className="section-heading"><h2 id="planning-title">Insights &amp; Predictive Planning</h2></header>
      <div className="decision-grid">
        <Insights findings={findings} onOpen={readNotice} />
        <EnrollmentForecast period={period} enrolled={metrics.enrolled} capacity={metrics.seats} />
      </div>
    </section>

    <section className="dashboard-section section-reveal no-print" aria-labelledby="records-title">
      <header className="section-heading"><h2 id="records-title">Course Records</h2></header>
      <Card className="section-records" aria-labelledby="course-sections-title">
      <CardHeader><div><CardTitle as="h3" id="course-sections-title">Course Sections</CardTitle>
        <CardDescription>{rows.length} sections in the current selection</CardDescription></div></CardHeader>
      <CardContent>
        <RecordsTable key={filterVersion} label="Course sections" rows={records}
          columns={sectionColumns(period).filter(({ id }) => id !== "faculty")} keyOf={(row) => row.id}
          onOpen={openSection} pageSize={6}
          exportName={`acadgine-sections-${period.year.replace("–", "-")}-s${period.semester}-${scope.program.toLowerCase()}${course === "all" ? "" : `-${course.replaceAll(" ", "-").toLowerCase()}`}`}
          tools={<DashboardSelect label="Grade submission status" value={status} onChange={setStatus} active={status !== "all"}
            options={[{ value: "all", label: "All grade statuses" },
              ...["On time", "Late", "Overdue", "Upcoming"].map((item) => ({ value: item, label: item }))]} />} />
      </CardContent>
      </Card>
    </section>

    <footer className="dashboard-method no-print">
      <details className="disclosure">
        <summary><span><Info aria-hidden="true" /> Data &amp; methodology</span><ChevronRight aria-hidden="true" /></summary>
        <div className="disclosure-body">
          <p>Acadgine uses fictional records. The overview uses the latest period in the sample dataset, {period.label}, with comparisons to the preceding period where available.</p>
          <p>Benchmarks are demonstration assumptions. SETE ratings are weighted by valid responses and should be considered alongside other teaching evidence.</p>
        </div>
      </details>
    </footer>
  </div>;
}
