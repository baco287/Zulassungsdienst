"""Erzeugt docs/seo/content-inventory.csv.

Führt zusammen:
  - docs/seo/url-inventory.csv            (Live-Crawl vor Sprint 1)
  - out/**/index.html                     (aktueller Build: robots, Sitemap)
  - docs/seo/local-pages-index-decision.csv
  - docs/seo/landing-page-backlog.csv

Aufruf nach `npm run build`:  python scripts/seo-content-inventory.py
"""
import csv
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SEO = ROOT / "docs" / "seo"
OUT = ROOT / "out"


def read_csv(path: Path) -> list[dict]:
    with open(path, encoding="utf-8-sig") as f:
        return list(csv.DictReader(f, delimiter=";"))


live = read_csv(SEO / "url-inventory.csv")
local_decisions = {r["path"]: r for r in read_csv(SEO / "local-pages-index-decision.csv")}
backlog = {}
for r in read_csv(SEO / "landing-page-backlog.csv"):
    url = r.get("url", "").strip()
    if url.startswith("/"):
        backlog.setdefault(url if url.endswith("/") else url + "/", r)

sitemap = set()
sm = OUT / "sitemap.xml"
if sm.exists():
    sitemap = {re.sub(r"^https://deutschezulassung\.de", "", u) for u in re.findall(r"<loc>(.*?)</loc>", sm.read_text(encoding="utf-8"))}

landing_slugs = set(re.findall(r'slug: "([a-z0-9-]+)"', (ROOT / "lib" / "landingpages.ts").read_text(encoding="utf-8")))


def quelle(path: str, typ: str) -> str:
    seg = path.strip("/").split("/")[0] if path != "/" else ""
    return {
        "leistung": "lib/services.ts + lib/serviceContent.ts + config/preise.json + config/betrieb.json",
        "stadt": "lib/staedte.ts + lib/data/zulassungsstellen.json",
        "behoerde": "lib/data/zulassungsstellen.json",
        "kennzeichen": "lib/data/zulassungsstellen.json (Kürzel: überwiegend Wikipedia)",
        "ratgeber": "lib/ratgeber.ts",
        "gewerbe": "lib/gewerbe.ts",
        "startseite": "lib/homepage.ts + components/home/*",
    }.get(typ) or ("lib/landingpages.ts" if seg in landing_slugs else f"app/{seg}/page.tsx" if seg else "app/page.tsx")


def robots_now(path: str) -> str:
    f = OUT / path.strip("/") / "index.html" if path != "/" else OUT / "index.html"
    if not f.exists():
        return "fehlt"
    m = re.search(r'<meta name="robots" content="([^"]*)"', f.read_text(encoding="utf-8"))
    return m.group(1) if m else "index, follow"


cols = ["path", "typ", "titel", "h1", "woerter", "aehnlichste_seite_jaccard", "inlinks_live",
        "index_vorher", "robots_nachher", "in_sitemap_nachher", "datenquelle", "empfehlung", "begruendung"]
rows = []
for r in live:
    p, typ = r["path"], r["type"]
    dec = local_decisions.get(p)
    bl = backlog.get(p)
    if dec:
        empfehlung, begruendung = dec["empfehlung"], dec["begruendung"]
    elif bl:
        empfehlung = bl.get("status(existiert-ok/ausbauen/umbauen/neu/zusammenfuehren-301/noindex)", "") or bl.get("status", "")
        begruendung = (bl.get("brief_kurz(Pflichtinhalte, Zusatznutzen)", "") or bl.get("brief_kurz", ""))[:220]
    else:
        empfehlung, begruendung = "behalten", "kein Handlungsbedarf aus Audit"
    rows.append({
        "path": p, "typ": typ, "titel": r["title"], "h1": r["h1"], "woerter": r["words"],
        "aehnlichste_seite_jaccard": r["max_similarity"], "inlinks_live": r["inlinks"],
        "index_vorher": "noindex" if "noindex" in r["robots"] else "index",
        "robots_nachher": robots_now(p), "in_sitemap_nachher": "ja" if p in sitemap else "nein",
        "datenquelle": quelle(p, typ), "empfehlung": empfehlung, "begruendung": begruendung,
    })

with open(SEO / "content-inventory.csv", "w", newline="", encoding="utf-8-sig") as f:
    w = csv.DictWriter(f, fieldnames=cols, delimiter=";")
    w.writeheader()
    w.writerows(rows)

from collections import Counter
print(len(rows), "Zeilen")
print("robots nachher:", Counter("noindex" if "noindex" in r["robots_nachher"] else "index" for r in rows))
print("Empfehlungen:", Counter(r["empfehlung"] for r in rows).most_common(8))
