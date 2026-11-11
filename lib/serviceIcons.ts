/**
 * Ein Icon je Leistung – damit Startseite, Leistungskarten und
 * Auftragsassistent dieselbe Bildsprache verwenden.
 */
import {
  ArrowLeftRight,
  CarFront,
  CircleX,
  ClipboardList,
  FileSearch,
  House,
  RefreshCw,
  SunSnow,
  Sparkles,
  Timer,
  Users,
  type LucideIcon,
} from "lucide-react";

const icons: Record<string, LucideIcon> = {
  neuzulassung: CarFront,
  ummeldung: ArrowLeftRight,
  abmeldung: CircleX,
  wiederzulassung: RefreshCw,
  halterwechsel: Users,
  adressaenderung: House,
  kurzzeitkennzeichen: Timer,
  saisonkennzeichen: SunSnow,
  wunschkennzeichen: Sparkles,
  "ersatz-dokumente": FileSearch,
};

export function serviceIcon(slug: string): LucideIcon {
  return icons[slug] ?? ClipboardList;
}
