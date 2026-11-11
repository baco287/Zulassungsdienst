import type { LucideIcon } from "lucide-react";

const tones = {
  blue: "bg-brand-50 text-brand-700",
  teal: "bg-accent-50 text-accent-600",
  navy: "bg-navy text-white",
  white: "bg-white/10 text-white",
} as const;

const sizes = {
  sm: { box: "h-10 w-10 rounded-xl", icon: "h-5 w-5" },
  md: { box: "h-12 w-12 rounded-[14px]", icon: "h-6 w-6" },
  lg: { box: "h-14 w-14 rounded-2xl", icon: "h-7 w-7" },
} as const;

/** Quadratische Icon-Kachel – immer rein dekorativ. */
export default function IconTile({
  icon: Icon,
  tone = "blue",
  size = "md",
  className = "",
}: {
  icon: LucideIcon;
  tone?: keyof typeof tones;
  size?: keyof typeof sizes;
  className?: string;
}) {
  return (
    <span
      className={`flex shrink-0 items-center justify-center ${sizes[size].box} ${tones[tone]} ${className}`}
      aria-hidden
    >
      <Icon className={sizes[size].icon} strokeWidth={1.75} />
    </span>
  );
}
