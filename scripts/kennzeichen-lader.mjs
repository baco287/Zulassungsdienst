/**
 * Lädt die TypeScript-Module unter lib/ für Node-Skripte (Tests, Prüfungen) –
 * ohne zusätzliche Abhängigkeit: Der TypeScript-Compiler aus den devDependencies
 * übersetzt lib/**\/*.ts in einen Temp-Ordner, `@/…`-Importe und JSON-Dateien
 * werden auf das Projekt umgebogen.
 *
 *   import { lade } from "./kennzeichen-lader.mjs";
 *   const { pruefe } = lade("lib/kennzeichen/regeln");
 */
import { createRequire } from "node:module";
import { mkdtempSync, mkdirSync, readdirSync, readFileSync, realpathSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const ts = require("typescript");
const Module = require("node:module");

export const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
// realpath: Unter macOS ist der Temp-Ordner ein Symlink; Node meldet Module mit dem echten Pfad.
const OUT = realpathSync(mkdtempSync(join(tmpdir(), "kzp-lib-")));

function* dateien(dir) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) yield* dateien(p);
    else if (name.endsWith(".ts") && !name.endsWith(".d.ts")) yield p;
  }
}

for (const quelle of dateien(join(ROOT, "lib"))) {
  const ziel = join(OUT, relative(ROOT, quelle)).replace(/\.ts$/, ".js");
  mkdirSync(dirname(ziel), { recursive: true });
  const { outputText } = ts.transpileModule(readFileSync(quelle, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true, resolveJsonModule: true },
    fileName: quelle,
  });
  writeFileSync(ziel, outputText);
}

const original = Module._resolveFilename;
Module._resolveFilename = function (anfrage, eltern, ...rest) {
  if (anfrage.startsWith("@/")) {
    const pfad = anfrage.slice(2);
    return anfrage.endsWith(".json") ? join(ROOT, pfad) : original.call(this, join(OUT, pfad), eltern, ...rest);
  }
  if (anfrage.startsWith(".") && anfrage.endsWith(".json") && eltern?.filename?.startsWith(OUT)) {
    return join(ROOT, relative(OUT, dirname(eltern.filename)), anfrage);
  }
  return original.call(this, anfrage, eltern, ...rest);
};

/** Lädt ein Modul unter lib/, z. B. lade("lib/kennzeichen/generator"). */
export function lade(pfad) {
  return require(join(OUT, pfad));
}
