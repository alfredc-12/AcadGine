"use client";

import { BookOpen, GraduationCap, Layers3, RotateCcw, X } from "lucide-react";
import { useLayoutEffect, useState } from "react";
import { useDashboard } from "@/components/app-shell";
import { Button } from "@/components/ui/primitives";
import { DashboardSelect } from "@/components/ui/select";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { courseByCode, courses, programs } from "@/data/academic";
import { integer, sectionKey, sectionTitle, type Scope } from "@/lib/analytics";

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
    data-exiting={!value} aria-hidden={!value} aria-label={`Clear ${name} filter, ${label}`}
    onClick={() => {
      onClear();
      document.getElementById(`${name}-filter`)?.focus({ preventScroll: true });
    }}>
    <span>{label}</span><X data-icon="inline-end" aria-hidden="true" />
  </Button>;
}

export function OverviewFilters() {
  const { scope, course, section, rows, availableSections, setProgram, setCourse, setSection, resetFilters } = useDashboard();
  const subjects = courses.filter(({ program }) => scope.program === "all" || program === scope.program);
  const selectedSubject = courseByCode.get(course);
  const selectedSection = availableSections.find((row) => sectionKey(row) === section);
  const sectionChip = selectedSection ? (course === "all" ? sectionTitle(selectedSection) : `Section ${selectedSection.section}`) : undefined;
  const hasFilters = scope.program !== "all" || course !== "all" || section !== "all";

  return <div className="overview-filters no-print" role="group" aria-label="Dashboard filters" data-tour-target="filters" tabIndex={-1}>
    <div className="filter-field">
      <label htmlFor="program-filter">Program</label>
      <DashboardSelect<Scope["program"]> id="program-filter" label="Program" icon={GraduationCap}
        value={scope.program} onChange={setProgram} active={scope.program !== "all"}
        options={[{ value: "all", label: "All programs" }, ...programs.map(({ id, name }) => ({ value: id, label: name }))]} />
    </div>
    <div className="filter-field">
      <label htmlFor="subject-filter">Subject</label>
      <SearchableSelect id="subject-filter" label="Subject" icon={BookOpen} placeholder="Search subjects"
        value={course} onChange={setCourse} disabled={!subjects.length}
        options={[{ value: "all", label: "All subjects" }, ...subjects.map(({ code, name }) => ({
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
    <Button className="filter-reset" variant="ghost" onClick={resetFilters} data-active={hasFilters}>
      <RotateCcw data-icon="inline-start" aria-hidden="true" /> Reset filters
    </Button>
    <div className="filter-summary">
      <div className="filter-chips">
        <FilterChip name="program" value={scope.program === "all" ? undefined : scope.program} onClear={() => setProgram("all")} />
        <FilterChip name="subject" value={selectedSubject?.name} onClear={() => setCourse("all")} />
        <FilterChip name="section" value={sectionChip} onClear={() => setSection("all")} />
      </div>
      <span className="filter-count" role="status">{integer(rows.length)} {rows.length === 1 ? "section" : "sections"}</span>
    </div>
  </div>;
}
