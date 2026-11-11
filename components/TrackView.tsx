"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { track, type AnalyticsEvent, type AnalyticsProps } from "@/lib/analytics";

/**
 * Löst ein Analyse-Ereignis einmal aus, sobald der Inhalt zur Hälfte im
 * sichtbaren Bereich war (z. B. "Preisbox gesehen"). Ohne aktive Analyse
 * ist track() wirkungslos; der Inhalt wird immer normal gerendert.
 */
export default function TrackView({
  event,
  props,
  children,
  className,
}: {
  event: AnalyticsEvent;
  props?: AnalyticsProps;
  children: ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const sent = useRef(false);
  const key = JSON.stringify(props ?? {});

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(
      (entries) => {
        if (!sent.current && entries.some((e) => e.isIntersecting)) {
          sent.current = true;
          track(event, JSON.parse(key) as AnalyticsProps);
          io.disconnect();
        }
      },
      { threshold: 0.5 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [event, key]);

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}
