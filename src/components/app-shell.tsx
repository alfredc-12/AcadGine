"use client";

import Image from "next/image";
import { Compass, Moon, Sun, UserRound } from "lucide-react";
import { createContext, type ReactNode, useContext, useEffect, useMemo, useRef, useState } from "react";
import { courseByCode, courses, periods, programs, type Period, type Section } from "@/data/academic";
import { defaultPeriod, defaultScope, previousReportingPeriod, reportingPeriods, scopedRows, sectionKey, sectionTitle, type Scope } from "@/lib/analytics";
import { DashboardFooter } from "@/components/dashboard-footer";
import { DashboardTour } from "@/components/dashboard-tour";
import { WelcomeDialog } from "@/components/welcome-dialog";
import { Button } from "@/components/ui/primitives";
import { Sheet } from "@/components/ui/sheet";

type Theme = "light" | "dark";
type DashboardFilters = Scope & { course: string; section: string };
type PeriodSelection = Partial<Pick<Period, "year" | "semester">>;
type Detail = { title: string; description?: string; content: ReactNode };

type DashboardContext = {
  scope: Scope;
  course: string;
  section: string;
  availableSubjects: (typeof courses)[number][];
  availableSections: Section[];
  setPeriod: (selection: PeriodSelection) => void;
  setProgram: (program: Scope["program"]) => void;
  setCourse: (course: string) => void;
  setSection: (section: string) => void;
  period: Period;
  previousPeriod?: Period;
  rows: Section[];
  previous: Section[];
  filterVersion: number;
  resetFilters: () => void;
  openDetail: (detail: Detail) => void;
};

const Dashboard = createContext<DashboardContext | null>(null);
const defaultFilters: DashboardFilters = { ...defaultScope, course: "all", section: "all" };
const onboardingKey = "acadgine-onboarding";

function retainCompatibleFilters(filters: DashboardFilters): DashboardFilters {
  const records = scopedRows(filters);
  const course = records.some((row) => row.course === filters.course) ? filters.course : "all";
  const section = records.some((row) => sectionKey(row) === filters.section && (course === "all" || row.course === course))
    ? filters.section : "all";
  return { ...filters, course, section };
}

export function useDashboard() {
  const context = useContext(Dashboard);
  if (!context) throw new Error("Dashboard context is unavailable.");
  return context;
}

export function useReportingFilter<T>(initial: T) {
  const { filterVersion } = useDashboard();
  const [selection, setSelection] = useState({ filterVersion, value: initial });
  const value = selection.filterVersion === filterVersion ? selection.value : initial;
  return [value, (next: T) => setSelection({ filterVersion, value: next })] as const;
}

function AcadgineMark() {
  return <span className="brand-mark" aria-hidden="true">
    <Image src="/acadgine-logo.png" width={1254} height={1254} alt="" loading="eager" unoptimized />
  </span>;
}

function ThemeSwitch({ theme, onToggle }: { theme: Theme; onToggle: () => void }) {
  return <button className="theme-switch" type="button" role="switch" aria-checked={theme === "dark"}
    aria-label="Dark mode" title="Toggle dark mode" onClick={onToggle}>
    <span className="theme-track" aria-hidden="true">
      <span className="theme-thumb" />
      <Sun className="theme-sun" />
      <Moon className="theme-moon" />
    </span>
  </button>;
}

