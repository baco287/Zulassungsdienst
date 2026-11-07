import Link from "next/link";
import { ArrowRight, Info } from "lucide-react";
import { story } from "@/lib/homepage";

/** Story-Sektion: Zulassung ohne Online-Ausweis. */
export default function StorySection() {
  return (
    <section id="ohne-eid" className="bg-white py-16 sm:py-24" aria-labelledby="story-title">
      <div className="mx-auto grid max-w-[1240px] gap-12 px-4 sm:px-6 lg:grid-cols-[1.05fr_1fr] lg:gap-16">
        <div>
          <p className="font-display text-xs font-bold uppercase tracking-[0.18em] text-gold-600">{story.eyebrow}</p>
          <h2 id="story-title" className="mt-3 font-display text-3xl font-bold text-navy sm:text-[2.6rem] sm:leading-tight">
            {story.title}
          </h2>
          <p className="mt-5 text-lg leading-relaxed text-muted">{story.intro}</p>
          <Link
            href={story.cta.href}
            className="mt-7 inline-flex min-h-[48px] items-center gap-2 rounded-[14px] bg-navy px-6 font-display font-semibold text-white transition-colors duration-150 hover:bg-navy-800"
          >
            {story.cta.label}
            <ArrowRight className="h-4 w-4 text-gold" aria-hidden />
          </Link>
          <p className="mt-8 flex gap-3 rounded-[18px] border border-line bg-offwhite p-5 text-sm leading-relaxed text-muted">
            <Info className="mt-0.5 h-5 w-5 shrink-0 text-navy" aria-hidden />
            <span>{story.hinweis}</span>
          </p>
        </div>

        <ul className="grid gap-4">
          {story.vorteile.map(({ icon: Icon, title, text }) => (
            <li key={title} className="flex gap-5 rounded-[20px] border border-line bg-white p-6 shadow-[0_1px_2px_rgb(11_31_58/0.04),0_12px_28px_-16px_rgb(11_31_58/0.18)]">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[14px] bg-gold-50 text-navy" aria-hidden>
                <Icon className="h-6 w-6" strokeWidth={1.7} />
              </span>
              <div>
                <h3 className="font-display text-lg font-bold text-navy">{title}</h3>
                <p className="mt-1.5 leading-relaxed text-muted">{text}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
