/**
 * Controlli di CONTENUTO sulle guide, oltre a quelli di forma che fa già il
 * build (`src/lib/guide.ts`: frontmatter, lunghezze, fonti, doppioni). Le
 * guide si pubblicano per silenzio-assenso: questo è il revisore che c'è
 * sempre, anche quando nessuno apre la PR.
 *
 *   node scripts/verifica-guide.mjs            controlli bloccanti
 *   node scripts/verifica-guide.mjs --rete     in più prova a raggiungere le
 *                                              fonti (solo avviso: la rete in
 *                                              CI è instabile)
 *
 * Le regole stanno in `content/REDAZIONE.md`; qui c'è solo ciò che una
 * macchina può controllare senza sbagliare.
 */
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

import matter from "gray-matter";

const CARTELLA = join(import.meta.dirname, "..", "content", "guide");

/*
 * Promesse e assoluti vietati (REDAZIONE.md, regola 6). Cercati senza
 * distinzione di maiuscole, su parole intere: «garantito» sì, «garantire la
 * continuità aziendale» (dove è la norma a dirlo) no.
 */
const VIETATE = [
  "garantito",
  "garantita",
  "garantiti",
  "garantiamo",
  "elimina il rischio",
  "zero rischi",
  "evita la crisi",
  "evitare la crisi",
  "a norma di legge",
  "certificato dal",
  "100% sicuro",
  "senza alcun rischio",
];

/* Formule di riempimento che la linea editoriale toglie (solo avviso). */
const RIEMPITIVI = [
  "è fondamentale",
  "è cruciale",
  "è importante notare",
  "in conclusione",
  "nel mondo di oggi",
];

const errori = [];
const avvisi = [];

function controlla(nome, testo) {
  const { data, content } = matter(testo);
  const corpo = content.toLowerCase();

  // Almeno un collegamento interno: `](/…)` nel Markdown o `href="/…"`.
  if (!/\]\(\/[^)]*\)|href="\/[^"]*"/.test(content))
    errori.push(`${nome}: nessun collegamento interno (un'altra guida, la home, lo strumento)`);

  for (const v of VIETATE) {
    const re = new RegExp(
      `(^|[^\\p{L}])${v.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}([^\\p{L}]|$)`,
      "iu",
    );
    if (
      re.test(corpo) ||
      re.test(String(data.titolo ?? "")) ||
      re.test(String(data.descrizione ?? ""))
    )
      errori.push(`${nome}: espressione vietata «${v}» (REDAZIONE.md, regola 6)`);
  }
  for (const r of RIEMPITIVI)
    if (corpo.includes(r)) avvisi.push(`${nome}: formula di riempimento «${r}»`);

  // Almeno tre sezioni, se no il sommario non compare e la guida è un paragrafo lungo.
  const sezioni = content.split("\n").filter((r) => /^##\s/.test(r)).length;
  if (sezioni < 3) errori.push(`${nome}: ${sezioni} sezioni «##», ne servono almeno 3`);

  // Numeri calcolati: si passa dai componenti. Un «= 1,23» scritto a mano è quasi sempre un conto.
  const contoAMano = content.match(/=\s*\d+[.,]\d+\s*(%|anni)?/g);
  if (contoAMano)
    errori.push(
      `${nome}: risultato scritto a mano (${contoAMano.join(", ")}): usa <Formula> o <EsempioDscr>`,
    );

  return Array.isArray(data.fonti) ? data.fonti.map((f) => f.url).filter(Boolean) : [];
}

const file = existsSync(CARTELLA) ? readdirSync(CARTELLA).filter((f) => /\.mdx?$/.test(f)) : [];
const fonti = [];
for (const f of file) fonti.push(...controlla(f, readFileSync(join(CARTELLA, f), "utf8")));

if (process.argv.includes("--rete")) {
  for (const url of [...new Set(fonti)]) {
    try {
      const r = await fetch(url, {
        method: "GET",
        redirect: "follow",
        signal: AbortSignal.timeout(10_000),
      });
      if (!r.ok) avvisi.push(`fonte che risponde ${r.status}: ${url}`);
    } catch (e) {
      avvisi.push(`fonte non raggiungibile (${e.name}): ${url}`);
    }
  }
}

for (const a of avvisi) console.warn(`[verifica-guide] avviso: ${a}`);
if (errori.length > 0) {
  for (const e of errori) console.error(`[verifica-guide] ERRORE: ${e}`);
  process.exit(1);
}
console.log(`[verifica-guide] OK: ${file.length} guide controllate.`);
