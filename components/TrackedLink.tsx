"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { track, type AnalyticsEvent, type AnalyticsProps } from "@/lib/analytics";

interface Props {
  href: string;
  event: AnalyticsEvent;
  props?: AnalyticsProps;
  /** Externer Link (WhatsApp, tel:, mailto:) – öffnet ggf. in neuem Tab. */
  external?: boolean;
  className?: string;
  children: ReactNode;
  "aria-label"?: string;
}

/** Link, der beim Klick ein anonymes Analyse-Ereignis auslöst. */
export default function TrackedLink({ href, event, props, external, className, children, ...rest }: Props) {
  const onClick = () => track(event, props);
  const isProtocol = /^(tel:|mailto:)/.test(href);
  if (external || isProtocol || /^https?:/.test(href)) {
    return (
      <a
        href={href}
        onClick={onClick}
        className={className}
        {...(isProtocol ? {} : { target: "_blank", rel: "noopener noreferrer" })}
        {...rest}
      >
        {children}
      </a>
    );
  }
  return (
    <Link href={href} onClick={onClick} className={className} {...rest}>
      {children}
    </Link>
  );
}
