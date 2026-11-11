"use client";

import { useCallback, useRef } from "react";
import { track } from "@/lib/analytics";

/**
 * Meldet "tool_used" genau einmal pro Seitenaufruf, sobald jemand das
 * Werkzeug tatsächlich bedient (Eingabe oder Klick) – nicht schon beim Laden.
 */
export function useToolUsed(tool: string) {
  const sent = useRef(false);
  return useCallback(() => {
    if (sent.current) return;
    sent.current = true;
    track("tool_used", { tool });
  }, [tool]);
}
