import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

import GithubSlugger from "github-slugger";
import matter from "gray-matter";
import { z } from "zod";

import { AUTORI } from "./autori";
import { IN_PRODUZIONE } from "./indirizzo";

/**
 * Le guide: file `.mdx` in `content/guide/`, letti AL BUILD. Nessun database,
 * nessun CMS: un articolo è un file nel repo, passa dalla PR e dalla CI come
 * il codice.
 *
 * Il frontmatter è validato con zod e un errore FERMA il build, con il nome del
 * file: meglio nessuna pubblicazione che una pagina con la descrizione vuota o
 * una fonte mancante. È la stessa filosofia di `verifica-lancio.mjs`.
 *
 * Cosa si pubblica:
 * - in PRODUZIONE solo le guide non in bozza con `data` <= oggi (ora di Roma):
 *   una guida con data futura esce da sola il giorno giusto, al primo build di
 *   quel giorno (il deploy quotidiano di `pubblica-guide.yml`);
 * - FUORI produzione (anteprime di Vercel, CI, sviluppo) tutto, bozze e date
 *   future comprese: è lì che si rilegge una PR prima che esca. Le anteprime
 *   sono comunque noindex.
 */

export const CARTELLA_GUIDE = join(process.cwd(), "content", "guide");

export const ARGOMENTI = {
  crisi: "Codice della crisi",
  indicatori: "Indicatori di bilancio",
  strumenti: "Strumenti",
} as const;
export type Argomento = keyof typeof ARGOMENTI;

// gray-matter trasforma `2026-10-02` senza virgolette in un Date: si riporta a
// stringa prima di validare, così nel file la data si può scrivere in tutti e
// due i modi.
const dataIso = z.preprocess(
  (v) => (v instanceof Date ? v.toISOString().slice(0, 10) : v),
  z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "data nel formato AAAA-MM-GG"),
);

const chiaviAutori = Object.keys(AUTORI) as [keyof typeof AUTORI, ...(keyof typeof AUTORI)[]];
const chiaviArgomenti = Object.keys(ARGOMENTI) as [Argomento, ...Argomento[]];

export const SCHEMA_GUIDA = z
  .object({
    // Oltre 65 caratteri Google tronca il titolo nei risultati.
    titolo: z.string().min(30).max(65),
    // Sotto 110 non si spiega niente, sopra 160 viene tagliata.
    descrizione: z.string().min(110).max(160),
    data: dataIso,
    aggiornato: dataIso.optional(),
    autore: z.enum(chiaviAutori),
    argomento: z.enum(chiaviArgomenti),
    // La ricerca per cui la guida esiste. Unica fra tutte le guide: due pagine
    // sulla stessa ricerca si rubano la posizione a vicenda.
    parolaChiave: z.string().min(3),
    fonti: z
      .array(
        z.object({
          titolo: z.string().min(3),
          url: z.string().url().startsWith("https://", "le fonti vanno in https"),
        }),
      )
      .min(2, "almeno due fonti: su temi di legge non si scrive senza"),
    correlati: z.array(z.string()).default([]),
    bozza: z.boolean().default(false),
  })
  .strict();

export type Frontmatter = z.infer<typeof SCHEMA_GUIDA>;

