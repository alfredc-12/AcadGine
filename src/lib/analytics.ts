import { courseByCode, dimensions, periods, sections, type Dimension, type Period, type Program, type Section } from "@/data/academic";

export const targets = {
  passing: 88,
  passingReview: 82,
  rating: 4.15,
  ratingReview: 3.95,
  sectionDrop: 0.12,
  sectionReviewDrop: 0.20,
  dimensionDrop: 0.15,
  participation: 68,
  minParticipation: 55,
  minResponses: 12,
  minGraded: 10,
};

export const defaultScope = { period: periods[periods.length - 1].id, program: "all" } as const;
export type Scope = { period: number; program: Program | "all" };
export type Tone = "neutral" | "positive" | "warning" | "critical" | "info";

export function sectionKey(row: Section) {
  return `${row.program}:${row.course}:${row.section}`;
}

export function sectionTitle(row: Section) {
  return `${courseByCode.get(row.course)?.name ?? row.course} · Section ${row.section}`;
}

export function scopedRows(scope: Scope, course = "all", section = "all") {
  return sections.filter((row) => row.period === scope.period
    && (scope.program === "all" || row.program === scope.program)
    && (course === "all" || row.course === course)
    && (section === "all" || sectionKey(row) === section));
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
    const scores = row.scores;
    const average = dimension === "all"
      ? dimensions.reduce((total, item) => total + scores[item.id], 0) / dimensions.length
      : scores[dimension];
    sum += average * row.responses;
    count += row.responses;
  }
  return count ? sum / count : null;
}

