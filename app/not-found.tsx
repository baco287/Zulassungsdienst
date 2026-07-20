import Link from "next/link";
import { SearchX } from "lucide-react";

export default function NotFound() {
  return (
    <section className="flex min-h-[50vh] items-center justify-center px-4 py-20">
      <div className="text-center">
        <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-ink-100 text-ink-500">
          <SearchX className="h-8 w-8" aria-hidden />
        </span>
        <h1 className="mt-6 font-display text-3xl font-bold text-ink-900">
          Seite nicht gefunden
        </h1>
        <p className="mt-3 text-ink-600">
          Die angeforderte Seite existiert nicht (mehr).
        </p>
        <Link
          href="/"
          className="mt-6 inline-block rounded-xl bg-brand-700 px-6 py-3 font-display font-semibold text-white transition-colors duration-200 hover:bg-brand-800"
        >
          Zur Startseite
        </Link>
      </div>
    </section>
  );
}
