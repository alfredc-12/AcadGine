"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { ArrowLeft, ArrowRight, Lightbulb, X } from "lucide-react";
import { useLayoutEffect, useRef, useState, type RefObject } from "react";
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

type Rect = { top: number; left: number; width: number; height: number };
type Placement = { step: string; top: number; left: number; spot: Rect | null; partial: boolean };

const gutter = 14;
const gap = 12;
const halo = 5;

function findTarget(canvas: HTMLElement, id: string) {
  return canvas.querySelector<HTMLElement>(`[data-tour-target="${id}"]`);
}

function useSpotlight(canvasRef: RefObject<HTMLElement | null>, headerRef: RefObject<HTMLElement | null>,
  panel: HTMLDivElement | null, id: string, open: boolean) {
  const [placement, setPlacement] = useState<Placement | null>(null);
  const alignedStep = useRef<string | null>(null);

  useLayoutEffect(() => {
    const canvas = canvasRef.current;
    if (!open || !canvas || !panel) return;
    const target = findTarget(canvas, id);
    if (!target) return;

    let frame = 0;
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const visualViewport = window.visualViewport;

    function metrics() {
      const width = document.documentElement.clientWidth;
      const height = visualViewport?.height ?? window.innerHeight;
      const panelWidth = panel!.offsetWidth;
      const panelHeight = panel!.offsetHeight;
      const headerBottom = headerRef.current?.getBoundingClientRect().bottom ?? 0;
      const top = Math.max(gutter, headerBottom + 8);
      const bottom = height - gutter;
      const dockTop = Math.max(gutter, bottom - panelHeight);
      return { width, panelWidth, panelHeight, top, bottom, dockTop };
    }

    function update() {
      const { width, panelWidth, panelHeight, top, bottom, dockTop } = metrics();
      const rect = target!.getBoundingClientRect();
      const dockLeft = Math.max(gutter, width - panelWidth - gutter);
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
      const spot = clipRight > clipLeft && clipBottom > clipTop
        ? { left: clipLeft, top: clipTop, width: clipRight - clipLeft, height: clipBottom - clipTop }
        : null;

      setPlacement({
        step: id, left: panelLeft, top: panelTop, spot,
        partial: rect.bottom + halo > spotlightBottom,
      });
    }

    function schedule() {
      if (frame) return;
      frame = window.requestAnimationFrame(() => { frame = 0; update(); });
    }

    function align(behavior: ScrollBehavior) {
      const { top, dockTop, panelHeight } = metrics();
      const padding = `${panelHeight + gap + gutter}px`;
      if (canvas!.style.getPropertyValue("--tour-panel-space") !== padding) {
        canvas!.style.setProperty("--tour-panel-space", padding);
      }
      const rect = target!.getBoundingClientRect();
      const available = Math.max(0, dockTop - gap - top);
      if (rect.top - halo < top || rect.bottom + halo > dockTop - gap) {
        const spare = Math.max(0, available - rect.height - halo * 2);
        const desiredTop = top + halo + Math.min(56, spare * 0.4);
        window.scrollTo({ top: Math.max(0, window.scrollY + rect.top - desiredTop), behavior });
      }
      schedule();
    }

    function resize() {
      align("instant");
    }

    const observer = new ResizeObserver(() => {
      const padding = `${panel!.offsetHeight + gap + gutter}px`;
      if (canvas.style.getPropertyValue("--tour-panel-space") !== padding) {
        canvas.style.setProperty("--tour-panel-space", padding);
      }
      schedule();
    });
    observer.observe(panel);
    observer.observe(target);
    if (headerRef.current) observer.observe(headerRef.current);

    const onScroll = () => schedule();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", resize);
    visualViewport?.addEventListener("resize", resize);

    const bounds = target.getBoundingClientRect();
    const { top, dockTop } = metrics();
    if (alignedStep.current !== id || bounds.bottom <= top || bounds.top >= dockTop - gap) {
      alignedStep.current = id;
      align(motion.matches ? "instant" : "smooth");
    }
    update();

    return () => {
      observer.disconnect();
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", resize);
      visualViewport?.removeEventListener("resize", resize);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, [canvasRef, headerRef, id, open, panel]);

  useLayoutEffect(() => {
    const canvas = canvasRef.current;
    return () => canvas?.style.removeProperty("--tour-panel-space");
  }, [canvasRef]);

  return placement?.step === id ? placement : null;
}

export function DashboardTour({ index, paused, canvasRef, headerRef, onStepChange, onExit, onFinish }: {
  index: number;
  paused: boolean;
  canvasRef: RefObject<HTMLElement | null>;
  headerRef: RefObject<HTMLElement | null>;
  onStepChange: (index: number) => void;
  onExit: () => void;
  onFinish: () => void;
}) {
  const [panel, setPanel] = useState<HTMLDivElement | null>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const step = steps[index];
  const placement = useSpotlight(canvasRef, headerRef, panel, step.target, !paused);
  const last = index === steps.length - 1;

  useLayoutEffect(() => {
    if (panel && !paused) heading.current?.focus({ preventScroll: true });
  }, [index, panel, paused]);

  function focusTarget() {
    const canvas = canvasRef.current;
    if (canvas) findTarget(canvas, step.target)?.focus();
  }

  return <Dialog.Root modal={false} open={!paused} onOpenChange={(open) => { if (!open) onExit(); }}>
    <Dialog.Portal>
      {!paused && <div className="tour-dim no-print" data-spotlight={Boolean(placement?.spot)} aria-hidden="true">
        {placement?.spot && <div className="tour-spotlight" style={placement.spot} />}
      </div>}
      <Dialog.Content ref={setPanel} className="tour-panel no-print"
        style={placement ? { top: placement.top, left: placement.left, bottom: "auto", right: "auto" } : undefined}
        onInteractOutside={(event) => event.preventDefault()}
        onOpenAutoFocus={(event) => { event.preventDefault(); heading.current?.focus({ preventScroll: true }); }}
        onCloseAutoFocus={(event) => event.preventDefault()}>
        <header className="tour-panel-header">
          <div><p>Step {index + 1} of {steps.length}</p><span>{step.label}</span></div>
          <Dialog.Close asChild><Button variant="ghost" size="icon" aria-label="Close tour"><X /></Button></Dialog.Close>
        </header>
        <div className="tour-panel-body">
          <div className="tour-step-copy" key={step.target}>
            <Dialog.Title ref={heading} tabIndex={-1}>{step.title}</Dialog.Title>
            <Dialog.Description>{step.description}</Dialog.Description>
            <p className="tour-tip"><Lightbulb aria-hidden="true" /> <span>{step.tip}</span></p>
            {placement?.partial && <p className="tour-scroll-hint">Scroll to see more of this section.</p>}
          </div>
          <button type="button" className="tour-focus-target sr-only" onClick={focusTarget}>Focus highlighted section</button>
        </div>
        <footer className="tour-panel-footer">
          <div className="tour-progress" aria-hidden="true">
            {steps.map(({ target }, position) => <span key={target} data-current={position === index} />)}
          </div>
          <div className="tour-actions">
            <Dialog.Close asChild><Button variant="ghost" size="sm">Exit</Button></Dialog.Close>
            <div>
              <Button variant="outline" size="sm" disabled={!index} onClick={() => onStepChange(Math.max(0, index - 1))}><ArrowLeft aria-hidden="true" /> Back</Button>
              <Button size="sm" onClick={last ? onFinish : () => onStepChange(index + 1)}>
                {last ? "Finish Tour" : "Next"}{!last && <ArrowRight aria-hidden="true" />}
              </Button>
            </div>
          </div>
        </footer>
      </Dialog.Content>
    </Dialog.Portal>
  </Dialog.Root>;
}
