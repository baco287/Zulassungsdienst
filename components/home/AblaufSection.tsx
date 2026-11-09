import { ablauf } from "@/lib/homepage";

/** Ablauf in vier Schritten. */
export default function AblaufSection() {
  return (
    <section id="ablauf" className="bg-white py-16 sm:py-24" aria-labelledby="ablauf-title">
      <div className="mx-auto max-w-[1240px] px-4 sm:px-6">
        <div className="max-w-2xl">
          <p className="font-display text-xs font-bold uppercase tracking-[0.18em] text-accent-600">So funktioniert es</p>
          <h2 id="ablauf-title" className="mt-3 font-display text-3xl font-bold text-navy sm:text-[2.6rem] sm:leading-tight">
            In vier Schritten zur Zulassung
          </h2>
        </div>

        <ol className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {ablauf.map(({ icon: Icon, title, text }, i) => (
            <li
              key={title}
              className="relative rounded-[20px] border border-line bg-white p-6 shadow-[0_1px_2px_rgb(11_31_58/0.04),0_12px_28px_-16px_rgb(11_31_58/0.18)]"
            >
              <div className="flex items-center justify-between">
                <span className="flex h-12 w-12 items-center justify-center rounded-[14px] bg-navy text-white" aria-hidden>
                  <Icon className="h-6 w-6" strokeWidth={1.7} />
                </span>
                <span className="font-display text-sm font-bold text-accent-600" aria-hidden>
                  {String(i + 1).padStart(2, "0")}
                </span>
              </div>
              <h3 className="mt-5 font-display text-lg font-bold text-navy">
                <span className="sr-only">Schritt {i + 1}: </span>
                {title}
              </h3>
              <p className="mt-2 leading-relaxed text-muted">{text}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
