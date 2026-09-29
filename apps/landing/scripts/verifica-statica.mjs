/**
 * Dopo il build: OGNI pagina della landing deve essere pre-renderizzata.
 *
 * La staticità è ciò che tiene basso l'LCP, e si perde in silenzio: basta un
 * `headers()` o un `cookies()` in un componente, o un layout copiato da
 * apps/web (che è dinamico per necessità, GUASTI G-28). Il build non fallisce,
 * la pagina funziona, e diventa solo più lenta. Questo controllo lo rende un
 * errore.
 *
 *   node scripts/verifica-statica.mjs      (dopo `next build`)
 */
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const NEXT = join(import.meta.dirname, "..", ".next");

if (!existsSync(join(NEXT, "prerender-manifest.json"))) {
  console.error(
    "[verifica-statica] manca .next/prerender-manifest.json: esegui prima `next build`.",
  );
  process.exit(2);
}

const prerender = JSON.parse(readFileSync(join(NEXT, "prerender-manifest.json"), "utf8"));
const statiche = new Set(Object.keys(prerender.routes ?? {}));
const rotte = JSON.parse(readFileSync(join(NEXT, "app-path-routes-manifest.json"), "utf8"));

// Le pagine, più le rotte di metadati e di testo che devono uscire dalla CDN.
const attese = new Set(
  Object.entries(rotte)
    .filter(([interno]) => interno.endsWith("/page"))
    .map(([, pubblico]) => pubblico)
    .filter((r) => r !== "/_not-found"),
);
for (const r of [
  "/robots.txt",
  "/sitemap.xml",
  "/manifest.webmanifest",
  "/llms.txt",
  "/opengraph-image",
  "/guide/feed.xml",
]) {
  attese.add(r);
}

/*
 * Una rotta con un segmento dinamico (`/guide/[slug]`) non compare in `routes`
 * col suo nome: ci compaiono le sue istanze. È statica se Next la registra in
 * `dynamicRoutes` con `fallback: false`, cioè esistono solo le pagine generate
 * al build e ogni altro slug è un 404, mai una pagina resa al volo.
 */
const conSegmenti = (r) => r.includes("[");
const staticaConSegmenti = (r) => prerender.dynamicRoutes?.[r]?.fallback === false;
const istanze = (r) => {
  const modello = new RegExp(`^${r.replace(/\[[^\]]+\]/g, "[^/]+")}$`);
  // Escluse le rotte con un nome loro (`/guide/feed.xml` non è una guida).
  return [...statiche].filter((s) => modello.test(s) && !attese.has(s)).length;
};
const eStatica = (r) => (conSegmenti(r) ? staticaConSegmenti(r) : statiche.has(r));

const dinamiche = [...attese].filter((r) => !eStatica(r));

console.log("[verifica-statica] rotte attese statiche:");
for (const r of [...attese].sort())
  console.log(
    `  ${eStatica(r) ? "OK      " : "DINAMICA"}  ${r}${conSegmenti(r) ? `  (${istanze(r)} pagine generate)` : ""}`,
  );

if (dinamiche.length > 0) {
  console.error(
    `\n[verifica-statica] ${dinamiche.length} rotte NON sono pre-renderizzate: ${dinamiche.join(", ")}.\n` +
      "Cerca headers(), cookies(), searchParams letti dal server o `dynamic` nel layout.",
  );
  process.exit(1);
}
console.log("\n[verifica-statica] OK: tutte statiche.");
