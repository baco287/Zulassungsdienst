"use client";

import { useEffect, useRef, useState } from "react";
import { useInView, useReducedMotion } from "framer-motion";
import { Check, Lock } from "lucide-react";
import Maxx from "./Maxx";
import { chatDemo } from "@/lib/whatsappFlow";

/**
 * Illustration eines Chatverlaufs auf der Messenger-Landingpage.
 *
 * Die Nachrichten erscheinen nacheinander (mit Tipp-Indikator vor Antworten
 * des Teams) und der Verlauf wiederholt sich – so wird der Ablauf sichtbar,
 * ohne dass eine Videodatei geladen werden muss.
 *
 * Bewusst im eigenen Markendesign gehalten (keine Nachbildung der Oberfläche
 * eines fremden Messengers) – es geht um die Veranschaulichung des Ablaufs.
 *
 * Bei prefers-reduced-motion steht der vollständige Verlauf sofort still da.
 */

/** Wartezeit vor der jeweiligen Nachricht in ms (Tippen + Lesepause). */
const typingDelay = 1100;
const readDelay = 900;
const restartDelay = 4500;

export default function ChatMockup() {
  const reduced = useReducedMotion();
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inView = useInView(containerRef, { once: false, margin: "-80px" });

  const [count, setCount] = useState(reduced ? chatDemo.length : 0);
  const [typing, setTyping] = useState(false);

  useEffect(() => {
    if (reduced) {
      setCount(chatDemo.length);
      return;
    }
    if (!inView) return;

    let cancelled = false;
    const timers: ReturnType<typeof setTimeout>[] = [];

    const schedule = (fn: () => void, ms: number) => {
      timers.push(setTimeout(() => !cancelled && fn(), ms));
    };

    const run = (index: number) => {
      if (index >= chatDemo.length) {
        schedule(() => {
          setCount(0);
          run(0);
        }, restartDelay);
        return;
      }

      const isTeam = chatDemo[index].from === "team";
      if (isTeam) setTyping(true);

      schedule(
        () => {
          setTyping(false);
          setCount(index + 1);
          run(index + 1);
        },
        isTeam ? typingDelay : readDelay,
      );
    };

    run(count === chatDemo.length ? 0 : count);

    return () => {
      cancelled = true;
      timers.forEach(clearTimeout);
      setTyping(false);
    };
    // Neustart nur bei Sichtbarkeitswechsel – nicht bei jedem Zählerschritt.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inView, reduced]);

  // Verlauf mitscrollen, wenn er länger wird als das Fenster.
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [count, typing]);

  return (
    <div
      ref={containerRef}
      className="mx-auto w-full max-w-sm overflow-hidden rounded-[2rem] border-[6px] border-ink-900 bg-white shadow-2xl"
      aria-hidden
    >
      {/* Kopfzeile */}
      <div className="flex items-center gap-3 bg-ink-900 px-4 py-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white p-1">
          <Maxx pose="plain" className="h-full w-full" />
        </span>
        <div className="min-w-0">
          <p className="truncate font-display text-sm font-semibold text-white">
            DeutscheZulassung
          </p>
          <p className="text-[11px] text-emerald-400">
            {typing ? "schreibt …" : "online · antwortet meist sofort"}
          </p>
        </div>
      </div>

      {/* Verlauf */}
      <div
        ref={scrollRef}
        className="h-[26rem] space-y-2.5 overflow-hidden bg-ink-50 px-3 py-4"
      >
        {chatDemo.slice(0, count).map((msg) => {
          const own = msg.from === "kunde";
          return (
            <div
              key={msg.text}
              className={`flex ${own ? "justify-end" : "justify-start"} ${
                reduced ? "" : "animate-msg-in"
              }`}
            >
              <div
                className={`max-w-[82%] rounded-2xl px-3.5 py-2 text-[13px] leading-snug shadow-sm ${
                  own
                    ? "rounded-br-md bg-brand-600 text-white"
                    : "rounded-bl-md bg-white text-ink-800"
                }`}
              >
                <p>{msg.text}</p>
                <p
                  className={`mt-1 flex items-center justify-end gap-1 text-[10px] ${
                    own ? "text-brand-100" : "text-ink-400"
                  }`}
                >
                  {msg.time}
                  {own && <Check className="h-3 w-3" />}
                </p>
              </div>
            </div>
          );
        })}

        {typing && (
          <div className="flex justify-start">
            <div className="flex items-center gap-1 rounded-2xl rounded-bl-md bg-white px-4 py-3 shadow-sm">
              {[0, 1, 2].map((i) => (
                <span
                  key={i}
                  className="animate-typing h-1.5 w-1.5 rounded-full bg-ink-400"
                  style={{ animationDelay: `${i * 0.18}s` }}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Fußzeile */}
      <div className="flex items-center justify-center gap-1.5 bg-ink-100 px-4 py-2.5 text-[10px] font-medium text-ink-500">
        <Lock className="h-3 w-3" />
        Ende-zu-Ende-verschlüsselt
      </div>
    </div>
  );
}
