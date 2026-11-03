"use client";

import { useEffect, useRef, type ReactNode } from "react";

/**
 * Dezenter Scroll-Reveal ohne Animationsbibliothek.
 *
 * Inhalte sind im HTML sofort sichtbar. Nur wenn JavaScript läuft (Klasse
 * `js` am <html>, gesetzt im Layout), werden Elemente unterhalb des sichtbaren
 * Bereichs kurz ausgeblendet und beim Hineinscrollen eingeblendet.
 * prefers-reduced-motion schaltet die Animation ab (siehe globals.css).
 */
export default function Reveal({
  children,
  delay = 0,
  className,
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined") {
      el.classList.add("reveal-in");
      return;
    }
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.classList.add("reveal-in");
          io.disconnect();
        }
      },
      { rootMargin: "0px 0px -60px 0px" }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={className ? `reveal ${className}` : "reveal"}
      style={delay ? { transitionDelay: `${delay}s` } : undefined}
    >
      {children}
    </div>
  );
}
