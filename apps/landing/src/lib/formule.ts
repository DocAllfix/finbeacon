import { analizza, formatEuro, formatNumero, type DatiBilancio } from "@finbeacon/engine";

import { BILANCIO_ESEMPIO, PREVISIONALE_ESEMPIO } from "./esempio";

/**
 * Le formule come si LEGGONO, accanto al conto fatto sui numeri del cliente di
 * esempio. Il testo della formula ricalca `calcolaIndicatori` in
 * `packages/engine/src/indicatori.ts`; l'esito lo calcola il motore, mai questo
 * file (regola 1). La usano il Metodo della home e le guide.
 */
export type ChiaveFormula = "ros" | "turnover" | "roi" | "roe" | "gi" | "dscr" | "dscr6m";

export interface RigaFormula {
  nome: string;
  formula: string;
  conto: string;
  esito: string;
}

const a = analizza(BILANCIO_ESEMPIO, PREVISIONALE_ESEMPIO);
const b: DatiBilancio = BILANCIO_ESEMPIO;
const p = PREVISIONALE_ESEMPIO;
const i = a.indicatori;

const perc = (v: number | null) => (v === null ? "n.d." : `${formatNumero(v, 1)}%`);
const rapporto = (v: number | null) => (v === null ? "n.d." : v >= 99 ? "∞" : formatNumero(v, 2));

export const FORMULE: Record<ChiaveFormula, RigaFormula> = {
  ros: {
    nome: "ROS",
    formula: "RO / Valore della produzione",
    conto: `${formatEuro(b.ro)} / ${formatEuro(b.valProd)}`,
    esito: perc(i.ros),
  },
  turnover: {
    nome: "Turnover",
    formula: "Fatturato / Capitale investito",
    conto: `${formatEuro(b.fatturato)} / ${formatEuro(b.capInvest)}`,
    esito: rapporto(i.turnover),
  },
  roi: {
    nome: "ROI",
    formula: "RO / Capitale investito",
    conto: `${formatEuro(b.ro)} / ${formatEuro(b.capInvest)}`,
    esito: perc(i.roi),
  },
  roe: {
    nome: "ROE",
    formula: "Utile netto / Patrimonio netto",
    conto: `${formatEuro(b.utileNetto)} / ${formatEuro(b.patrNetto)}`,
    esito: perc(i.roe),
  },
  gi: {
    nome: "GI",
    formula: "PFN / EBITDA",
    conto: `${formatEuro(b.pfn)} / ${formatEuro(b.ebitda)}`,
    esito: i.gi === null ? "n.d." : i.gi >= 99 ? "non ripagabile" : `${formatNumero(i.gi, 1)} anni`,
  },
  dscr: {
    nome: "DSCR",
    formula: "Flusso di cassa / Servizio del debito",
    conto: `${formatEuro(b.flussoCassa)} / ${formatEuro(b.servizioDebito)}`,
    esito: rapporto(i.dscr),
  },
  dscr6m: {
    nome: "DSCR prospettico",
    formula: "(Liquidità iniziale + Entrate − Uscite) / Debito a 6 mesi",
    conto: `(${formatEuro(p.liquiditaIniziale)} + ${formatEuro(p.entrate6m)} − ${formatEuro(p.uscite6m)}) / ${formatEuro(p.debito6m)}`,
    esito: rapporto(i.dscrProspettico),
  },
};
