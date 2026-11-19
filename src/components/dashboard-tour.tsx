"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { ArrowLeft, ArrowRight, Lightbulb, X } from "lucide-react";
import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState, type RefObject } from "react";
import { Button } from "@/components/ui/primitives";

const steps = [
  {
    target: "filters", label: "Dashboard Filters", title: "Explore Your Data",
    description: "Filter academic performance and SETE results by program, subject, or section.",
    tip: "Select a section to see its teaching evaluations and passing rate.",
  },
  {
    target: "kpis", label: "Performance Indicators", title: "Key Performance Indicators",
    description: "Monitor SETE ratings, passing rates, participation, and sections requiring review.",
    tip: "Select any KPI card to explore its supporting records.",
  },
  {
    target: "analytics", label: "SETE Analytics", title: "Teaching Effectiveness Trends",
    description: "Compare SETE results across semesters, subjects, and sections.",
    tip: "Hover over a chart mark or open its data view for details.",
  },
  {
    target: "sections", label: "Section Performance", title: "Monitor Academic Sections",
    description: "Review passing rates, teaching evaluations, and sections requiring attention.",
    tip: "Select a section to open its detailed performance summary.",
  },
  {
    target: "teaching", label: "Teaching Effectiveness", title: "Understand Teaching Feedback",
    description: "Explore evaluation dimensions and student participation.",
    tip: "Check response coverage before interpreting SETE results.",
  },
  {
    target: "insights", label: "SETE Insights & Actions", title: "Make Informed Decisions",
    description: "Identify important patterns and find opportunities for academic improvement.",
    tip: "Use these insights to decide what merits further review. Personnel decisions require broader evidence.",
  },
] as const;

type SpotlightRect = { top: number; left: number; width: number; height: number; radius: number };
type Placement = { top: number; left: number; height: number; spot: SpotlightRect | null; partial: boolean; moving: boolean };
type Viewport = { width: number; top: number; bottom: number; panelWidth: number; panelHeight: number };

const gutter = 14;
const gap = 12;
const halo = 5;
const flightMs = 460;
const textExitMs = 140;
const tourExitMs = 230;
const motionQuery = "(prefers-reduced-motion: reduce)";

function findTarget(canvas: HTMLElement, id: string) {
  return canvas.querySelector<HTMLElement>(`[data-tour-target="${id}"]`);
}

function locate(rect: Pick<DOMRect, "top" | "bottom" | "left" | "right">, viewport: Viewport): Placement {
  const { width, top, bottom, panelWidth, panelHeight } = viewport;
  const dockLeft = Math.max(gutter, width - panelWidth - gutter);
  const dockTop = Math.max(gutter, bottom - panelHeight);
  let panelLeft = width <= 640 ? (width - panelWidth) / 2 : dockLeft;
  let panelTop = dockTop;
  let spotlightBottom = dockTop - gap;

  if (width > 640) {
    const right = rect.right + halo + gap;
    const left = rect.left - halo - gap - panelWidth;
    if (right <= dockLeft || left >= gutter) {
      panelLeft = right <= dockLeft ? right : left;
      panelTop = Math.min(dockTop, Math.max(top, rect.top));
      spotlightBottom = bottom;
    } else if (rect.top >= top && rect.bottom + halo + gap <= dockTop) {
      panelTop = rect.bottom + halo + gap;
    } else if (rect.bottom + halo <= bottom && rect.top - halo - gap - panelHeight >= top) {
      panelTop = rect.top - halo - gap - panelHeight;
      spotlightBottom = bottom;
    }
  }

  const clipLeft = Math.max(4, rect.left - halo);
  const clipRight = Math.min(width - 4, rect.right + halo);
  const clipTop = Math.max(top, rect.top - halo);
  const clipBottom = Math.min(spotlightBottom, rect.bottom + halo);
  const w = clipRight - clipLeft;
  const h = clipBottom - clipTop;
  const spot = w > 0 && h > 0 ? {
    left: clipLeft, top: clipTop, width: w, height: h, radius: Math.min(w / 2, h / 2, Math.max(7, Math.min(15, h / 12))),
  } : null;
  return { left: panelLeft, top: panelTop, height: panelHeight, spot, partial: rect.bottom + halo > spotlightBottom, moving: false };
}

function collapsed(rect: SpotlightRect): SpotlightRect {
  return { left: rect.left + rect.width / 2, top: rect.top + rect.height / 2, width: 0, height: 0, radius: 0 };
}

