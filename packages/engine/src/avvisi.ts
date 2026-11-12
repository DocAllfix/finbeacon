import { SOGLIE_GIUDIZIO } from "./giudizi";
import { formatNumero } from "./numeri";
import { FASCE_SALUTE, fasciaSalute } from "./sintesi";
import type { Analisi } from "./types";

/**
 * Avvisi per lo studio (NON le segnalazioni dell'organo di controllo dell'art.
 * 25-octies CCII, che sono un atto con conseguenze legali e restano dello
 * studio). Qui ci sono solo le regole, pure: quando aprirne uno, quando
 * chiuderlo, con quali parole. Dove salvarli e a chi mandarli lo decide l'app.
 *
 * Contano i PASSAGGI, non gli stati: un cliente che resta critico non genera un
 * avviso nuovo a ogni salvataggio, e quando rientra l'avviso si chiude da solo.
 * I testi dei giudizi sono quelli del motore (regola 1 di CLAUDE.md).
 */

export type TipoAvviso =
  | "dscr6m-attenzione"
  | "dscr6m-critico"
  | "dscr-critico"
  | "gi-critico"
  | "fascia-peggiorata"
  | "previsionale-scaduto"
  | "bilancio-mancante";

export type GravitaAvviso = "critico" | "attenzione";

export interface AvvisoCalcolato {
  tipo: TipoAvviso;
  gravita: GravitaAvviso;
  titolo: string;
  testo: string;
}

export interface EsitoAvvisi {
  /** Da aprire (se non ce n'è già uno aperto dello stesso tipo) */
  apri: AvvisoCalcolato[];
  /** Tipi da chiudere, se aperti: la condizione non c'è più */
  chiudi: TipoAvviso[];
}

const f2 = (n: number) => formatNumero(n, 2);

const INDICATORI_CRITICI = [
  {
    tipo: "dscr6m-critico",
    giudizio: "dscrPro",
    titolo: "DSCR a 6 mesi critico",
    valore: (a: Analisi) => a.indicatori.dscrProspettico,
    descrivi: (v: number) =>
      `DSCR prospettico a 6 mesi ${v >= 99 ? "senza debito da servire" : f2(v)}, soglia ${f2(SOGLIE_GIUDIZIO.dscr6m.soglia)}`,
  },
  {
    tipo: "dscr-critico",
    giudizio: "dscr",
    titolo: "DSCR dell'esercizio critico",
    valore: (a: Analisi) => a.indicatori.dscr,
    descrivi: (v: number) => `DSCR dell'esercizio ${f2(v)}`,
  },
  {
    tipo: "gi-critico",
    giudizio: "gi",
    titolo: "Indebitamento critico",
    valore: (a: Analisi) => a.indicatori.gi,
    descrivi: (v: number) =>
      v >= 99
        ? "Debito non ripagabile con l'EBITDA attuale"
        : `Grado di indebitamento ${formatNumero(v, 1)} anni`,
  },
] as const satisfies readonly {
  tipo: TipoAvviso;
  giudizio: keyof Analisi["giudizi"];
  titolo: string;
  valore: (a: Analisi) => number | null;
  descrivi: (v: number) => string;
}[];

const rangoFascia = (score: number) =>
  FASCE_SALUTE.findIndex((f) => f.chiave === fasciaSalute(score));

/**
 * Avvisi di passaggio, al salvataggio di un esercizio. `prima` è l'analisi più
 * recente del cliente PRIMA della modifica (null se è il primo esercizio),
 * `dopo` quella più recente DOPO.
 */
