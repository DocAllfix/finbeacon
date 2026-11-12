import { describe, expect, it } from "vitest";

import { analizza } from "../src/analizza";
import { avvisiDaAnalisi, avvisiDiTempo, GIORNI_VALIDITA_PREVISIONALE } from "../src/avvisi";
import type { DatiBilancio, DatiPrevisionali6M } from "../src/types";

/** Il cliente d'esempio della landing: punteggio 71, la cassa che si assottiglia. */
const BILANCIO: DatiBilancio = {
  valProd: 4_200_000,
  fatturato: 4_100_000,
  ro: 210_000,
  capInvest: 3_600_000,
  patrNetto: 900_000,
  utileNetto: 60_000,
  ebitda: 480_000,
  pfn: 1_900_000,
  servizioDebito: 420_000,
  flussoCassa: 470_000,
};
const conLiquidita = (liquiditaIniziale: number): DatiPrevisionali6M => ({
  liquiditaIniziale,
  entrate6m: 2_050_000,
  uscite6m: 1_900_000,
  debito6m: 210_000,
});
// DSCR 6M = (L + 150.000) / 210.000
const SANO = analizza(BILANCIO, conLiquidita(148_000)); // 1,42
const ATTENZIONE = analizza(BILANCIO, conLiquidita(71_000)); // 1,05
const CRITICO = analizza(BILANCIO, conLiquidita(47_000)); // 0,94

const tipi = (xs: { tipo: string }[]) => xs.map((x) => x.tipo).sort();

describe("avvisi di passaggio", () => {
  it("le premesse dei dati: tre livelli del DSCR a 6 mesi", () => {
    expect(SANO.giudizi.dscrPro.tone).not.toMatch(/critico|attenzione/);
    expect(ATTENZIONE.giudizi.dscrPro.tone).toBe("attenzione");
    expect(CRITICO.giudizi.dscrPro.tone).toBe("critico");
  });

  it("sotto 1,10 apre l'attenzione, con il testo del motore", () => {
    const e = avvisiDaAnalisi(SANO, ATTENZIONE);
    expect(tipi(e.apri)).toEqual(["dscr6m-attenzione"]);
    expect(e.apri[0]!.testo).toBe(
      `DSCR prospettico a 6 mesi 1,05, soglia 1,10. ${ATTENZIONE.giudizi.dscrPro.testo}`,
    );
    expect(e.apri[0]!.gravita).toBe("attenzione");
  });

  it("sotto 1 il critico sostituisce l'attenzione", () => {
    const e = avvisiDaAnalisi(ATTENZIONE, CRITICO);
    expect(tipi(e.apri)).toEqual(["dscr6m-critico"]);
    expect(e.chiudi).toContain("dscr6m-attenzione");
    expect(e.apri[0]!.testo).toContain("0,94");
    expect(e.apri[0]!.testo).toContain("crisi probabile ex art. 3 CCII");
  });

  it("restare critici non apre un avviso nuovo a ogni salvataggio", () => {
    expect(avvisiDaAnalisi(CRITICO, CRITICO).apri).toEqual([]);
  });

  it("quando la cassa rientra, gli avvisi si chiudono", () => {
    const e = avvisiDaAnalisi(CRITICO, SANO);
    expect(e.apri).toEqual([]);
    expect(e.chiudi).toEqual(expect.arrayContaining(["dscr6m-critico", "dscr6m-attenzione"]));
  });

  it("il primo esercizio già critico avvisa subito", () => {
    expect(tipi(avvisiDaAnalisi(null, CRITICO).apri)).toEqual(["dscr6m-critico"]);
  });

  it("indebitamento e DSCR dell'esercizio critici, con il punteggio che cambia fascia", () => {
    const male = analizza({
      ...BILANCIO,
      ebitda: 100_000,
      flussoCassa: 200_000,
      ro: -50_000,
      utileNetto: -120_000,
    });
    expect(male.giudizi.gi.tone).toBe("critico");
    expect(male.giudizi.dscr.tone).toBe("critico");
    const e = avvisiDaAnalisi(analizza(BILANCIO), male);
    expect(tipi(e.apri)).toEqual(["dscr-critico", "fascia-peggiorata", "gi-critico"]);
    const fascia = e.apri.find((a) => a.tipo === "fascia-peggiorata")!;
    expect(fascia.testo).toMatch(/^Punteggio da \d+ \(\w+\) a \d+ \(\w+\)\./);
  });

  it("un punteggio che migliora di fascia chiude il peggioramento", () => {
    const peggio = analizza({ ...BILANCIO, ro: -50_000, utileNetto: -120_000 });
    expect(avvisiDaAnalisi(peggio, analizza(BILANCIO)).chiudi).toContain("fascia-peggiorata");
  });
});

describe("avvisi di tempo", () => {
  it("previsione più vecchia di 90 giorni", () => {
    const e = avvisiDiTempo({
      oggi: "2026-11-12",
      ultimoAnno: 2025,
      previsionaleDel: "2026-07-01",
    });
    expect(tipi(e.apri)).toEqual(["previsionale-scaduto"]);
    expect(e.apri[0]!.testo).toContain("01/07/2026");
    expect(e.apri[0]!.testo).toContain(String(GIORNI_VALIDITA_PREVISIONALE));
  });

  it("previsione recente o assente: nessun avviso, e quello vecchio si chiude", () => {
    expect(
      avvisiDiTempo({ oggi: "2026-11-12", ultimoAnno: 2025, previsionaleDel: "2026-10-01" }),
    ).toEqual({
      apri: [],
      chiudi: ["previsionale-scaduto", "bilancio-mancante"],
    });
    expect(
      avvisiDiTempo({ oggi: "2026-11-12", ultimoAnno: 2025, previsionaleDel: null }).apri,
    ).toEqual([]);
  });

  it("il bilancio dell'anno prima manca solo dal 1° agosto", () => {
    expect(
      avvisiDiTempo({ oggi: "2026-07-31", ultimoAnno: 2024, previsionaleDel: null }).apri,
    ).toEqual([]);
    const e = avvisiDiTempo({ oggi: "2026-08-01", ultimoAnno: 2024, previsionaleDel: null });
    expect(e.apri[0]).toMatchObject({
      tipo: "bilancio-mancante",
      titolo: "Manca il bilancio 2025",
    });
    expect(
      avvisiDiTempo({ oggi: "2026-08-01", ultimoAnno: 2025, previsionaleDel: null }).apri,
    ).toEqual([]);
  });

  it("un cliente senza esercizi non ha avvisi di bilancio mancante", () => {
    expect(
      avvisiDiTempo({ oggi: "2026-11-12", ultimoAnno: null, previsionaleDel: null }).apri,
    ).toEqual([]);
  });
});
