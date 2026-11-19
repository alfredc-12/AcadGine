"use client";

import Image from "next/image";
import { Compass, Moon, Sun, UserRound } from "lucide-react";
import { createContext, type ReactNode, useContext, useEffect, useMemo, useRef, useState } from "react";
import { courseByCode, periods, programs, type Period, type Section } from "@/data/academic";
import { defaultScope, scopedRows, sectionKey, sectionTitle, type Scope } from "@/lib/analytics";
import { DashboardFooter } from "@/components/dashboard-footer";
import { DashboardTour } from "@/components/dashboard-tour";
import { WelcomeDialog } from "@/components/welcome-dialog";
import { Button } from "@/components/ui/primitives";
import { Sheet } from "@/components/ui/sheet";

type Theme = "light" | "dark";
type DashboardFilters = { program: Scope["program"]; course: string; section: string };
type Detail = { title: string; description?: string; content: ReactNode };

type DashboardContext = {
  scope: Scope;
  course: string;
  section: string;
  availableSections: Section[];
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
const defaultFilters: DashboardFilters = { program: defaultScope.program, course: "all", section: "all" };
const onboardingKey = "acadgine-onboarding";

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
    <Image src="/acadgine-logo.png" width={1536} height={1024} alt="" loading="eager" unoptimized />
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

  const scope = useMemo<Scope>(() => ({ period: defaultScope.period, program: filters.program }), [filters.program]);
  const { course, section } = filters;
  const period = periods[scope.period];
  const previousPeriod = periods[scope.period - 1];
  const availableSections = useMemo(() => scopedRows(scope, course), [scope, course]);
  const rows = useMemo(() => section === "all" ? availableSections : availableSections.filter((row) => sectionKey(row) === section),
    [availableSections, section]);
  const previous = useMemo(() => scopedRows({ ...scope, period: scope.period - 1 }, course, section), [scope, course, section]);
  const programLabel = programs.find(({ id }) => id === scope.program)?.name ?? "All programs";
  const selectionLabel = section !== "all" && rows[0] ? sectionTitle(rows[0])
    : courseByCode.get(course)?.name;

  function setProgram(program: Scope["program"]) {
    setFilters((prior) => {
      const course = program === "all" || courseByCode.get(prior.course)?.program === program ? prior.course : "all";
      const section = scopedRows({ ...defaultScope, program }, course, prior.section).length ? prior.section : "all";
      return { program, course, section };
    });
  }

  function setCourse(course: string) {
    setFilters((prior) => {
      if (course !== "all") {
        const subject = courseByCode.get(course);
        if (!subject || (prior.program !== "all" && subject.program !== prior.program)) return prior;
      }
      const section = scopedRows({ ...defaultScope, program: prior.program }, course, prior.section).length ? prior.section : "all";
      return { ...prior, course, section };
    });
  }

  function setSection(section: string) {
    setFilters((prior) => {
      if (section === "all") return { ...prior, section };

      const [match] = scopedRows({ ...defaultScope, program: prior.program }, prior.course, section);
      return match ? { program: match.program, course: match.course, section } : prior;
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

  return <Dashboard.Provider value={{ scope, course, section, availableSections, setProgram, setCourse, setSection, period, previousPeriod, rows, previous,
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