export function AppShell({ children }: { children: ReactNode }) {
  const [filters, setFilters] = useState(defaultFilters);
  const [filterVersion, setFilterVersion] = useState(0);
  const [theme, setTheme] = useState<Theme>("light");
  const [detail, setDetail] = useState<Detail | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [methodologyOpen, setMethodologyOpen] = useState(false);
  const [onboarding, setOnboarding] = useState<"idle" | "welcome" | "tour">("idle");
  const [onboardingOutcome, setOnboardingOutcome] = useState<"skipped" | "completed" | null>(null);
  const [tourStep, setTourStep] = useState(0);
  const [tourRun, setTourRun] = useState(0);
  const detailTrigger = useRef<HTMLElement | null>(null);
  const main = useRef<HTMLElement>(null);
  const header = useRef<HTMLElement>(null);
  const tourButton = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const initial = document.documentElement.dataset.theme;
    setTheme(initial === "dark" ? "dark" : "light");
    try {
      const preference = localStorage.getItem(onboardingKey);
      if (preference === "completed" || preference === "skipped") return;
    } catch { /* The welcome can still run without persistent storage. */ }
    setOnboarding("welcome");
  }, []);

  function toggleTheme() {
    const next = theme === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    setTheme(next);
    try { localStorage.setItem("acadgine-theme", next); } catch { /* The in-memory preference still applies. */ }
  }

  function startTour() {
    if (onboardingOutcome) return;
    setTourStep(0);
    if (onboarding !== "welcome") setTourRun((run) => run + 1);
    setOnboarding("tour");
  }

  function restoreTourFocus() {
    const trigger = tourButton.current;
    if (trigger && trigger.getBoundingClientRect().bottom > 0) trigger.focus({ preventScroll: true });
    else main.current?.focus({ preventScroll: true });
  }

  function finishOnboarding() {
    if (!onboardingOutcome) return;
    const outcome = onboardingOutcome;
    setOnboardingOutcome(null);
    setOnboarding("idle");
    try {
      if (outcome === "completed" || localStorage.getItem(onboardingKey) !== "completed") {
        localStorage.setItem(onboardingKey, outcome);
      }
    } catch { /* Dismissal still applies to this visit. */ }
    if (onboarding === "tour") {
      window.scrollTo({ top: window.scrollY, behavior: "instant" });
      window.requestAnimationFrame(restoreTourFocus);
    }
  }

  const scope = useMemo<Scope>(() => ({ period: filters.period, program: filters.program }), [filters.period, filters.program]);
  const { course, section } = filters;
  const period = periods.find(({ id }) => id === scope.period) ?? defaultPeriod;
  const previousPeriod = previousReportingPeriod(period.id);
  const programRows = useMemo(() => scopedRows(scope), [scope]);
  const availableSubjects = useMemo(() => {
    const codes = new Set(programRows.map((row) => row.course));
    return courses.filter(({ code }) => codes.has(code));
  }, [programRows]);
  const availableSections = useMemo(() => course === "all" ? programRows : programRows.filter((row) => row.course === course),
    [programRows, course]);
  const rows = useMemo(() => section === "all" ? availableSections : availableSections.filter((row) => sectionKey(row) === section),
    [availableSections, section]);
  const previous = useMemo(() => previousPeriod ? scopedRows({ ...scope, period: previousPeriod.id }, course, section) : [],
    [scope, course, section, previousPeriod]);
  const programLabel = programs.find(({ id }) => id === scope.program)?.name ?? "All programs";
  const selectionLabel = section !== "all" && rows[0] ? sectionTitle(rows[0])
    : courseByCode.get(course)?.name;

  function setPeriod(selection: PeriodSelection) {
    setFilters((prior) => {
      const current = periods.find(({ id }) => id === prior.period) ?? defaultPeriod;
      const year = selection.year ?? current.year;
      const semester = selection.semester ?? current.semester;
      const next = reportingPeriods.find((item) => item.year === year && item.semester === semester)
        ?? (selection.year ? reportingPeriods.filter((item) => item.year === year).slice(-1)[0] : undefined);
      if (!next || next.id === prior.period) return prior;

      const filters = { ...prior, period: next.id };
      const program = scopedRows(filters).length ? prior.program : "all";
      return retainCompatibleFilters({ ...filters, program });
    });
  }

  function setProgram(program: Scope["program"]) {
    setFilters((prior) => retainCompatibleFilters({ ...prior, program }));
  }

  function setCourse(course: string) {
    setFilters((prior) => {
      if (course !== "all" && !scopedRows(prior, course).length) return prior;
      return retainCompatibleFilters({ ...prior, course });
    });
  }

  function setSection(section: string) {
    setFilters((prior) => {
      if (section === "all") return { ...prior, section };

      const [match] = scopedRows(prior, prior.course, section);
      return match ? { ...prior, program: match.program, course: match.course, section } : prior;
    });
  }

  function resetFilters() {
    setFilters(defaultFilters);
    setFilterVersion((version) => version + 1);
  }

  function openDetail(value: Detail) {
    const active = document.activeElement;
    if (!detailOpen) detailTrigger.current = active instanceof HTMLElement && active !== document.body ? active : null;
    setDetail(value);
    setDetailOpen(true);
  }

  return <Dashboard.Provider value={{ scope, course, section, availableSubjects, availableSections, setPeriod, setProgram, setCourse, setSection, period, previousPeriod, rows, previous,
    filterVersion, resetFilters, openDetail }}>
    <a className="skip-link" href="#main-content">Skip to content</a>
    <header ref={header} className="topbar">
      <div className="topbar-inner">
        <div className="brand">
          <AcadgineMark />
          <span className="brand-copy"><strong>Acadgine</strong><small>Academic Analytics &amp; Intelligent Decision Support</small></span>
        </div>
        <div className="header-actions">
          <Button ref={tourButton} variant="ghost" size="icon" className="header-tour"
            aria-label="Start Dashboard Tour" title="Start Dashboard Tour" onClick={startTour}><Compass aria-hidden="true" /></Button>
          <ThemeSwitch theme={theme} onToggle={toggleTheme} />
          <span className="chair-indicator"><UserRound aria-hidden="true" /><span>Program Chair</span></span>
        </div>
      </div>
    </header>

    <main ref={main} className="canvas" id="main-content" tabIndex={-1} data-tour-active={onboarding === "tour"}>
      <div className="print-masthead">
        <span className="print-brand"><AcadgineMark /><strong>Acadgine</strong></span>
        <span>{period.label} · {programLabel}{selectionLabel && ` · ${selectionLabel}`} · Illustrative data</span>
      </div>
      {children}
    </main>
    <DashboardFooter onOpenChange={setMethodologyOpen} />
    <WelcomeDialog open={onboarding === "welcome" && !onboardingOutcome} mark={<AcadgineMark />} onStart={startTour}
      onSkip={() => setOnboardingOutcome((outcome) => outcome ?? "skipped")} restoreFocus={restoreTourFocus} />
    {onboarding !== "idle" && <DashboardTour run={tourRun} index={tourStep} onStepChange={setTourStep}
      active={onboarding === "tour"} paused={detailOpen || methodologyOpen} closing={Boolean(onboardingOutcome)}
      canvasRef={main} headerRef={header} onExited={finishOnboarding}
      onExit={() => setOnboardingOutcome((outcome) => outcome ?? "skipped")}
      onFinish={() => setOnboardingOutcome((outcome) => outcome ?? "completed")} />}

    <Sheet open={detailOpen} onOpenChange={setDetailOpen} title={detail?.title ?? "Details"}
      description={detail?.description} onRestoreFocus={() => {
        const target = detailTrigger.current?.isConnected ? detailTrigger.current : main.current;
        if (!target) return false;
        target.focus({ preventScroll: true });
        return true;
      }}>
      {detail?.content}
    </Sheet>
  </Dashboard.Provider>;
}
