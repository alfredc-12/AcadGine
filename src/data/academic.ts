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
  { code: "IT 211", name: "Data Structures", program: "BSIT", instructors: ["F-101", "F-102"], pass: 87, fill: 38, rating: 4.36 },
  { code: "IT 222", name: "Database Systems", program: "BSIT", instructors: ["F-103", "F-101"], pass: 91, fill: 36, rating: 4.53 },
  { code: "IT 314", name: "Network Administration", program: "BSIT", instructors: ["F-102", "F-103"], pass: 83, fill: 39, rating: 4.25 },
  { code: "IT 325", name: "Web Development", program: "BSIT", instructors: ["F-103", "F-102"], pass: 94, fill: 35, rating: 4.64 },
  { code: "IT 326", name: "Systems Integration", program: "BSIT", instructors: ["F-101", "F-103"], pass: 89, fill: 33, rating: 4.44 },
  { code: "CS 212", name: "Discrete Structures", program: "BSCS", instructors: ["F-201", "F-202"], pass: 84, fill: 35, rating: 4.23 },
  { code: "CS 223", name: "Algorithm Design", program: "BSCS", instructors: ["F-203", "F-201"], pass: 88, fill: 37, rating: 4.40 },
  { code: "CS 311", name: "Operating Systems", program: "BSCS", instructors: ["F-202", "F-203"], pass: 90, fill: 35, rating: 4.47 },
  { code: "CS 322", name: "Software Engineering", program: "BSCS", instructors: ["F-202", "F-201"], pass: 93, fill: 34, rating: 4.60 },
  { code: "CS 324", name: "Human–Computer Interaction", program: "BSCS", instructors: ["F-203", "F-202"], pass: 95, fill: 32, rating: 4.66 },
] as const satisfies readonly {
  code: string;
  name: string;
  program: Program;
  instructors: readonly [string, string];
  pass: number;
  fill: number;
  rating: number;
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

const enrollmentChanges = [-7, -5, -4, -2, 0, 2];
const ratingChanges = [-0.28, -0.16, -0.21, -0.08, -0.04, 0.05];
const passingChanges = [-4, -1, -2, 1, 2, 0];

export const sections: Section[] = periods.flatMap((period) =>
  courses.flatMap((course, courseIndex) =>
    [0, 1].map((group): Section => {
      const pressure = period.id === latest.id && course.code === "IT 314";
      const seats = course.program === "BSCS" && courseIndex > 7 ? 38 : 40;
      const enrolled = course.fill + enrollmentChanges[period.id] - group * 2 + (pressure ? 3 : 0);
      const noEvaluation = period.id === 1 && course.program === "BSCS";
      const participation = (pressure ? 0.49 : 0.65 + ((courseIndex + group) % 4) * 0.038)
        + (period.id === latest.id ? -0.06 : 0.012 * (period.id % 3));
      const responses = noEvaluation ? 0 : Math.round(enrolled * participation);
      const score = course.rating + ratingChanges[period.id] - group * 0.06;
      const engagementShift = period.id === latest.id ? -0.31 : 0;
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
        passed: Math.round(graded * (course.pass + passingChanges[period.id] - group * 2) / 100),
        deadline: `${date}-${String(deadlineDay + (upcoming ? 6 : 0)).padStart(2, "0")}`,
        finalized: overdue || upcoming ? null : `${date}-${String(deadlineDay + (late ? 2 : -1)).padStart(2, "0")}`,
        invitations: noEvaluation ? 0 : enrolled,
        responses,
        scores: responses ? {
          clarity: +(score + 0.06).toFixed(2),
          engagement: +(score - 0.09 + engagementShift).toFixed(2),
          assessment: +(score - 0.05).toFixed(2),
          management: +(score + 0.08).toFixed(2),
        } : null,
      };
    }),
  ),
);

export const courseByCode = new Map<string, (typeof courses)[number]>(courses.map((course) => [course.code, course]));
export const facultyById = new Map<string, (typeof faculty)[number]>(faculty.map((person) => [person.id, person]));
