import HeaderNav, { type HeaderService } from "./HeaderNav";
import { getCatalogEntry } from "@/lib/catalog";
import { vorgaenge } from "@/lib/vorgaenge";

/**
 * Kopfzeile. Die Leistungsdaten (Name, Preis, Ziel) werden hier auf dem Server
 * aus dem Katalog gelesen und als schlanke Liste an die Client-Komponente
 * gegeben – so landet nicht der ganze Leistungskatalog im JavaScript jeder Seite.
 */
const services: HeaderService[] = vorgaenge.map((v) => {
  const e = getCatalogEntry(v.slug);
  return {
    slug: v.slug,
    label: v.label,
    href: e?.detailHref ?? `/leistungen/${v.slug}/`,
    preis: e?.preisText ?? "auf Anfrage",
  };
});

export default function Header() {
  return <HeaderNav services={services} />;
}
