"use client";

import * as Popover from "@radix-ui/react-popover";
import { BookOpen, CalendarDays, CalendarRange, GraduationCap, Layers3, RotateCcw, X } from "lucide-react";
import { useId, useRef } from "react";
import { useDashboard } from "@/components/app-shell";
import { Badge, Button } from "@/components/ui/primitives";
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

type AppliedFilter = { label: string; value: string; clear: () => void };

function ActiveFilters({ filters }: { filters: AppliedFilter[] }) {
  const titleId = useId();
  const heading = useRef<HTMLHeadingElement>(null);
  const count = filters.length;

  return <Popover.Root>
    <Popover.Trigger asChild>
      <Button variant="outline" className="filter-active-trigger" data-active={count > 0}
        aria-label={`Active Filters, ${count} active`}>
        <span>Active Filters</span><Badge className="filter-active-count" aria-hidden="true">{count}</Badge>
      </Button>
    </Popover.Trigger>
    <Popover.Portal>
      <Popover.Content className="select-content active-filters-popover" align="end" sideOffset={6} collisionPadding={12}
        aria-labelledby={titleId} onOpenAutoFocus={(event) => {
          if (!heading.current) return;
          event.preventDefault();
          heading.current.focus({ preventScroll: true });
        }}>
        <h2 id={titleId} ref={heading} tabIndex={-1}>Active Filters</h2>
        {count ? <ul className="active-filter-list">
          {filters.map(({ label, value, clear }) => <li className="active-filter-row" key={label}>
            <span className="active-filter-label">{label}</span>
            <strong>{value}</strong>
            <Button variant="ghost" size="icon" aria-label={`Clear ${label} filter, ${value}`}
              onClick={() => {
                heading.current?.focus({ preventScroll: true });
                clear();
              }}>
              <X aria-hidden="true" />
            </Button>
          </li>)}
        </ul> : <p className="active-filters-empty" role="status">No active filters</p>}
      </Popover.Content>
    </Popover.Portal>
  </Popover.Root>;
}

export function OverviewFilters() {
  const { scope, period, course, section, rows, availableSubjects, availableSections,
    setPeriod, setProgram, setCourse, setSection, resetFilters } = useDashboard();
  const selectedSubject = courseByCode.get(course);
  const selectedSection = availableSections.find((row) => sectionKey(row) === section);
  const sectionLabel = selectedSection ? (course === "all" ? sectionTitle(selectedSection) : `Section ${selectedSection.section}`) : section;
  const activeFilters = [
    { label: "Academic Year", value: period.year !== defaultPeriod.year ? academicYearLabel(period.year) : undefined,
      clear: () => setPeriod({ year: defaultPeriod.year }) },
    { label: "Semester", value: period.semester !== defaultPeriod.semester ? semesterLabels[period.semester] : undefined,
      clear: () => setPeriod({ semester: defaultPeriod.semester }) },
    { label: "Program", value: scope.program !== "all" ? scope.program : undefined, clear: () => setProgram("all") },
    { label: "Subject", value: course !== "all" ? selectedSubject?.name ?? course : undefined, clear: () => setCourse("all") },
    { label: "Section", value: section !== "all" ? sectionLabel : undefined, clear: () => setSection("all") },
  ].filter((filter): filter is AppliedFilter => filter.value !== undefined);
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
      <ActiveFilters filters={activeFilters} />
      <Button className="filter-reset" variant="ghost" onClick={resetFilters} data-active={activeFilters.length > 0}
        aria-label="Reset filters" title="Reset filters">
        <RotateCcw data-icon="inline-start" aria-hidden="true" /><span>Reset filters</span>
      </Button>
      <span className="filter-count" role="status">{integer(rows.length)} {rows.length === 1 ? "section" : "sections"}</span>
    </div>
  </div>;
}