function tween(from: Placement, to: Placement, progress: number): Placement {
  const between = (a: number, b: number) => a + (b - a) * progress;
  const start = from.spot ?? (to.spot && collapsed(to.spot));
  const end = to.spot ?? (from.spot && collapsed(from.spot));
  const spot = start && end ? {
    left: between(start.left, end.left), top: between(start.top, end.top),
    width: between(start.width, end.width), height: between(start.height, end.height),
    radius: between(start.radius, end.radius),
  } : null;

  return {
    left: between(from.left, to.left), top: between(from.top, to.top),
    height: between(from.height, to.height), spot, partial: to.partial, moving: true,
  };
}

function samePlacement(previous: Placement | null, next: Placement) {
  if (!previous || previous.left !== next.left || previous.top !== next.top || previous.height !== next.height
    || previous.partial !== next.partial || previous.moving !== next.moving) return false;

  const a = previous.spot;
  const b = next.spot;
  return a === b || (a !== null && b !== null && a.left === b.left && a.top === b.top
    && a.width === b.width && a.height === b.height && a.radius === b.radius);
}

function useSpotlight(canvasRef: RefObject<HTMLElement | null>, headerRef: RefObject<HTMLElement | null>,
  panel: HTMLDivElement | null, id: string, run: number, open: boolean, onSettled: (target: string) => void) {
  const [placement, setPlacement] = useState<Placement | null>(null);
  const painted = useRef<Placement | null>(null);
  const aligned = useRef<{ id: string; run: number } | null>(null);

  useLayoutEffect(() => {
    const canvas = canvasRef.current;
    if (!open || !canvas || !panel) return;
    const target = findTarget(canvas, id);
    const content = panel.querySelector<HTMLElement>(".tour-panel-content");
    const body = panel.querySelector<HTMLElement>(".tour-panel-body");
    const header = panel.querySelector<HTMLElement>(".tour-panel-header");
    const footer = panel.querySelector<HTMLElement>(".tour-panel-footer");
    if (!target || !content || !body || !header || !footer) {
      onSettled(id);
      return;
    }

    const motion = window.matchMedia(motionQuery);
    const visualViewport = window.visualViewport;
    let frame = 0;
    let moving = false;

    function viewport(): Viewport {
      const height = visualViewport?.height ?? window.innerHeight;
      const bodyStyle = getComputedStyle(body!);
      const padding = Number.parseFloat(bodyStyle.paddingTop) + Number.parseFloat(bodyStyle.paddingBottom);
      const chrome = header!.getBoundingClientRect().height + footer!.getBoundingClientRect().height;
      const naturalHeight = Math.ceil(chrome + content!.getBoundingClientRect().height + padding);
      return {
        width: document.documentElement.clientWidth,
        top: Math.max(gutter, (headerRef.current?.getBoundingClientRect().bottom ?? 0) + 8),
        bottom: height - gutter,
        panelWidth: panel!.getBoundingClientRect().width,
        panelHeight: Math.max(chrome, Math.min(naturalHeight, height / 2)),
      };
    }

    function show(next: Placement) {
      if (samePlacement(painted.current, next)) return;
      painted.current = next;
      setPlacement(next);
    }

    function follow() {
      show(locate(target!.getBoundingClientRect(), viewport()));
    }

    function schedule() {
      if (frame || moving) return;
      frame = window.requestAnimationFrame(() => { frame = 0; follow(); });
    }

    function settle() {
      if (frame) window.cancelAnimationFrame(frame);
      frame = 0;
      moving = false;
      follow();
      onSettled(id);
    }

    function align(animate: boolean) {
      const current = viewport();
      const rect = target!.getBoundingClientRect();
      const existing = locate(rect, current);
      const startY = window.scrollY;
      let endY = startY;

      if (!existing.spot || existing.partial || rect.top - halo < current.top) {
        const available = current.bottom - current.panelHeight - gap - current.top;
        const spare = Math.max(0, available - rect.height - halo * 2);
        const desiredTop = current.top + halo + Math.min(56, spare * 0.4);
        const maximum = document.documentElement.scrollHeight - document.documentElement.clientHeight;
        endY = Math.max(0, Math.min(maximum, startY + rect.top - desiredTop));
      }

      const travel = endY - startY;
      const destination = locate({ top: rect.top - travel, bottom: rect.bottom - travel, left: rect.left, right: rect.right }, current);
      if (!animate || motion.matches) {
        if (Math.abs(travel) > 1) window.scrollTo({ top: endY, behavior: "instant" });
        settle();
        return;
      }

      if (frame) window.cancelAnimationFrame(frame);
      const origin = painted.current ?? { ...destination, spot: destination.spot && collapsed(destination.spot) };
      const start = performance.now();
      moving = true;
      show({ ...origin, partial: destination.partial, moving: true });
      function advance(now: number) {
        const linear = motion.matches ? 1 : Math.min(1, (now - start) / flightMs);
        const eased = linear * linear * (3 - 2 * linear);
        if (Math.abs(travel) > 1) window.scrollTo({ top: startY + travel * eased, behavior: "instant" });
        if (linear === 1) {
          settle();
          return;
        }
        show(tween(origin, destination, eased));
        frame = window.requestAnimationFrame(advance);
      }
      frame = window.requestAnimationFrame(advance);
    }

    function resize() {
      // Mobile browser chrome can resize the visual viewport during a programmatic scroll.
      // Re-read the geometry on landing instead of interrupting that scroll.
      if (!moving) align(false);
    }
    function interrupt(event: Event) {
      if (moving && !(event.target instanceof Node && panel!.contains(event.target))) settle();
    }

    const observer = new ResizeObserver(schedule);
    observer.observe(content);
    observer.observe(target);
    if (headerRef.current) observer.observe(headerRef.current);
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("wheel", interrupt, { passive: true });
    window.addEventListener("touchstart", interrupt, { passive: true });
    window.addEventListener("resize", resize);
    visualViewport?.addEventListener("resize", resize);

    if (aligned.current?.id !== id || aligned.current?.run !== run) {
      aligned.current = { id, run };
      align(true);
    } else {
      follow();
      onSettled(id);
    }

    return () => {
      observer.disconnect();
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("wheel", interrupt);
      window.removeEventListener("touchstart", interrupt);
      window.removeEventListener("resize", resize);
      visualViewport?.removeEventListener("resize", resize);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, [canvasRef, headerRef, id, run, open, onSettled, panel]);

  return placement;
}


export function DashboardTour({ index, run, active, paused, closing, canvasRef, headerRef, onStepChange, onExit, onFinish, onExited }: {
  index: number;
  run: number;
  active: boolean;
  paused: boolean;
  closing: boolean;
  canvasRef: RefObject<HTMLElement | null>;
  headerRef: RefObject<HTMLElement | null>;
  onStepChange: (index: number) => void;
  onExit: () => void;
  onFinish: () => void;
  onExited: () => void;
}) {
  const [panel, setPanel] = useState<HTMLDivElement | null>(null);
  const [changing, setChanging] = useState(false);
  const pendingTarget = useRef<string | null>(null);
  const outgoing = useRef<Animation[]>([]);
  const heading = useRef<HTMLHeadingElement>(null);
  const caption = useRef<HTMLDivElement>(null);
  const copy = useRef<HTMLDivElement>(null);
  const maskId = useId();
  const step = steps[index];
  const open = active && !paused;
  const last = index === steps.length - 1;

  const onSettled = useCallback((target: string) => {
    if (pendingTarget.current !== target) return;
    pendingTarget.current = null;
    setChanging(false);
    heading.current?.focus({ preventScroll: true });
  }, []);

  const placement = useSpotlight(canvasRef, headerRef, panel, step.target, run, open && !closing, onSettled);
  const spotlight = active ? placement?.spot : null;
  const rect = spotlight && { x: spotlight.left, y: spotlight.top, width: spotlight.width, height: spotlight.height, rx: spotlight.radius };
  const busy = changing || Boolean(placement?.moving);

  useLayoutEffect(() => {
    panel?.querySelector(".tour-panel-body")?.scrollTo({ top: 0, behavior: "instant" });
  }, [index, panel]);

  useLayoutEffect(() => {
    outgoing.current.forEach((animation) => animation.cancel());
    outgoing.current = [];
    pendingTarget.current = null;
    setChanging(false);
  }, [run]);

  useEffect(() => {
    if (open && !closing) return;
    outgoing.current.forEach((animation) => animation.cancel());
    outgoing.current = [];
    pendingTarget.current = null;
    setChanging(false);
  }, [open, closing]);

  useEffect(() => {
    if (!closing) return;
    const timeout = window.setTimeout(onExited, window.matchMedia(motionQuery).matches ? 0 : tourExitMs);
    return () => window.clearTimeout(timeout);
  }, [closing, onExited]);

  useEffect(() => () => {
    outgoing.current.forEach((animation) => animation.cancel());
    pendingTarget.current = null;
  }, []);

  function move(next: number) {
    const destination = steps[next];
    if (pendingTarget.current || busy || closing || !destination) return;
    pendingTarget.current = destination.target;
    if (window.matchMedia(motionQuery).matches || typeof copy.current?.animate !== "function") {
      onStepChange(next);
      return;
    }

    setChanging(true);
    outgoing.current = [caption.current, copy.current].flatMap((element) => element ? [element.animate(
      [{ opacity: 1, transform: "translateY(0)" }, { opacity: 0, transform: "translateY(-4px)" }],
      { duration: textExitMs, easing: "ease-in", fill: "forwards" },
    )] : []);
    void Promise.all(outgoing.current.map((animation) => animation.finished)).then(() => {
      outgoing.current = [];
      if (pendingTarget.current === destination.target) onStepChange(next);
    }).catch(() => { /* A dismissal cancels the outgoing copy. */ });
  }

  function focusTarget() {
    const canvas = canvasRef.current;
    if (canvas) findTarget(canvas, step.target)?.focus();
  }

  return <>
    <div className="tour-dim no-print" data-hidden={active && paused} data-closing={closing} aria-hidden="true">
      <svg width="100%" height="100%" className="tour-veil" focusable="false">
        <defs>
          <mask id={maskId} maskUnits="userSpaceOnUse" x="0" y="0" width="100%" height="100%">
            <rect width="100%" height="100%" fill="white" />
            <rect {...(rect || { width: 0, height: 0 })} fill="black" />
          </mask>
        </defs>
        <rect width="100%" height="100%" mask={`url(#${maskId})`} className="tour-dim-fill" />
        <rect {...(rect || { width: 0, height: 0 })} className="tour-spotlight" data-moving={Boolean(placement?.moving)} />
      </svg>
    </div>
    <Dialog.Root modal={false} open={open} onOpenChange={(next) => { if (!next && !closing) onExit(); }}>
      <Dialog.Portal>
        <Dialog.Content ref={setPanel} className="tour-panel no-print" data-closing={closing}
          style={placement ? { top: 0, left: 0, bottom: "auto", right: "auto", height: placement.height,
            transform: `translate3d(${placement.left}px, ${placement.top}px, 0)` } : undefined}
          onInteractOutside={(event) => event.preventDefault()}
          onOpenAutoFocus={(event) => { event.preventDefault(); heading.current?.focus({ preventScroll: true }); }}
          onCloseAutoFocus={(event) => event.preventDefault()}>
          <header className="tour-panel-header">
            <div ref={caption} className="tour-step-caption" key={step.target}><p>Step {index + 1} of {steps.length}</p><span>{step.label}</span></div>
            <Dialog.Close asChild><Button variant="ghost" size="icon" aria-label="Close tour"><X /></Button></Dialog.Close>
          </header>
          <div className="tour-panel-body">
            <div className="tour-panel-content">
              <div ref={copy} className="tour-step-copy" key={step.target}>
                <Dialog.Title ref={heading} tabIndex={-1}>{step.title}</Dialog.Title>
                <Dialog.Description>{step.description}</Dialog.Description>
                <p className="tour-tip"><Lightbulb aria-hidden="true" /> <span>{step.tip}</span></p>
                <p className="tour-scroll-hint" data-visible={Boolean(placement?.partial)} aria-hidden={!placement?.partial}>Scroll to see more of this section.</p>
              </div>
              <button type="button" className="tour-focus-target sr-only" onClick={focusTarget}>Focus highlighted section</button>
            </div>
          </div>
          <footer className="tour-panel-footer">
            <div className="tour-progress" aria-hidden="true">
              {steps.map(({ target }) => <span key={target} />)}
              <i style={{ transform: `translateX(${index * 17}px)` }} />
            </div>
            <div className="tour-actions">
              <Dialog.Close asChild><Button variant="ghost" size="sm">Exit</Button></Dialog.Close>
              <div>
                <Button variant="outline" size="sm" disabled={!index} aria-disabled={busy || closing || !index}
                  onClick={() => move(index - 1)}><ArrowLeft aria-hidden="true" /> Back</Button>
                <Button size="sm" aria-disabled={busy || closing}
                  onClick={() => { if (!busy && !closing) { if (last) onFinish(); else move(index + 1); } }}>
                  {last ? "Finish Tour" : "Next"}{!last && <ArrowRight aria-hidden="true" />}
                </Button>
              </div>
            </div>
          </footer>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  </>;
}
