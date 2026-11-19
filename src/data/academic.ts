export const programs = [
  { id: "BSIT", name: "BS Information Technology" },
  { id: "BSCS", name: "BS Computer Science" },
] as const;

export const dimensions = [
  { id: "clarity", name: "Instructional clarity" },
  { id: "engagement", name: "Student engagement" },
  { id: "assessment", name: "Assessment practices" },
  { id: "management", name: "Classroom management" },
] as const;

export type Program = (typeof programs)[number]["id"];
export type Dimension = (typeof dimensions)[number]["id"];

export const faculty = [
  { id: "F-101", name: "Mara Villanueva", program: "BSIT" },
  { id: "F-102", name: "Rafael Dimalanta", program: "BSIT" },
  { id: "F-103", name: "Liana Manalo", program: "BSIT" },
  { id: "F-201", name: "Paolo Ilagan", program: "BSCS" },
  { id: "F-202", name: "Nina Marasigan", program: "BSCS" },
  { id: "F-203", name: "Ciro Dimaculangan", program: "BSCS" },
] as const;

export const courses = [
  { code: "IT 211", name: "Data Structures", program: "BSIT", instructors: ["F-101", "F-102"], fill: 38 },
  { code: "IT 222", name: "Database Systems", program: "BSIT", instructors: ["F-103", "F-101"], fill: 36 },
  { code: "IT 314", name: "Network Administration", program: "BSIT", instructors: ["F-102", "F-103"], fill: 39 },
  { code: "IT 325", name: "Web Development", program: "BSIT", instructors: ["F-103", "F-102"], fill: 35 },
  { code: "IT 326", name: "Systems Integration", program: "BSIT", instructors: ["F-101", "F-103"], fill: 33 },
  { code: "CS 212", name: "Discrete Structures", program: "BSCS", instructors: ["F-201", "F-202"], fill: 35 },
  { code: "CS 223", name: "Algorithm Design", program: "BSCS", instructors: ["F-203", "F-201"], fill: 37 },
  { code: "CS 311", name: "Operating Systems", program: "BSCS", instructors: ["F-202", "F-203"], fill: 35 },
  { code: "CS 322", name: "Software Engineering", program: "BSCS", instructors: ["F-202", "F-201"], fill: 34 },
  { code: "CS 324", name: "Human–Computer Interaction", program: "BSCS", instructors: ["F-203", "F-202"], fill: 32 },
] as const satisfies readonly {
  code: string;
  name: string;
  program: Program;
  instructors: readonly [string, string];
  fill: number;
}[];

export const years = ["2023–24", "2024–25", "2025–26"] as const;
export type Semester = 1 | 2;

export const periods = years.flatMap((year, yearIndex) =>
  ([1, 2] as const).map((semester) => {
    const calendarYear = 2023 + yearIndex + (semester === 2 ? 1 : 0);
    return {
      id: yearIndex * 2 + semester - 1,
      year,
      semester,
      label: `AY ${year} · Semester ${semester}`,
      short: `${year} S${semester}`,
      snapshot: `${calendarYear}-${semester === 1 ? "12-23" : "06-08"}`,
    };
  }),
);
export type Period = (typeof periods)[number];
export const latest = periods[periods.length - 1];

export interface Section {
  id: string;
  period: number;
  program: Program;
  course: string;
  section: string;
  faculty: string;
  seats: number;
  enrolled: number;
  graded: number;
  passed: number;
  deadline: string;
  finalized: string | null;
  invitations: number;
  responses: number;
  scores: Record<Dimension, number> | null;
}

type History<T> = readonly [T, T, T, T, T, T];
type SectionProfile = {
  ratings: History<number | null>;
  passing: History<number>;
  participation: History<number | null>;
};

