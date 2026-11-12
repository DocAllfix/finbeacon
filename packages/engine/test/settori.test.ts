import { describe, expect, it } from "vitest";

import {
  ANNO_ISTAT,
  cifreAteco,
  confrontaConSettore,
  margineEbitda,
  posizioneInPortafoglio,
  riferimentoSettore,
} from "../src/settori";
import { SETTORI_ISTAT } from "../src/settori/dati-istat";
import type { DatiSettoriIstat } from "../src/settori/tipi";

/** Un settore finto, per provare i ripieghi senza dipendere dai numeri ISTAT. */
const FINTI: DatiSettoriIstat = {
  "25": {
    nome: "metallo",
    tutte: [1000, 120],
    micro: [100, 10],
    piccola: [300, 45],
    media: null,
    grande: null,
  },
  "256": {
    nome: "trattamento",
    tutte: [500, 75],
    micro: null,
    piccola: null,
    media: null,
    grande: null,
  },
  "2562": {
    nome: "lavori di meccanica generale",
    tutte: [400, 68],
    micro: [50, 6],
    piccola: null,
    media: [150, 21],
    grande: null,
  },
};

describe("riferimento di settore", () => {
  it("normalizza i codici ATECO comunque scritti", () => {
    expect(cifreAteco("25.62.00")).toBe("256200");
    expect(cifreAteco(" 2562 ")).toBe("2562");
    expect(cifreAteco("abc")).toBeNull();
    expect(cifreAteco(null)).toBeNull();
  });

  it("classe del cliente, se il dato c'è", () => {
    const r = riferimentoSettore("25.62.00", "media", FINTI, 2024)!;
    expect(r).toMatchObject({ codice: "25.62", classe: "media", anno: 2024 });
    expect(r.margine).toBeCloseTo(14);
  });

  it("cella riservata: stesso settore, tutte le dimensioni, prima di salire di livello", () => {
    const r = riferimentoSettore("2562", "piccola", FINTI, 2024)!;
    expect(r).toMatchObject({ codice: "25.62", classe: "tutte" });
    expect(r.margine).toBeCloseTo(17);
  });

  it("codice assente a 4 cifre: si sale al gruppo, poi alla divisione", () => {
    expect(riferimentoSettore("25.69", "micro", FINTI, 2024)).toMatchObject({
      codice: "25.6",
      classe: "tutte",
    });
    expect(riferimentoSettore("25.11", "piccola", FINTI, 2024)).toMatchObject({
      codice: "25",
      classe: "piccola",
    });
    expect(riferimentoSettore("99.99", "micro", FINTI, 2024)).toBeNull();
  });

  it("senza dimensione si usa il totale del settore", () => {
    expect(riferimentoSettore("2562", null, FINTI, 2024)).toMatchObject({ classe: "tutte" });
  });

  it("il dataset vero: anno, dimensione e un settore noto", () => {
    expect(ANNO_ISTAT).toBeGreaterThanOrEqual(2023);
    expect(Object.keys(SETTORI_ISTAT).length).toBeGreaterThan(500);
    // officine meccaniche: settore presente con nome e margine plausibile
    const r = riferimentoSettore("25.62.00", "piccola")!;
    expect(r.codice).toBe("25.62");
    expect(r.nome).toMatch(/meccanica/i);
    expect(r.margine).toBeGreaterThan(5);
    expect(r.margine).toBeLessThan(35);
    // ogni coppia ha fatturato positivo
    for (const s of Object.values(SETTORI_ISTAT)) {
      for (const k of ["tutte", "micro", "piccola", "media", "grande"] as const) {
        const c = s[k];
        if (c) expect(c[0]).toBeGreaterThan(0);
      }
    }
  });
});

describe("confronto", () => {
  const rif = riferimentoSettore("2562", "media", FINTI, 2024)!; // 14%

  it("margine EBITDA del cliente, null senza fatturato", () => {
    expect(margineEbitda({ ebitda: 120, fatturato: 1000 })).toBeCloseTo(12);
    expect(margineEbitda({ ebitda: 120, fatturato: 0 })).toBeNull();
  });

  it("sotto, in linea, sopra con la banda di 2 punti", () => {
    expect(confrontaConSettore(10, rif).posizione).toBe("sotto");
    expect(confrontaConSettore(12.5, rif).posizione).toBe("in-linea");
    expect(confrontaConSettore(16, rif).posizione).toBe("in-linea");
    expect(confrontaConSettore(16.5, rif).posizione).toBe("sopra");
  });

  it("il testo dice la fonte, l'anno e il settore usato", () => {
    expect(confrontaConSettore(10, rif).testo).toBe(
      "Margine EBITDA 10,0%, 4,0 punti sotto il settore: le imprese italiane del codice 25.62 da 50 a 249 addetti hanno un MOL pari al 14,0% del fatturato (ISTAT, 2024).",
    );
  });
});

describe("posizione nel portafoglio", () => {
  it("almeno 5 clienti nello stesso settore, altrimenti niente", () => {
    expect(posizioneInPortafoglio(10, [1, 2, 3])).toBeNull();
    expect(posizioneInPortafoglio(10, [5, 8, 12, 20])).toEqual({ quanti: 5, sotto: 2 });
  });
});
