"use client";

import { BookOpen, CalendarDays, CalendarRange, GraduationCap, Layers3, RotateCcw, X } from "lucide-react";
import { useLayoutEffect, useState } from "react";
import { useDashboard } from "@/components/app-shell";
import { Button } from "@/components/ui/primitives";
import { DashboardSelect } from "@/components/ui/select";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { courseByCode, programs, type Period, type Semester } from "@/data/academic";
import { defaultPeriod, integer, reportingPeriods, sectionKey, sectionTitle, type Scope } from "@/lib/analytics";

const semesterLabels: Record<Semester, string> = { 1: "1st Semester", 2: "2nd Semester" };

function academicYearLabel(year: Period["year"]) {
  const start = Number(year.slice(0, 4));
  return `AY ${start}–${start + 1}`;
}

const academicYears = [...new Set(reportingPeriods.map(({ year }) => year))]
  .map((year) => ({ value: year, label: academicYearLabel(year) }));

function FilterChip({ name, value, onClear }: { name: string; value?: string; onClear: () => void }) {
  const [displayed, setDisplayed] = useState(value);

  useLayoutEffect(() => {
    if (value || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setDisplayed(value);
      return;
    }

    const removal = window.setTimeout(() => setDisplayed(undefined), 150);
    return () => window.clearTimeout(removal);
  }, [value]);

  const label = value || displayed;
  if (!label) return null;

  return <Button variant="ghost" size="sm" className="filter-chip" type="button" disabled={!value}
    data-exiting={!value} aria-hidden={!value} aria-label={`Clear ${name.replace("-", " ")} filter, ${label}`}
    onClick={() => {
      onClear();
      document.getElementById(`${name}-filter`)?.focus({ preventScroll: true });
    }}>
    <span>{label}</span><X data-icon="inline-end" aria-hidden="true" />
  </Button>;
}

export function OverviewFilters() {
  const { scope, period, course, section, rows, availableSubjects, availableSections,
    setPeriod, setProgram, setCourse, setSection, resetFilters } = useDashboard();
  const selectedSubject = courseByCode.get(course);
  const selectedSection = availableSections.find((row) => sectionKey(row) === section);
  const sectionChip = selectedSection ? (course === "all" ? sectionTitle(selectedSection) : `Section ${selectedSection.section}`) : undefined;
  const hasFilters = period.id !== defaultPeriod.id || scope.program !== "all" || course !== "all" || section !== "all";
  const semesters = reportingPeriods.filter(({ year }) => year === period.year)
    .map(({ semester }) => ({ value: `${semester}` as const, label: semesterLabels[semester] }));

  return <div className="overview-filters no-print" role="group" aria-label="Dashboard filters" data-tour-target="filters" tabIndex={-1}>
    <div className="filter-field">
      <label htmlFor="academic-year-filter">Academic Year</label>
      <DashboardSelect id="academic-year-filter" label="Academic Year" icon={CalendarDays}
        value={period.year} onChange={(year) => setPeriod({ year })} active={period.year !== defaultPeriod.year} options={academicYears} />
    </div>
    <div className="filter-field">
      <label htmlFor="semester-filter">Semester</label>
      <DashboardSelect<`${Semester}`> id="semester-filter" label="Semester" icon={CalendarRange}
        value={`${period.semester}`} onChange={(value) => setPeriod({ semester: value === "1" ? 1 : 2 })}
        active={period.semester !== defaultPeriod.semester} options={semesters} />
    </div>
    <div className="filter-field">
      <label htmlFor="program-filter">Program</label>
      <DashboardSelect<Scope["program"]> id="program-filter" label="Program" icon={GraduationCap}
        value={scope.program} onChange={setProgram} active={scope.program !== "all"}
        options={[{ value: "all", label: "All programs" }, ...programs.map(({ id, name }) => ({ value: id, label: name }))]} />
    </div>
    <div className="filter-field">
      <label htmlFor="subject-filter">Subject</label>
      <SearchableSelect id="subject-filter" label="Subject" icon={BookOpen} placeholder="Search subjects"
        value={course} onChange={setCourse} disabled={!availableSubjects.length}
        options={[{ value: "all", label: "All subjects" }, ...availableSubjects.map(({ code, name }) => ({
          value: code, label: name, detail: code, keywords: [code.replace(/\s/g, "")],
        }))]} />
    </div>
    <div className="filter-field">
      <label htmlFor="section-filter">Section</label>
      <SearchableSelect id="section-filter" label="Section" icon={Layers3} placeholder="Search sections"
        value={section} onChange={setSection} disabled={!availableSections.length}
        options={[{ value: "all", label: "All sections" }, ...availableSections.map((row) => ({
          value: sectionKey(row),
          label: course === "all" ? sectionTitle(row) : `Section ${row.section}`,
          detail: course === "all" ? row.course : undefined,
          keywords: [`Section ${row.section}`, row.section, row.course, row.course.replace(/\s/g, ""), courseByCode.get(row.course)?.name ?? ""],
        }))]} />
    </div>
    <div className="filter-utilities">
      <Button className="filter-reset" variant="ghost" onClick={resetFilters} data-active={hasFilters}
        aria-label="Reset filters" title="Reset filters">
        <RotateCcw data-icon="inline-start" aria-hidden="true" /><span>Reset filters</span>
      </Button>
      <span className="filter-count" role="status">{integer(rows.length)} {rows.length === 1 ? "section" : "sections"}</span>
    </div>
    <div className="filter-chips">
      <FilterChip name="academic-year" value={period.year === defaultPeriod.year ? undefined : academicYearLabel(period.year)}
        onClear={() => setPeriod({ year: defaultPeriod.year })} />
      <FilterChip name="semester" value={period.semester === defaultPeriod.semester ? undefined : semesterLabels[period.semester]}
        onClear={() => setPeriod({ semester: defaultPeriod.semester })} />
      <FilterChip name="program" value={scope.program === "all" ? undefined : scope.program} onClear={() => setProgram("all")} />
      <FilterChip name="subject" value={selectedSubject?.name} onClear={() => setCourse("all")} />
      <FilterChip name="section" value={sectionChip} onClear={() => setSection("all")} />
    </div>
  </div>;
}
