import { describe, expect, it } from "vitest";

import { calcolaConto, calcolaRapporto } from "./calcolo";

/** Lo spazio fra cifra ed euro di Intl è uno spazio non separabile: lo si normalizza. */
const piano = (s: string) => s.replace(/\s/g, " ");

describe("calcolaConto", () => {
  it("somma ricavi e costi e formatta in euro", () => {
    const c = calcolaConto([
      ["Valore della produzione", 4_200_000],
      ["Costi della produzione (senza ammortamenti)", -3_720_000],
    ]);
    expect(piano(c.totale)).toBe("480.000 €");
    expect(c.totaleNegativo).toBe(false);
    expect(c.righe[1]!.negativo).toBe(true);
  });

  it("segnala un totale negativo", () => {
    const c = calcolaConto([
      ["Ricavi", 100_000],
      ["Costi", -130_000],
    ]);
    expect(c.totaleNegativo).toBe(true);
    expect(piano(c.totale)).toBe("-30.000 €");
  });

  it("non scrive mai «-0 €»", () => {
    expect(
      piano(
        calcolaConto([
          ["A", 0.2],
          ["B", -0.4],
        ]).totale,
      ),
    ).toBe("0 €");
  });

  it("ferma il build con meno di due righe o un importo non numerico", () => {
    expect(() => calcolaConto([["Solo", 1]])).toThrow(/almeno due righe/);
    expect(() =>
      calcolaConto([
        ["A", 1],
        ["B", Number.NaN],
      ]),
    ).toThrow(/non è un numero/);
    // Un importo scritto come testo nel Markdown: il tipo non lo ferma, il controllo sì.
    const testo = "100" as unknown as number;
    expect(() =>
      calcolaConto([
        ["A", 1],
        ["B", testo],
      ]),
    ).toThrow(/non è un numero/);
  });
});

describe("calcolaRapporto", () => {
  it("margine in percentuale", () => {
    expect(calcolaRapporto(480_000, 4_200_000, "%")).toBe("11,4%");
  });

  it("quoziente a due decimali", () => {
    expect(calcolaRapporto(1_300_000, 1_000_000, "x")).toBe("1,30");
  });

  it("giorni medi su 365", () => {
    expect(calcolaRapporto(600_000, 3_650_000, "giorni")).toBe("60 giorni");
  });

  it("denominatore zero: n.d., mai infinito", () => {
    expect(calcolaRapporto(10, 0, "x")).toBe("n.d.");
  });

  it("formato sconosciuto ferma il build", () => {
    // @ts-expect-error: formato non previsto
    expect(() => calcolaRapporto(1, 2, "euro")).toThrow(/non previsto/);
  });
});