export interface Guida extends Frontmatter {
  slug: string;
  corpo: string;
  minuti: number;
  sezioni: { id: string; titolo: string }[];
}

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** Gli h2 del corpo, con gli stessi id che darà rehype-slug (stessa libreria). */
export function sezioniDi(corpo: string): { id: string; titolo: string }[] {
  const slugger = new GithubSlugger();
  const out: { id: string; titolo: string }[] = [];
  let recinto = false;
  for (const riga of corpo.split("\n")) {
    if (riga.trimStart().startsWith("```")) recinto = !recinto;
    if (recinto) continue;
    const m = /^(#{2,3})\s+(.+?)\s*#*\s*$/.exec(riga);
    if (!m) continue;
    // Tutti i titoli passano dallo slugger, anche gli h3, perché rehype-slug
    // conta i doppioni su tutti: saltarne uno sfaserebbe gli id.
    const id = slugger.slug(m[2]!);
    if (m[1] === "##") out.push({ id, titolo: m[2]! });
  }
  return out;
}

/** Una guida da testo: valida il frontmatter e calcola il resto. Lancia con il nome del file. */
export function leggiGuida(nomeFile: string, testo: string): Guida {
  const slug = nomeFile.replace(/\.mdx?$/, "");
  if (!SLUG.test(slug))
    throw new Error(`[guide] ${nomeFile}: il nome del file deve essere minuscolo-con-trattini`);
  const { data, content } = matter(testo);
  const esito = SCHEMA_GUIDA.safeParse(data);
  if (!esito.success) {
    const motivi = esito.error.issues
      .map((i) => `${i.path.join(".") || "(radice)"}: ${i.message}`)
      .join("; ");
    throw new Error(`[guide] ${nomeFile}: frontmatter non valido. ${motivi}`);
  }
  const fm = esito.data;
  if (fm.aggiornato && fm.aggiornato < fm.data)
    throw new Error(`[guide] ${nomeFile}: «aggiornato» precede «data»`);
  const parole = content.split(/\s+/).filter(Boolean).length;
  return {
    ...fm,
    slug,
    corpo: content,
    minuti: Math.max(1, Math.round(parole / 200)),
    sezioni: sezioniDi(content),
  };
}

/** I controlli che guardano l'insieme: doppioni e collegamenti fra guide. */
export function verificaInsieme(guide: Guida[]): void {
  const perParola = new Map<string, string>();
  const slugs = new Set(guide.map((g) => g.slug));
  for (const g of guide) {
    const chiave = g.parolaChiave.trim().toLowerCase();
    const altra = perParola.get(chiave);
    if (altra)
      throw new Error(
        `[guide] «${g.parolaChiave}» è la parola chiave sia di ${altra} sia di ${g.slug}`,
      );
    perParola.set(chiave, g.slug);
    for (const c of g.correlati)
      if (!slugs.has(c)) throw new Error(`[guide] ${g.slug}: correlato inesistente «${c}»`);
  }
}

/** Oggi a Roma, AAAA-MM-GG: la data di pubblicazione è italiana, non UTC. */
export function oggiARoma(adesso = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Rome",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(adesso);
}

/** Cosa si vede: in produzione solo le uscite di oggi o prima, mai le bozze. */
export function visibili(guide: Guida[], oggi: string, produzione: boolean): Guida[] {
  return guide
    .filter((g) => !produzione || (!g.bozza && g.data <= oggi))
    .sort((x, y) =>
      x.data === y.data ? x.titolo.localeCompare(y.titolo) : x.data < y.data ? 1 : -1,
    );
}

let cache: Guida[] | null = null;

/** Tutte le guide del repo, validate. Una sola lettura per build. */
export function tutteLeGuide(): Guida[] {
  if (cache) return cache;
  const nomi = existsSync(CARTELLA_GUIDE)
    ? readdirSync(CARTELLA_GUIDE).filter((f) => /\.mdx?$/.test(f))
    : [];
  const guide = nomi.map((f) => leggiGuida(f, readFileSync(join(CARTELLA_GUIDE, f), "utf8")));
  verificaInsieme(guide);
  cache = guide;
  return guide;
}

/** Le guide pubblicate in questo build. */
export function guidePubblicate(): Guida[] {
  return visibili(tutteLeGuide(), oggiARoma(), IN_PRODUZIONE);
}

export function guidaPubblicata(slug: string): Guida | undefined {
  return guidePubblicate().find((g) => g.slug === slug);
}

/** La data che conta per i motori: l'ultimo aggiornamento, se c'è. */
export function dataModifica(g: Guida): string {
  return g.aggiornato ?? g.data;
}
