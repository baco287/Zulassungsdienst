"use client";

import { useEffect, useRef, type ReactNode } from "react";

/**
 * Dezenter Scroll-Reveal ohne Animationsbibliothek.
 *
 * Inhalte sind im HTML immer sichtbar – auch ohne JavaScript und beim Drucken.
 * Erst nach dem Laden markiert der Client Elemente, die noch UNTERHALB des
 * sichtbaren Bereichs liegen, mit `reveal-pending` und blendet sie beim
 * Hineinscrollen ein. Elemente im ersten Bildschirm werden nie ausgeblendet.
 * prefers-reduced-motion schaltet die Animation ab (siehe globals.css).
 */
export default function Reveal({
  children,
  delay = 0,
  className,
  as: Tag = "div",
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
  /** Element-Typ, z. B. "li" innerhalb einer Liste. */
  as?: "div" | "li" | "section";
}) {
  const ref = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    if (el.getBoundingClientRect().top < window.innerHeight) return;
    el.classList.add("reveal-pending");

    let done = false;
    const reveal = () => {
      if (done) return;
      done = true;
      el.classList.remove("reveal-pending");
      io.disconnect();
      window.removeEventListener("scroll", onScroll);
    };
    // Zweite Absicherung: Falls der Browser keine Sichtbarkeits-Meldung liefert
    // (z. B. Hintergrund-Tab), blendet ein Scroll-Ereignis das Element ein,
    // sobald es im Bildschirm ankommt. Inhalte bleiben so nie dauerhaft verborgen.
    const onScroll = () => {
      if (el.getBoundingClientRect().top < window.innerHeight - 40) reveal();
    };
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) reveal();
      },
      { rootMargin: "0px 0px -60px 0px" }
    );
    io.observe(el);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      io.disconnect();
      window.removeEventListener("scroll", onScroll);
      el.classList.remove("reveal-pending");
    };
  }, []);

  return (
    <Tag
      ref={ref as never}
      className={className ? `reveal ${className}` : "reveal"}
      style={delay ? { transitionDelay: `${delay}s` } : undefined}
    >
      {children}
    </Tag>
  );
}
