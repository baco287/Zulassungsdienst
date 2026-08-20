"use client";

import { Printer } from "lucide-react";

/** Druckt die aktuelle Seite; Navigation/Footer werden per Print-CSS ausgeblendet. */
export default function PrintButton({ label = "Vorlage drucken" }: { label?: string }) {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="no-print flex cursor-pointer items-center gap-2 rounded-xl bg-brand-700 px-5 py-3 font-display font-semibold text-white transition-colors duration-200 hover:bg-brand-800"
    >
      <Printer className="h-4 w-4" aria-hidden />
      {label}
    </button>
  );
}
