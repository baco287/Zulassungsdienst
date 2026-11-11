"""SEO-Crawl von deutschezulassung.de (oder einem lokalen Build).

Liest die Sitemap, ruft jede URL ab und schreibt ein URL-Inventar mit
Statuscode, Title, Description, H1, Canonical, Robots, JSON-LD-Typen,
internen Links, Bildern ohne Alt-Text, Preis- und Zeitangaben sowie
eingehenden internen Links (für verwaiste Seiten).

Aufruf:
  python scripts/seo-crawl.py                      # Live-Seite
  python scripts/seo-crawl.py --base http://localhost:3000 --out tmp/
"""
from __future__ import annotations

import argparse
import csv
import hashlib
import html
import json
import re
import sys
import urllib.request
from collections import Counter, defaultdict
from concurrent.futures import ThreadPoolExecutor
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urljoin, urlparse

SITE = "https://deutschezulassung.de"
UA = "DeutscheZulassung-SEO-Audit/1.0"
PRICE_RE = re.compile(r"(\d{1,3}(?:\.\d{3})*,\d{2})\s?€")
TIME_RE = re.compile(
    r"(\d+\s?(?:–|-|bis)\s?\d+\s?Werktage?n?|\d+\s?Werktage?n?|taggleich|"
    r"am selben (?:Werk)?tag|\d+\s?Minuten|zwei Minuten|zehn Minuten|innerhalb von \d+ Stunden)",
    re.I,
)


class PageParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.title = ""
        self._in_title = False
        self.meta: dict[str, str] = {}
        self.canonical = ""
        self.h1: list[str] = []
        self._h1_depth = 0
        self._h1_buf: list[str] = []
        self.links: list[str] = []
        self.imgs_no_alt = 0
        self.imgs = 0
        self.jsonld: list[str] = []
        self._in_jsonld = False
        self._jsonld_buf: list[str] = []
        self._skip = 0
        self.text: list[str] = []
        self.lang = ""

    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        if tag == "html":
            self.lang = a.get("lang", "")
        if tag == "title":
            self._in_title = True
        elif tag == "meta":
            key = a.get("name") or a.get("property")
            if key:
                self.meta[key.lower()] = a.get("content", "")
        elif tag == "link" and a.get("rel") == "canonical":
            self.canonical = a.get("href", "")
        elif tag == "h1":
            self._h1_depth += 1
            self._h1_buf = []
        elif tag == "a" and a.get("href"):
            self.links.append(a["href"])
        elif tag == "img":
            self.imgs += 1
            if a.get("alt") is None:
                self.imgs_no_alt += 1
        elif tag == "script":
            if a.get("type") == "application/ld+json":
                self._in_jsonld = True
                self._jsonld_buf = []
            else:
                self._skip += 1
        elif tag in ("style", "noscript"):
            self._skip += 1

    def handle_endtag(self, tag):
        if tag == "title":
            self._in_title = False
        elif tag == "h1" and self._h1_depth:
            self._h1_depth -= 1
            self.h1.append(re.sub(r"\s+", " ", "".join(self._h1_buf)).strip())
        elif tag == "script":
            if self._in_jsonld:
                self._in_jsonld = False
                self.jsonld.append("".join(self._jsonld_buf))
            elif self._skip:
                self._skip -= 1
        elif tag in ("style", "noscript") and self._skip:
            self._skip -= 1

    def handle_data(self, data):
        if self._in_title:
            self.title += data
        if self._in_jsonld:
            self._jsonld_buf.append(data)
            return
        if self._skip:
            return
        if self._h1_depth:
            self._h1_buf.append(data)
        self.text.append(data)


def fetch(url: str) -> tuple[int, str, str]:
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            return r.status, r.geturl(), r.read().decode("utf-8", "replace")
    except urllib.error.HTTPError as e:
        return e.code, url, ""
    except Exception as e:  # noqa: BLE001
        return 0, url, str(e)