// Each profile follows one fictional section assignment across the six reporting periods.
// A null participation value indicates that the evaluation was not offered.
const sectionProfiles: Record<(typeof courses)[number]["code"], readonly [SectionProfile, SectionProfile]> = {
  "IT 211": [
    { ratings: [4.34, 4.42, 4.55, 4.39, 4.54, 4.62], passing: [71, 68, 75, 74, 68, 62], participation: [75, 79, 82, 76, 83, 88] },
    { ratings: [3.91, 3.84, 3.71, 3.65, 3.81, 3.76], passing: [77, 78, 74, 85, 83, 80], participation: [65, 62, 72, 71, 63, 69] },
  ],
  "IT 222": [
    { ratings: [4.26, 4.16, 4.22, 4.31, 4.23, 4.23], passing: [89, 91, 88, 92, 94, 93], participation: [73, 78, 77, 84, 81, 79] },
    { ratings: [3.73, 3.68, 3.56, 3.59, 3.61, 3.32], passing: [85, 87, 90, 88, 92, 88], participation: [68, 71, 66, 75, 72, 76] },
  ],
  "IT 314": [
    { ratings: [3.61, null, 3.53, 3.47, 3.24, 3.18], passing: [70, 74, 81, 78, 80, 77], participation: [61, null, 42, 57, 51, 23] },
    { ratings: [3.23, 3.14, 2.91, 3.03, 2.96, 2.78], passing: [71, 79, 82, 83, 84, 86], participation: [67, 64, 58, 63, 65, 67] },
  ],
  "IT 325": [
    { ratings: [4.50, 4.67, 4.58, 4.74, 4.76, 4.79], passing: [91, 96, 92, 96, 97, 98], participation: [82, 90, 85, 89, 90, 93] },
    { ratings: [4.58, 4.36, 4.40, 4.51, 4.37, 4.41], passing: [94, 88, 91, 89, 86, 84], participation: [72, 80, 77, 84, 79, 82] },
  ],
  "IT 326": [
    { ratings: [3.64, 3.75, 3.92, 3.54, 3.77, 3.94], passing: [81, 85, 88, 86, 92, 91], participation: [55, 63, 67, 59, 63, 65] },
    { ratings: [3.89, 3.95, 4.01, 3.85, 3.77, null], passing: [86, 85, 92, 90, 88, 85], participation: [58, 70, 74, 68, 54, 0] },
  ],
  "CS 212": [
    { ratings: [4.23, 4.27, 4.00, 4.40, 4.50, 4.53], passing: [65, 62, 70, 67, 72, 72], participation: [68, 59, 70, 73, 74, 72] },
    { ratings: [3.62, 3.45, null, 3.30, 3.28, 3.08], passing: [68, 66, 61, 64, 61, 58], participation: [60, 56, null, 59, 68, 62] },
  ],
  "CS 223": [
    { ratings: [3.39, 3.58, 3.57, 3.42, 3.70, 3.87], passing: [70, 73, 67, 72, 80, 75], participation: [57, 63, 68, 61, 74, 81] },
    { ratings: [4.04, 3.86, 4.10, 4.02, 4.18, 4.16], passing: [77, 79, 83, 90, 85, 89], participation: [73, 68, 72, 65, 64, 46] },
  ],
  "CS 311": [
    { ratings: [3.28, 3.52, 3.71, 3.48, 3.56, 3.56], passing: [78, 76, 82, 85, 81, 82], participation: [66, 61, 72, 62, 63, 59] },
    { ratings: [4.03, 4.17, 4.30, 4.19, 4.11, 4.20], passing: [79, 86, 92, 86, 88, 84], participation: [64, 72, 79, 73, 69, 74] },
  ],
  "CS 322": [
    { ratings: [4.41, 4.51, 4.54, 4.39, 4.59, 4.68], passing: [86, 92, 94, 96, 94, 96], participation: [74, 80, 82, 77, 84, 90] },
    { ratings: [4.10, 4.22, 4.15, 4.12, 4.30, 4.28], passing: [83, 87, 89, 94, 89, 90], participation: [71, 76, 72, 82, 78, 83] },
  ],
  "CS 324": [
    { ratings: [4.28, 4.46, 4.52, 4.61, 4.55, 4.44], passing: [94, 97, 95, 97, 100, 97], participation: [77, 84, 90, 87, 92, 91] },
    { ratings: [3.62, 3.70, 3.49, 3.74, 4.02, 3.89], passing: [91, 96, 96, 94, 97, 100], participation: [62, 66, 70, 65, 77, 79] },
  ],
};

const enrollmentChanges = [-7, -5, -4, -2, 0, 2];
const dimensionProfiles = [
  { clarity: 0.13, engagement: -0.14, assessment: -0.06, management: 0.07 },
  { clarity: -0.08, engagement: 0.14, assessment: -0.13, management: 0.07 },
  { clarity: 0.05, engagement: -0.08, assessment: 0.13, management: -0.10 },
  { clarity: 0.21, engagement: -0.17, assessment: 0.03, management: -0.07 },
] as const;

function evaluationScores(rating: number, profile: (typeof dimensionProfiles)[number], engagementShift: number): Record<Dimension, number> {
  const score = (offset: number) => +Math.min(5, Math.max(1, rating + offset)).toFixed(2);
  return {
    clarity: score(profile.clarity - engagementShift / 2),
    engagement: score(profile.engagement + engagementShift),
    assessment: score(profile.assessment),
    management: score(profile.management - engagementShift / 2),
  };
}

export const sections: Section[] = periods.flatMap((period) =>
  courses.flatMap((course, courseIndex) =>
    sectionProfiles[course.code].map((profile, group): Section => {
      const pressure = period.id === latest.id && course.code === "IT 314";
      const seats = course.program === "BSCS" && courseIndex > 7 ? 38 : 40;
      const enrolled = course.fill + enrollmentChanges[period.id] - group * 2 + (pressure ? 3 : 0);
      const participation = profile.participation[period.id];
      const invitations = participation === null ? 0 : enrolled;
      const responses = Math.round(invitations * (participation ?? 0) / 100);
      const rating = profile.ratings[period.id];
      const dimensionProfile = dimensionProfiles[(courseIndex + group) % dimensionProfiles.length];
      const engagementShift = period.id === latest.id && courseIndex % 3 !== 0 ? -0.22 : 0;
      const date = period.snapshot.slice(0, 7);
      const deadlineDay = period.semester === 1 ? 17 : 5;
      const late = (courseIndex + 2 * group + period.id) % 7 === 0;
      const overdue = period.id === latest.id && ((courseIndex === 2 && group === 0) || (courseIndex === 7 && group === 1));
      const upcoming = period.id === latest.id && courseIndex === 4 && group === 1;
      const graded = overdue || upcoming ? 0 : enrolled - ((courseIndex + group) % 3);
      const section = group === 0 ? "A" : "B";

      return {
        id: `${period.id}:${course.code}:${section}`,
        period: period.id,
        program: course.program,
        course: course.code,
        section,
        faculty: course.instructors[group],
        seats,
        enrolled,
        graded,
        passed: Math.round(graded * profile.passing[period.id] / 100),
        deadline: `${date}-${String(deadlineDay + (upcoming ? 6 : 0)).padStart(2, "0")}`,
        finalized: overdue || upcoming ? null : `${date}-${String(deadlineDay + (late ? 2 : -1)).padStart(2, "0")}`,
        invitations,
        responses,
        scores: rating !== null && responses > 0 ? evaluationScores(rating, dimensionProfile, engagementShift) : null,
      };
    }),
  ),
);

export const courseByCode = new Map<string, (typeof courses)[number]>(courses.map((course) => [course.code, course]));
export const facultyById = new Map<string, (typeof faculty)[number]>(faculty.map((person) => [person.id, person]));
