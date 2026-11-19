import { courses, dimensions, periods, sections, type Dimension, type Period, type Program, type Section } from "@/data/academic";

export const targets = { passing: 88, participation: 68, onTime: 95, capacityWarning: 95, dimensionDrop: 0.15 };
export const defaultScope = { period: periods[periods.length - 1].id, program: "all" } as const;
export type Scope = { period: number; program: Program | "all" };
export type Tone = "neutral" | "positive" | "warning" | "critical" | "info";

export function scopedRows(scope: Scope, course = "all") {
  return sections.filter((row) => row.period === scope.period
    && (scope.program === "all" || row.program === scope.program)
    && (course === "all" || row.course === course));
}

export function percent(part: number, total: number) {
  return total > 0 ? part / total * 100 : null;
}

export function gradeStatus(row: Section, period: Period) {
  if (row.finalized) return row.finalized <= row.deadline ? "On time" : "Late";
  return row.deadline <= period.snapshot ? "Overdue" : "Upcoming";
}

export function averageSete(rows: Section[], dimension: Dimension | "all" = "all") {
  let sum = 0;
  let count = 0;
  for (const row of rows) {
    if (!row.scores || row.responses <= 0) continue;
    const average = dimension === "all"
      ? dimensions.reduce((total, item) => total + row.scores![item.id], 0) / dimensions.length
      : row.scores[dimension];
    sum += average * row.responses;
    count += row.responses;
  }
  return count ? sum / count : null;
}

export function summarize(rows: Section[], period: Period) {
  const counts = { passed: 0, graded: 0, enrolled: 0, seats: 0, due: 0, onTime: 0, overdue: 0,
    late: 0, upcoming: 0, finalized: 0, responses: 0, invitations: 0, coverage: 0 };
  for (const row of rows) {
    counts.passed += row.passed;
    counts.graded += row.graded;
    counts.enrolled += row.enrolled;
    counts.seats += row.seats;
    counts.responses += row.responses;
    counts.invitations += row.invitations;
    if (row.scores && row.responses > 0) counts.coverage++;
    if (row.deadline <= period.snapshot) counts.due++;
    if (row.finalized) counts.finalized++;
    const status = gradeStatus(row, period);
    if (status === "On time" && row.deadline <= period.snapshot) counts.onTime++;
    if (status === "Late") counts.late++;
    if (status === "Overdue") counts.overdue++;
    if (status === "Upcoming") counts.upcoming++;
  }
  return {
    ...counts,
    passing: percent(counts.passed, counts.graded),
    capacity: percent(counts.enrolled, counts.seats),
    submission: percent(counts.onTime, counts.due),
    sete: averageSete(rows),
    participation: percent(counts.responses, counts.invitations),
  };
}

export function groupCourses(rows: Section[], period: Period) {
  return courses.flatMap((course) => {
    const matches = rows.filter((row) => row.course === course.code);
    if (!matches.length) return [];
    return [{ ...course, rows: matches, metrics: summarize(matches, period) }];
  });
}

export function compare(value: number | null, previous: number | null, decimals: number) {
  if (value === null || previous === null) return null;
  return +(Number(value.toFixed(decimals)) - Number(previous.toFixed(decimals))).toFixed(decimals);
}

export const count = new Intl.NumberFormat("en-PH");
export const integer = (value: number) => count.format(value);
export const formatPercent = (value: number | null) => value === null ? "N/A" : `${value.toFixed(1)}%`;
export const formatScore = (value: number | null) => value === null ? "N/A" : value.toFixed(2);
export const signed = (value: number, decimals = 1) => `${value > 0 ? "+" : value < 0 ? "−" : ""}${Math.abs(value).toFixed(decimals)}`;

export type Notice = {
  id: string;
  title: string;
  message: string;
  action: string;
  tone: Exclude<Tone, "positive" | "neutral">;
  rows: Section[];
};

export function getNotices(rows: Section[], period: Period, previous: Section[]): Notice[] {
  const notices: Notice[] = [];
  const overloaded = rows.filter((row) => row.enrolled > row.seats);
  if (overloaded.length) {
    const excess = overloaded.reduce((total, row) => total + row.enrolled - row.seats, 0);
    notices.push({
      id: "capacity", tone: "critical", title: "Sections over capacity",
      message: `${overloaded.length} ${overloaded.length === 1 ? "section exceeds" : "sections exceed"} approved capacity by ${excess} ${excess === 1 ? "seat" : "seats"} in total.`,
      action: "Review section capacity", rows: overloaded,
    });
  }
  const overdue = rows.filter((row) => gradeStatus(row, period) === "Overdue");
  if (overdue.length) notices.push({
    id: "grades", tone: "warning", title: "Grades past deadline",
    message: `${overdue.length} ${overdue.length === 1 ? "section is" : "sections are"} awaiting final grades.`,
    action: "Review pending grades", rows: overdue,
  });
  const below = groupCourses(rows, period).filter(({ metrics }) => metrics.passing !== null && metrics.passing < targets.passing);
  if (below.length) notices.push({
    id: "passing", tone: "warning", title: "Courses below passing target",
    message: `${below.length} ${below.length === 1 ? "course is" : "courses are"} below the ${targets.passing}% demo target.`,
    action: "Review graded enrollments", rows: below.flatMap((course) => course.rows),
  });
  const metrics = summarize(rows, period);
  if (metrics.participation !== null && metrics.participation < targets.participation) notices.push({
    id: "participation", tone: "warning", title: "Low SETE participation",
    message: `${formatPercent(metrics.participation)} participation against a ${targets.participation}% demo target.`,
    action: "Review evaluation coverage", rows: rows.filter((row) => row.invitations > 0),
  });
  for (const dimension of dimensions) {
    const drop = compare(averageSete(rows, dimension.id), averageSete(previous, dimension.id), 2);
    if (drop === null || drop > -targets.dimensionDrop) continue;
    notices.push({
      id: dimension.id, tone: "info", title: `${dimension.name} declined`,
      message: `${signed(drop, 2)} points from the previous semester. Review alongside participation.`,
      action: "Explore teaching context", rows: rows.filter((row) => row.scores),
    });
  }
  return notices;
}