def jsonld_types(blocks: list[str]) -> tuple[list[str], int]:
    types, errors = [], 0
    for b in blocks:
        try:
            data = json.loads(b)
        except json.JSONDecodeError:
            errors += 1
            continue
        stack = [data]
        while stack:
            node = stack.pop()
            if isinstance(node, dict):
                t = node.get("@type")
                if isinstance(t, str):
                    types.append(t)
                elif isinstance(t, list):
                    types.extend(t)
                stack.extend(node.values())
            elif isinstance(node, list):
                stack.extend(node)
    return sorted(set(types)), errors


def page_type(path: str) -> str:
    parts = [p for p in path.split("/") if p]
    if not parts:
        return "startseite"
    head = parts[0]
    mapping = {
        "leistungen": "leistung",
        "kfz-zulassung": "stadt",
        "zulassungsstelle": "behoerde",
        "kennzeichen": "kennzeichen",
        "ratgeber": "ratgeber",
        "gewerbe": "gewerbe",
        "rechner": "tool",
        "vorlagen": "vorlage",
    }
    if head in mapping:
        return mapping[head] + ("-uebersicht" if len(parts) == 1 else "")
    return "seite"


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--base", default=SITE, help="Basis-URL zum Abrufen")
    ap.add_argument("--out", default="docs/seo", help="Ausgabeordner")
    ap.add_argument("--workers", type=int, default=8)
    args = ap.parse_args()
    base = args.base.rstrip("/")
    out = Path(args.out)
    out.mkdir(parents=True, exist_ok=True)

    status, _, sm = fetch(f"{base}/sitemap.xml")
    if status != 200:
        sys.exit(f"Sitemap nicht abrufbar ({status})")
    urls = [html.unescape(u) for u in re.findall(r"<loc>(.*?)</loc>", sm)]
    paths = [urlparse(u).path for u in urls]
    print(f"{len(paths)} URLs in der Sitemap", file=sys.stderr)

    def crawl(path: str) -> dict:
        st, final, body = fetch(f"{base}{path}")
        p = PageParser()
        if body and st == 200:
            p.feed(body)
        text = re.sub(r"\s+", " ", " ".join(p.text)).strip()
        types, ld_err = jsonld_types(p.jsonld)
        internal = set()
        for href in p.links:
            u = urlparse(urljoin(f"{SITE}{path}", href))
            if u.scheme in ("http", "https") and u.netloc in ("", "deutschezulassung.de", "www.deutschezulassung.de"):
                if not re.search(r"\.(pdf|png|jpe?g|webp|svg|txt|xml)$", u.path):
                    internal.add(u.path if u.path.endswith("/") else u.path + "/")
        norm = re.sub(r"\d", "0", text.lower())
        return {
            "path": path,
            "type": page_type(path),
            "status": st,
            "redirected": urlparse(final).path != path,
            "title": p.title.strip(),
            "title_len": len(p.title.strip()),
            "description": p.meta.get("description", ""),
            "desc_len": len(p.meta.get("description", "")),
            "h1_count": len(p.h1),
            "h1": " | ".join(p.h1),
            "canonical": p.canonical,
            "canonical_ok": p.canonical in (f"{SITE}{path}", f"{base}{path}"),
            "robots": p.meta.get("robots", ""),
            "og_url": p.meta.get("og:url", ""),
            "lang": p.lang,
            "words": len(text.split()),
            "jsonld_types": ";".join(types),
            "jsonld_errors": ld_err,
            "internal_links_out": len(internal),
            "imgs": p.imgs,
            "imgs_no_alt": p.imgs_no_alt,
            "prices": ";".join(sorted(set(PRICE_RE.findall(text)))),
            "times": ";".join(sorted({m.lower() for m in TIME_RE.findall(text)})),
            "text_hash": hashlib.md5(norm.encode()).hexdigest()[:12],
            "_links": sorted(internal),
            "_text": text,
        }

    with ThreadPoolExecutor(args.workers) as ex:
        rows = list(ex.map(crawl, paths))

    inlinks: Counter[str] = Counter()
    for r in rows:
        for link in r["_links"]:
            if link != r["path"]:
                inlinks[link] += 1
    known = set(paths)
    broken = defaultdict(list)
    for r in rows:
        r["inlinks"] = inlinks[r["path"]]
        for link in r["_links"]:
            if link not in known and not link.startswith(("/api/", "/downloads/")):
                broken[link].append(r["path"])

    # Beinahe-Duplikate: Text nach Entfernen der seitentypischen Eigennamen
    shingles: dict[str, set[int]] = {}
    for r in rows:
        words = re.sub(r"[^a-zäöüß ]", " ", r["_text"].lower()).split()
        shingles[r["path"]] = {hash(" ".join(words[i : i + 5])) for i in range(max(0, len(words) - 4))}
    by_type = defaultdict(list)
    for r in rows:
        by_type[r["type"]].append(r["path"])
    for r in rows:
        peers = by_type[r["type"]]
        best, best_path = 0.0, ""
        a = shingles[r["path"]]
        for other in peers:
            if other == r["path"] or not a:
                continue
            b = shingles[other]
            sim = len(a & b) / len(a | b) if (a | b) else 0
            if sim > best:
                best, best_path = sim, other
        r["max_similarity"] = round(best, 2)
        r["most_similar"] = best_path

    cols = [
        "path", "type", "status", "redirected", "title", "title_len", "description", "desc_len",
        "h1_count", "h1", "canonical_ok", "canonical", "robots", "og_url", "lang", "words",
        "jsonld_types", "jsonld_errors", "internal_links_out", "inlinks", "imgs", "imgs_no_alt",
        "prices", "times", "max_similarity", "most_similar",
    ]
    with open(out / "url-inventory.csv", "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=cols, extrasaction="ignore", delimiter=";")
        w.writeheader()
        w.writerows(sorted(rows, key=lambda r: (r["type"], r["path"])))

    summary = {
        "urls": len(rows),
        "status": Counter(r["status"] for r in rows),
        "types": Counter(r["type"] for r in rows),
        "broken_internal_links": {k: v[:5] for k, v in broken.items()},
        "no_inlinks": [r["path"] for r in rows if r["inlinks"] == 0 and r["path"] != "/"],
        "h1_not_1": [r["path"] for r in rows if r["h1_count"] != 1],
        "canonical_wrong": [r["path"] for r in rows if not r["canonical_ok"]],
        "noindex": [r["path"] for r in rows if "noindex" in r["robots"]],
        "title_dupes": {t: c for t, c in Counter(r["title"] for r in rows).items() if c > 1},
        "desc_dupes": {t: c for t, c in Counter(r["description"] for r in rows).items() if c > 1},
        "title_over_60": sum(r["title_len"] > 60 for r in rows),
        "desc_over_160": sum(r["desc_len"] > 160 for r in rows),
        "desc_under_70": sum(r["desc_len"] < 70 for r in rows),
        "jsonld_errors": [r["path"] for r in rows if r["jsonld_errors"]],
        "imgs_no_alt": [r["path"] for r in rows if r["imgs_no_alt"]],
        "all_prices": Counter(p for r in rows for p in r["prices"].split(";") if p),
        "all_times": Counter(t for r in rows for t in r["times"].split(";") if t),
        "similarity_by_type": {
            t: {
                "pages": len(ps),
                "avg_max_sim": round(sum(r["max_similarity"] for r in rows if r["type"] == t) / len(ps), 2),
                "over_0.8": sum(1 for r in rows if r["type"] == t and r["max_similarity"] > 0.8),
                "avg_words": round(sum(r["words"] for r in rows if r["type"] == t) / len(ps)),
            }
            for t, ps in by_type.items()
        },
    }
    (out / "crawl-summary.json").write_text(
        json.dumps(summary, ensure_ascii=False, indent=1, default=dict), encoding="utf-8"
    )
    print(json.dumps({k: (v if not isinstance(v, (list, dict)) or len(v) < 15 else f"{len(v)} Einträge")
                      for k, v in summary.items()}, ensure_ascii=False, indent=1, default=dict))


if __name__ == "__main__":
    main()