export function summarize(rows: Section[]) {
  const counts = { passed: 0, graded: 0, enrolled: 0, seats: 0, responses: 0, invitations: 0, coverage: 0 };
  for (const row of rows) {
    counts.passed += row.passed;
    counts.graded += row.graded;
    counts.enrolled += row.enrolled;
    counts.seats += row.seats;
    counts.responses += row.responses;
    counts.invitations += row.invitations;
    if (row.scores && row.responses > 0) counts.coverage++;
  }
  return {
    ...counts,
    passing: percent(counts.passed, counts.graded),
    sete: averageSete(rows),
    participation: percent(counts.responses, counts.invitations),
  };
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

export const reviewTones = {
  "Good Standing": "positive",
  Monitor: "warning",
  "Needs Review": "critical",
  "Insufficient Data": "info",
} as const satisfies Record<string, Tone>;

export type ReviewStatus = keyof typeof reviewTones;
type Concern = "passing" | "rating" | "decline";

export type SectionAssessment = {
  row: Section;
  previous?: Section;
  rating: number | null;
  previousRating: number | null;
  change: number | null;
  improved: boolean;
  passing: number | null;
  participation: number | null;
  sufficientSete: boolean;
  evaluated: boolean;
  concerns: Concern[];
  reasons: string[];
  status: ReviewStatus;
  action: string;
};

export function hasSeteEvidence(row: Section) {
  return row.scores !== null && row.responses >= targets.minResponses
    && (percent(row.responses, row.invitations) ?? 0) >= targets.minParticipation;
}

function assessSection(row: Section, previous?: Section): SectionAssessment {
  const rating = averageSete([row]);
  const passing = percent(row.passed, row.graded);
  const participation = percent(row.responses, row.invitations);
  const sufficientSete = hasSeteEvidence(row);
  const sufficientGrades = row.graded >= targets.minGraded;
  const previousRating = previous ? averageSete([previous]) : null;
  const comparable = sufficientSete && previous !== undefined && previous.faculty === row.faculty && hasSeteEvidence(previous);
  const change = comparable ? compare(rating, previousRating, 2) : null;
  const improved = comparable && rating !== null && previousRating !== null && rating - previousRating > 1e-9;
  const concerns: Concern[] = [];
  const reasons: string[] = [];
  let substantialConcern = false;

  if (!sufficientGrades) {
    reasons.push(`Only ${row.graded} finalized grades are available. Academic review uses at least ${targets.minGraded}.`);
  } else if (passing !== null && passing < targets.passing) {
    concerns.push("passing");
    substantialConcern = passing < targets.passingReview;
    reasons.push(`Passing is ${formatPercent(passing)}. Demo benchmarks are ${targets.passing}% for monitoring and ${targets.passingReview}% for review.`);
  }

  if (!sufficientSete) {
    reasons.push(`SETE coverage is ${row.responses} valid responses (${formatPercent(participation)}). Review requires ${targets.minResponses} responses and ${targets.minParticipation}% participation.`);
  } else if (rating !== null && rating < targets.rating) {
    concerns.push("rating");
    substantialConcern ||= rating < targets.ratingReview;
    reasons.push(`SETE is ${formatScore(rating)} / 5. Demo benchmarks are ${targets.rating.toFixed(2)} for monitoring and ${targets.ratingReview.toFixed(2)} for review.`);
  }

  if (change !== null && change <= -targets.sectionDrop) {
    concerns.push("decline");
    substantialConcern ||= change <= -targets.sectionReviewDrop;
    reasons.push(`SETE changed by ${signed(change, 2)} points. Demo decline thresholds are ${targets.sectionDrop.toFixed(2)} points for monitoring and ${targets.sectionReviewDrop.toFixed(2)} for review.`);
  }

  const status = substantialConcern || concerns.length > 1 ? "Needs Review"
    : concerns.length ? "Monitor" : sufficientGrades && sufficientSete ? "Good Standing" : "Insufficient Data";
  const action = concerns.includes("passing") ? "Review assessment patterns and consider academic support."
    : concerns.length ? "Review response coverage, teaching dimensions, and course context."
    : status === "Insufficient Data" ? "Check available grades and encourage evaluation participation."
    : "Continue monitoring and review alongside other teaching evidence.";

  return { row, previous, rating, previousRating, change, improved, passing, participation, sufficientSete,
    evaluated: sufficientGrades || sufficientSete, concerns, reasons, status, action };
}

export function assessSections(rows: Section[], previous: Section[]) {
  const priorBySection = new Map(previous.map((row) => [sectionKey(row), row]));
  return rows.map((row) => assessSection(row, priorBySection.get(sectionKey(row))));
}

export type SectionFinding = {
  id: string;
  title: string;
  summary: string;
  action: string;
  tone: Tone;
  sections: SectionAssessment[];
};

export function sectionFindings(assessments: SectionAssessment[]) {
  const findings: SectionFinding[] = [];
  function add(id: string, title: string, summary: string, action: string, tone: Tone, matched: SectionAssessment[]) {
    if (!matched.length) return;
    findings.push({ id, title, summary, action, tone, sections: matched });
  }

  const review = assessments.filter(({ status }) => status === "Needs Review");
  add("review", "Sections need review", `${review.length} flagged by demo criteria`, "Review supporting evidence", "critical", review);
  const lowPassing = assessments.filter(({ concerns }) => concerns.includes("passing"));
  add("passing", "Passing below benchmark", `${lowPassing.length} below the ${targets.passing}% demo benchmark`, "Explore academic support", "warning", lowPassing);
  const decline = assessments.filter(({ concerns }) => concerns.includes("decline"));
  add("decline", "SETE ratings declined", `${decline.length} with a comparable decline`, "Review teaching dimensions", "warning", decline);
  const coverage = assessments.filter(({ sufficientSete, participation }) => !sufficientSete
    || (participation !== null && participation < targets.participation));
  add("coverage", "Limited SETE participation", `${coverage.length} below the demo target or evidence floor`,
    "Check evaluation coverage", "info", coverage);
  const improved = assessments.filter((item) => item.improved);
  add("improved", "SETE ratings improved", `${improved.length} higher than the previous comparable period`,
    "Explore changes", "positive", improved);
  return findings;
}
