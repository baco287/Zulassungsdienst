"use client";

import { useId, useRef, useState } from "react";
import { AlertCircle, FileText, ImageIcon, Paperclip, Trash2, UploadCloud } from "lucide-react";
import { UPLOAD_LIMITS, formatBytes, validateFiles } from "@/lib/order";

/**
 * Auswahl der Unterlagen (Fotos oder PDF).
 *
 * Bewusst ohne Vorschau-Thumbnails: Ausweis- und Fahrzeugpapiere sind sensibel,
 * eine dauerhaft sichtbare Vorschau auf dem Bildschirm ist im Zweifel
 * unangenehm (Blickschutz am Schreibtisch, Screenshots). Name, Typ und Größe
 * genügen zur Kontrolle, dass die richtige Datei gewählt wurde.
 */

interface Props {
  files: File[];
  onChange: (files: File[]) => void;
  /** Checkliste der gewählten Leistung – zeigt dem Kunden, was gebraucht wird. */
  checklist?: readonly string[];
  /** Fehlermeldung vom Server (z. B. abgelehntes Format). */
  serverError?: string;
  /** Beschriftung der Fläche, je nach Kontext. */
  label?: string;
}

export default function DocumentUpload({
  files,
  onChange,
  checklist,
  serverError,
  label = "Unterlagen hinzufügen",
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputId = useId();
  const errorId = `${inputId}-error`;

  const totalBytes = files.reduce((sum, f) => sum + f.size, 0);
  const shownError = error ?? serverError ?? null;

  function addFiles(incoming: FileList | null) {
    if (!incoming || incoming.length === 0) return;

    // Doppelte Auswahl (gleicher Name + Größe) still überspringen – passiert
    // leicht, wenn jemand den Dialog zweimal öffnet.
    const known = new Set(files.map((f) => `${f.name}:${f.size}`));
    const merged = [...files];
    for (const file of Array.from(incoming)) {
      if (!known.has(`${file.name}:${file.size}`)) merged.push(file);
    }

    const problem = validateFiles(merged);
    if (problem) {
      setError(problem);
      return;
    }
    setError(null);
    onChange(merged);
  }

  function removeAt(index: number) {
    setError(null);
    onChange(files.filter((_, i) => i !== index));
  }

  return (
    <div>
      {checklist && checklist.length > 0 && (
        <div className="mb-4 rounded-xl border border-brand-200 bg-brand-50 p-4">
          <p className="text-sm font-semibold text-ink-900">Diese Unterlagen brauchen wir:</p>
          <ul className="mt-2 space-y-1 text-sm text-ink-700">
            {checklist.map((item) => (
              <li key={item} className="flex gap-2">
                <span className="mt-[0.45rem] h-1.5 w-1.5 shrink-0 rounded-full bg-brand-500" aria-hidden />
                {item}
              </li>
            ))}
          </ul>
          <p className="mt-2.5 text-xs text-ink-500">
            Einfach mit dem Handy abfotografieren – Scans oder PDFs gehen genauso.
          </p>
        </div>
      )}

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          addFiles(e.dataTransfer.files);
        }}
        className={`rounded-xl border-2 border-dashed p-6 text-center transition-colors duration-200 ${
          dragging ? "border-brand-500 bg-brand-50" : "border-ink-300 bg-ink-50"
        }`}
      >
        <UploadCloud className="mx-auto h-8 w-8 text-brand-600" aria-hidden />
        <p className="mt-3 text-sm font-semibold text-ink-900">{label}</p>
        <p className="mt-1 text-xs text-ink-500">
          Fotos oder PDF · bis 10 MB je Datei · höchstens {UPLOAD_LIMITS.maxFiles} Dateien
        </p>
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="mt-4 cursor-pointer rounded-xl bg-brand-600 px-5 py-2.5 font-display text-sm font-semibold text-white transition-colors duration-200 hover:bg-brand-700"
        >
          Dateien auswählen
        </button>
        <p className="mt-2 hidden text-xs text-ink-400 sm:block">
          oder Dateien hierher ziehen
        </p>
        <input
          ref={inputRef}
          id={inputId}
          type="file"
          multiple
          accept={UPLOAD_LIMITS.accept}
          onChange={(e) => {
            addFiles(e.target.files);
            // Zurücksetzen, damit dieselbe Datei nach dem Entfernen erneut
            // gewählt werden kann (sonst feuert change nicht noch einmal).
            e.target.value = "";
          }}
          aria-describedby={shownError ? errorId : undefined}
          className="sr-only"
        />
      </div>

      {shownError && (
        <p id={errorId} className="mt-2 flex items-start gap-1.5 text-sm text-red-600" role="alert">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          {shownError}
        </p>
      )}

      {files.length > 0 && (
        <ul className="mt-4 space-y-2" aria-label="Ausgewählte Unterlagen">
          {files.map((file, i) => {
            const isPdf = file.name.toLowerCase().endsWith(".pdf");
            const Icon = isPdf ? FileText : ImageIcon;
            return (
              <li
                key={`${file.name}-${file.size}-${i}`}
                className="flex items-center gap-3 rounded-xl border border-ink-200 bg-white px-3 py-2.5"
              >
                <Icon className="h-5 w-5 shrink-0 text-brand-600" aria-hidden />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium text-ink-900">{file.name}</span>
                  <span className="block text-xs text-ink-500">{formatBytes(file.size)}</span>
                </span>
                <button
                  type="button"
                  onClick={() => removeAt(i)}
                  className="shrink-0 cursor-pointer rounded-lg p-2 text-ink-500 transition-colors duration-200 hover:bg-red-50 hover:text-red-600"
                  aria-label={`${file.name} entfernen`}
                >
                  <Trash2 className="h-4 w-4" aria-hidden />
                </button>
              </li>
            );
          })}
          <li className="flex items-center gap-2 pt-1 text-xs text-ink-500">
            <Paperclip className="h-3.5 w-3.5" aria-hidden />
            {files.length} {files.length === 1 ? "Datei" : "Dateien"} · {formatBytes(totalBytes)} von{" "}
            {formatBytes(UPLOAD_LIMITS.maxTotalBytes)}
          </li>
        </ul>
      )}
    </div>
  );
}
