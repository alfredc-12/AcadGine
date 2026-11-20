"use client";

import { useEffect, useRef, useState } from "react";

type ViewportMotion = "static" | "pending" | "visible" | "paused";

export function useViewportMotion<T extends HTMLElement>() {
  const [element, ref] = useState<T | null>(null);
  const [motion, setMotion] = useState<ViewportMotion>("static");
  const entered = useRef(false);

  useEffect(() => {
    if (!element || typeof IntersectionObserver === "undefined") return;
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    let intersecting = false;
    function update() {
      if (preference.matches) {
        setMotion("static");
        return;
      }
      const visible = intersecting && !document.hidden;
      if (visible) entered.current = true;
      setMotion(visible ? "visible" : entered.current ? "paused" : "pending");
    }

    const observer = new IntersectionObserver(([entry]) => {
      intersecting = entry.isIntersecting;
      update();
    }, { threshold: 0.12 });
    observer.observe(element);
    preference.addEventListener("change", update);
    document.addEventListener("visibilitychange", update);
    update();

    return () => {
      observer.disconnect();
      preference.removeEventListener("change", update);
      document.removeEventListener("visibilitychange", update);
    };
  }, [element]);

  return { element, ref, motion };
}
