import { ArrowRight, Check, CirclePlay, MapPin, ShieldCheck, Zap } from "lucide-react";
import TrackedLink from "@/components/TrackedLink";
import IconTile from "@/components/ui/IconTile";
import ServiceSelector from "@/components/home/ServiceSelector";
import { hero } from "@/lib/homepage";

const faktenIcons = [MapPin, Zap, ShieldCheck] as const;

/** Hero der Startseite: links Nutzenversprechen, rechts die Leistungsauswahl. */
export default function Hero() {
  return (
    <section className="bg-home relative overflow-hidden" aria-labelledby="hero-title">
      <div className="container-page grid items-center gap-10 pb-14 pt-10 sm:pt-14 lg:grid-cols-2 lg:gap-10 lg:pb-20 lg:pt-16 xl:grid-cols-[minmax(0,0.88fr)_minmax(0,1.12fr)] xl:gap-14">
        <div>
          <p className="inline-flex items-center gap-2 rounded-full bg-accent-100 px-3.5 py-1.5 text-sm font-semibold text-accent-700">
            <Check className="h-4 w-4" strokeWidth={3} aria-hidden />
            {hero.badge}
          </p>

          <h1
            id="hero-title"
            className="mt-5 text-balance font-display text-[2.125rem] font-extrabold leading-[1.1] text-navy sm:text-[2.75rem] sm:leading-[1.08] lg:text-[2.5rem] xl:text-5xl"
          >
            {hero.title}
          </h1>

          <p className="mt-5 max-w-xl text-lg leading-relaxed text-ink-700 sm:text-xl">{hero.lead}</p>

          <ul className="mt-7 grid gap-3.5">
            {hero.vorteile.map(({ icon, title, text }) => (
              <li key={title} className="flex items-center gap-3.5">
                <IconTile icon={icon} tone="teal" size="sm" />
                <span className="min-w-0 leading-snug">
                  <span className="font-display text-base font-bold text-navy">{title}</span>{" "}
                  <span className="text-[15px] text-ink-600">{text}</span>
                </span>
              </li>
            ))}
          </ul>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <TrackedLink
              href={hero.primary.href}
              event="cta_click"
              props={{ position: "hero" }}
              className="btn btn-primary btn-lg whitespace-nowrap"
            >
              {hero.primary.label}
              <ArrowRight className="h-5 w-5" aria-hidden />
            </TrackedLink>
            <a href={hero.secondary.href} className="btn btn-secondary btn-lg whitespace-nowrap px-5">
              <CirclePlay className="h-5 w-5" aria-hidden />
              {hero.secondary.label}
            </a>
          </div>

          <ul className="mt-6 flex flex-wrap gap-x-6 gap-y-2 text-sm text-ink-600">
            {hero.fakten.map((text, i) => {
              const Icon = faktenIcons[i] ?? ShieldCheck;
              return (
                <li key={text} className="flex items-center gap-1.5">
                  <Icon className="h-4 w-4 shrink-0 text-navy" aria-hidden />
                  {text}
                </li>
              );
            })}
          </ul>

          <p className="mt-5 max-w-xl border-l-2 border-accent-500 pl-3 text-sm leading-relaxed text-ink-600">
            {hero.hinweis}
          </p>
        </div>

        <ServiceSelector texte={hero.auswahl} />
      </div>
    </section>
  );
}
