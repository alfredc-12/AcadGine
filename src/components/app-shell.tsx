"use client";

import Image from "next/image";
import { Moon, Sun, UserRound } from "lucide-react";
import { createContext, type ReactNode, useContext, useEffect, useMemo, useRef, useState } from "react";
import { courseByCode, periods, programs, type Period, type Section } from "@/data/academic";
import { defaultScope, getNotices, scopedRows, type Notice, type Scope } from "@/lib/analytics";
import { Sheet } from "@/components/ui/sheet";

type Theme = "light" | "dark";
type DashboardFilters = { program: Scope["program"]; course: string };
type Detail = { title: string; description?: string; content: ReactNode };

type DashboardContext = {
  scope: Scope;
  course: string;
  setProgram: (program: Scope["program"]) => void;
  setCourse: (course: string) => void;
  period: Period;
  previousPeriod?: Period;
  rows: Section[];
  previous: Section[];
  notices: Notice[];
  filterVersion: number;
  resetFilters: () => void;
  openDetail: (detail: Detail) => void;
};

const Dashboard = createContext<DashboardContext | null>(null);
const defaultFilters: DashboardFilters = { program: defaultScope.program, course: "all" };

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
  const detailTrigger = useRef<HTMLElement | null>(null);
  const main = useRef<HTMLElement>(null);

  useEffect(() => {
    const initial = document.documentElement.dataset.theme;
    setTheme(initial === "dark" ? "dark" : "light");
  }, []);

  function toggleTheme() {
    const next = theme === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    setTheme(next);
    try { localStorage.setItem("acadgine-theme", next); } catch { /* The in-memory preference still applies. */ }
  }

  const scope = useMemo<Scope>(() => ({ period: defaultScope.period, program: filters.program }), [filters.program]);
  const { course } = filters;
  const period = periods[scope.period];
  const previousPeriod = periods[scope.period - 1];
  const rows = useMemo(() => scopedRows(scope, course), [scope, course]);
  const previous = useMemo(() => scopedRows({ ...scope, period: scope.period - 1 }, course), [scope, course]);
  const notices = useMemo(() => getNotices(rows, period, previous), [rows, period, previous]);
  const programLabel = programs.find(({ id }) => id === scope.program)?.name ?? "All programs";

  function setProgram(program: Scope["program"]) {
    setFilters((prior) => ({
      program,
      course: program === "all" || courseByCode.get(prior.course)?.program === program ? prior.course : "all",
    }));
  }

  function setCourse(course: string) {
    setFilters((prior) => ({ ...prior, course }));
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

  return <Dashboard.Provider value={{ scope, course, setProgram, setCourse, period, previousPeriod, rows, previous, notices,
    filterVersion, resetFilters, openDetail }}>
    <a className="skip-link" href="#main-content">Skip to content</a>
    <header className="topbar">
      <div className="topbar-inner">
        <div className="brand">
          <AcadgineMark />
          <span className="brand-copy"><strong>Acadgine</strong><small>Academic Analytics &amp; Intelligent Decision Support</small></span>
        </div>
        <div className="header-actions">
          <ThemeSwitch theme={theme} onToggle={toggleTheme} />
          <span className="chair-indicator"><UserRound aria-hidden="true" /><span>Program Chair</span></span>
        </div>
      </div>
    </header>

    <main ref={main} className="canvas" id="main-content" tabIndex={-1}>
      <div className="print-masthead">
        <span className="print-brand"><AcadgineMark /><strong>Acadgine</strong></span>
        <span>{period.label} · {programLabel}{course !== "all" && ` · ${course}`} · Illustrative data</span>
      </div>
      {children}
    </main>

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
