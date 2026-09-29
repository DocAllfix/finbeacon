import { describe, expect, it } from "vitest";

import { leggiGuida, oggiARoma, sezioniDi, verificaInsieme, visibili, type Guida } from "./guide";

/**
 * Le guide si pubblicano da sole (redazione automatica, silenzio-assenso):
 * quello che qui passa, esce. Quindi si prova soprattutto che il cancello
 * SAPPIA DIRE NO.
 */

function frontmatter(extra: Record<string, unknown> = {}): string {
  const base: Record<string, unknown> = {
    titolo: "DSCR prospettico: come si legge il dato a sei mesi",
    descrizione:
      "Cos'è il DSCR prospettico a sei mesi, come si calcola dal budget di tesoreria e come leggerlo accanto agli altri indicatori del cliente.",
    data: "2026-10-05",
    autore: "alessandro-di-lonardo",
    argomento: "crisi",
    parolaChiave: "dscr prospettico",
    fonti: [
      { titolo: "Fonte uno", url: "https://esempio.it/uno" },
      { titolo: "Fonte due", url: "https://esempio.it/due" },
    ],
    ...extra,
  };
  const yaml = Object.entries(base)
    .filter(([, v]) => v !== undefined)
    .map(([k, v]) => `${k}: ${JSON.stringify(v)}`)
    .join("\n");
  return `---\n${yaml}\n---\n\n## Primo\n\nTesto.\n\n### Dentro\n\n## Secondo\n`;
}

describe("una guida", () => {
  it("valida passa e porta slug, sezioni e minuti", () => {
    const g = leggiGuida("dscr-prospettico.mdx", frontmatter());
    expect(g.slug).toBe("dscr-prospettico");
    expect(g.sezioni).toEqual([
      { id: "primo", titolo: "Primo" },
      { id: "secondo", titolo: "Secondo" },
    ]);
    expect(g.minuti).toBeGreaterThanOrEqual(1);
    expect(g.bozza).toBe(false);
  });

  it("la data scritta senza virgolette (un Date per YAML) è accettata", () => {
    const testo = frontmatter().replace('data: "2026-10-05"', "data: 2026-10-05");
    expect(leggiGuida("a-b.mdx", testo).data).toBe("2026-10-05");
  });

  it.each([
    ["titolo troppo lungo", { titolo: "x".repeat(66) }],
    ["descrizione troppo corta", { descrizione: "Corta." }],
    ["una fonte sola", { fonti: [{ titolo: "Solo", url: "https://a.it" }] }],
    [
      "fonte non https",
      {
        fonti: [
          { titolo: "Uno", url: "http://a.it" },
          { titolo: "Due", url: "https://b.it" },
        ],
      },
    ],
    ["autore sconosciuto", { autore: "chiunque" }],
    ["argomento sconosciuto", { argomento: "varie" }],
    ["campo non previsto", { copertina: "foto.jpg" }],
    ["data nel formato sbagliato", { data: "05/10/2026" }],
    ["aggiornato prima della data", { aggiornato: "2026-10-01" }],
  ])("rifiuta: %s", (_, extra) => {
    expect(() => leggiGuida("prova.mdx", frontmatter(extra))).toThrow(/prova\.mdx/);
  });

  it("rifiuta un nome di file che non è uno slug", () => {
    expect(() => leggiGuida("DSCR Prospettico.mdx", frontmatter())).toThrow(/minuscolo/);
  });
});

describe("l'insieme delle guide", () => {
  const una = (slug: string, extra: Record<string, unknown> = {}) =>
    leggiGuida(`${slug}.mdx`, frontmatter(extra));

  it("rifiuta due guide sulla stessa parola chiave", () => {
    expect(() =>
      verificaInsieme([una("a"), una("b", { parolaChiave: "DSCR prospettico " })]),
    ).toThrow(/parola chiave/);
  });

  it("rifiuta un correlato che non esiste", () => {
    expect(() => verificaInsieme([una("a", { correlati: ["fantasma"] })])).toThrow(/fantasma/);
  });
});

describe("cosa si pubblica", () => {
  const g = (slug: string, data: string, bozza = false): Guida =>
    leggiGuida(`${slug}.mdx`, frontmatter({ data, bozza, parolaChiave: slug }));
  const tutte = [
    g("ieri", "2026-10-04"),
    g("oggi", "2026-10-05"),
    g("domani", "2026-10-06"),
    g("bozza", "2026-10-01", true),
  ];

  it("in produzione: uscite di oggi o prima, niente bozze, la più recente in cima", () => {
    expect(visibili(tutte, "2026-10-05", true).map((x) => x.slug)).toEqual(["oggi", "ieri"]);
  });

  it("fuori produzione si vede tutto, per rileggere la PR", () => {
    expect(visibili(tutte, "2026-10-05", false)).toHaveLength(4);
  });

  it("«oggi» è quello di Roma: alle 23:30 UTC del 5 a Roma è già il 6", () => {
    expect(oggiARoma(new Date("2026-10-05T23:30:00Z"))).toBe("2026-10-06");
  });
});

describe("le sezioni del sommario", () => {
  it("ignorano i titoli dentro un blocco di codice e danno id come rehype-slug", () => {
    const corpo = "## Uno\n\n```\n## finto\n```\n\n## Uno\n";
    expect(sezioniDi(corpo)).toEqual([
      { id: "uno", titolo: "Uno" },
      { id: "uno-1", titolo: "Uno" },
    ]);
  });
});