export function avvisiDaAnalisi(prima: Analisi | null, dopo: Analisi): EsitoAvvisi {
  const apri: AvvisoCalcolato[] = [];
  const chiudi: TipoAvviso[] = [];

  for (const ind of INDICATORI_CRITICI) {
    const ora = dopo.giudizi[ind.giudizio];
    const eraCritico = prima?.giudizi[ind.giudizio].tone === "critico";
    if (ora.tone !== "critico") {
      chiudi.push(ind.tipo);
      continue;
    }
    if (eraCritico) continue;
    const v = ind.valore(dopo);
    apri.push({
      tipo: ind.tipo,
      gravita: "critico",
      titolo: ind.titolo,
      testo: `${v === null ? ind.titolo : ind.descrivi(v)}. ${ora.testo}`,
    });
  }

  // DSCR a 6 mesi: anche il livello di attenzione (sotto la soglia di 1,10 ma
  // sopra 1), che il critico sostituisce quando la cassa peggiora ancora.
  const pro = dopo.giudizi.dscrPro;
  const v6 = dopo.indicatori.dscrProspettico;
  if (pro.tone === "attenzione") {
    if (prima?.giudizi.dscrPro.tone !== "attenzione" && v6 !== null) {
      apri.push({
        tipo: "dscr6m-attenzione",
        gravita: "attenzione",
        titolo: "DSCR a 6 mesi sotto soglia",
        testo: `${INDICATORI_CRITICI[0].descrivi(v6)}. ${pro.testo}`,
      });
    }
  } else {
    chiudi.push("dscr6m-attenzione");
  }

  const rDopo = rangoFascia(dopo.score);
  const rPrima = prima ? rangoFascia(prima.score) : null;
  if (rPrima !== null && rDopo < rPrima) {
    const fa = fasciaSalute(prima!.score);
    const fd = fasciaSalute(dopo.score);
    apri.push({
      tipo: "fascia-peggiorata",
      gravita: fd === "ristrutturare" || fd === "fragile" ? "critico" : "attenzione",
      titolo: "Punteggio peggiorato",
      testo: `Punteggio da ${prima!.score} (${fa}) a ${dopo.score} (${fd}). ${dopo.sintesi.descrizione}`,
    });
  } else if (rPrima !== null && rDopo > rPrima) {
    chiudi.push("fascia-peggiorata");
  }

  return { apri, chiudi };
}

/** Giorni dopo i quali la previsione a 6 mesi non regge più il DSCR prospettico. */
export const GIORNI_VALIDITA_PREVISIONALE = 90;

/**
 * Il bilancio di un anno si deposita al più tardi a fine luglio dell'anno dopo
 * (approvazione entro 180 giorni, deposito entro 30): dal 1° agosto manca.
 */
export const MESE_GIORNO_BILANCIO_ATTESO = "08-01";

/**
 * Avvisi di tempo, valutati ogni giorno dal servizio della posta. Date in
 * formato AAAA-MM-GG; `oggi` è un parametro per poterlo provare.
 */
export function avvisiDiTempo(input: {
  oggi: string;
  /** Anno dell'esercizio più recente del cliente (null: nessun esercizio) */
  ultimoAnno: number | null;
  /** Giorno dell'ultimo aggiornamento della previsione a 6 mesi (null: assente) */
  previsionaleDel: string | null;
}): EsitoAvvisi {
  const apri: AvvisoCalcolato[] = [];
  const chiudi: TipoAvviso[] = [];
  const { oggi, ultimoAnno, previsionaleDel } = input;

  if (previsionaleDel) {
    const giorni = Math.floor((Date.parse(oggi) - Date.parse(previsionaleDel)) / 86_400_000);
    if (giorni > GIORNI_VALIDITA_PREVISIONALE) {
      const [a, m, g] = previsionaleDel.split("-");
      apri.push({
        tipo: "previsionale-scaduto",
        gravita: "attenzione",
        titolo: "Previsione di cassa da aggiornare",
        testo: `La previsione a 6 mesi è del ${g}/${m}/${a}: ha più di ${GIORNI_VALIDITA_PREVISIONALE} giorni e il DSCR prospettico non descrive più i prossimi sei mesi.`,
      });
    } else {
      chiudi.push("previsionale-scaduto");
    }
  } else {
    chiudi.push("previsionale-scaduto");
  }

  if (ultimoAnno !== null) {
    const annoCorrente = Number(oggi.slice(0, 4));
    const atteso =
      oggi.slice(5) >= MESE_GIORNO_BILANCIO_ATTESO ? annoCorrente - 1 : annoCorrente - 2;
    if (ultimoAnno < atteso) {
      apri.push({
        tipo: "bilancio-mancante",
        gravita: "attenzione",
        titolo: `Manca il bilancio ${atteso}`,
        testo: `L'ultimo esercizio inserito è il ${ultimoAnno}. Il bilancio ${atteso} dovrebbe essere già depositato: importalo per aggiornare l'analisi.`,
      });
    } else {
      chiudi.push("bilancio-mancante");
    }
  }

  return { apri, chiudi };
}
