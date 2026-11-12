import { formatNumero } from "../numeri";
import type { DatiBilancio } from "../types";

import { ANNO_ISTAT, SETTORI_ISTAT } from "./dati-istat";
import type { DatiSettoriIstat, DimensioneImpresa } from "./tipi";

export type { DimensioneImpresa } from "./tipi";
export { ANNO_ISTAT };

/**
 * Confronto di settore: il margine EBITDA del cliente accanto a quello delle
 * imprese italiane dello stesso codice ATECO e della stessa classe di addetti
 * (ISTAT, Risultati economici delle imprese).
 *
 * È INDICATIVO e va detto: il MOL dell'ISTAT è valore aggiunto meno costo del
 * lavoro, l'EBITDA del bilancio civilistico ci somiglia ma non coincide (altri
 * ricavi, oneri diversi); e il riferimento è un aggregato (fatturato e MOL
 * sommati sul settore), non la mediana delle imprese. I codici sono ATECO 2007:
 * un codice ATECO 2025 si confronta per prefisso, e il nome del settore usato
 * è sempre mostrato, così chi legge vede se il confronto è quello giusto.
 *
 * Modulo a sé (`@finbeacon/engine/settori`): il dataset pesa ~150 KB e non
 * deve finire nel bundle del browser con il resto del motore.
 */

export interface RiferimentoSettore {
  /** Codice ATECO usato davvero, a 2, 3 o 4 cifre (es. «25.62») */
  codice: string;
  /** Nome ISTAT del settore usato */
  nome: string;
  /** Classe di addetti del riferimento: quella del cliente, o tutte se riservata */
  classe: DimensioneImpresa | "tutte";
  /** MOL / fatturato del settore, in percentuale */
  margine: number;
  anno: number;
}

export type PosizioneSettore = "sopra" | "in-linea" | "sotto";

export interface ConfrontoSettore {
  riferimento: RiferimentoSettore;
  /** EBITDA / fatturato del cliente, in percentuale */
  margineCliente: number;
  /** margineCliente − margine del settore, in punti percentuali */
  differenza: number;
  posizione: PosizioneSettore;
  testo: string;
}

/** Entro questi punti percentuali il cliente è «in linea» col settore. */
export const BANDA_IN_LINEA = 2;

/** Sotto questo numero di clienti nello stesso settore la posizione non dice nulla. */
export const MINIMO_PORTAFOGLIO = 5;

const ETICHETTA_CLASSE: Record<DimensioneImpresa | "tutte", string> = {
  micro: "fino a 9 addetti",
  piccola: "da 10 a 49 addetti",
  media: "da 50 a 249 addetti",
  grande: "da 250 addetti",
  tutte: "di ogni dimensione",
};

const f1 = (n: number) => formatNumero(n, 1);

/** «25.62.00», «2562», «25.62» → «2562». Null se non è un codice ATECO. */
export function cifreAteco(codice: string | null | undefined): string | null {
  if (!codice) return null;
  const cifre = codice.replace(/[\s.]/g, "");
  return /^\d{2,6}$/.test(cifre) ? cifre : null;
}

const conPunto = (c: string) => (c.length > 2 ? `${c.slice(0, 2)}.${c.slice(2)}` : c);

/**
 * Il riferimento ISTAT più preciso disponibile. Si scende prima di dimensione
 * (stesso settore, tutte le classi) e poi di dettaglio del settore (4 → 3 → 2
 * cifre): il settore conta più della dimensione, e una cella riservata non
 * deve far sparire il confronto.
 */
export function riferimentoSettore(
  ateco: string | null | undefined,
  dimensione: DimensioneImpresa | null | undefined,
  dati: DatiSettoriIstat = SETTORI_ISTAT,
  anno: number = ANNO_ISTAT,
): RiferimentoSettore | null {
  const cifre = cifreAteco(ateco);
  if (!cifre) return null;
  for (const n of [4, 3, 2]) {
    if (cifre.length < n) continue;
    const codice = cifre.slice(0, n);
    const s = dati[codice];
    if (!s) continue;
    for (const classe of dimensione ? [dimensione, "tutte" as const] : ["tutte" as const]) {
      const coppia = s[classe];
      if (!coppia) continue;
      const [fatturato, mol] = coppia;
      return {
        codice: conPunto(codice),
        nome: s.nome,
        classe,
        margine: (mol / fatturato) * 100,
        anno,
      };
    }
  }
  return null;
}

/** EBITDA su fatturato del cliente, in percentuale. Null senza fatturato. */
export function margineEbitda(dati: Pick<DatiBilancio, "ebitda" | "fatturato">): number | null {
  return dati.fatturato > 0 ? (dati.ebitda / dati.fatturato) * 100 : null;
}

export function confrontaConSettore(
  margineCliente: number,
  riferimento: RiferimentoSettore,
): ConfrontoSettore {
  const differenza = margineCliente - riferimento.margine;
  const posizione: PosizioneSettore =
    Math.abs(differenza) <= BANDA_IN_LINEA ? "in-linea" : differenza > 0 ? "sopra" : "sotto";
  const dove =
    posizione === "in-linea"
      ? "in linea con il settore"
      : `${f1(Math.abs(differenza))} punti ${posizione === "sopra" ? "sopra" : "sotto"} il settore`;
  return {
    riferimento,
    margineCliente,
    differenza,
    posizione,
    testo: `Margine EBITDA ${f1(margineCliente)}%, ${dove}: le imprese italiane del codice ${riferimento.codice} ${ETICHETTA_CLASSE[riferimento.classe]} hanno un MOL pari al ${f1(riferimento.margine)}% del fatturato (ISTAT, ${riferimento.anno}).`,
  };
}

export interface PosizionePortafoglio {
  /** Clienti dello studio nello stesso settore, compreso questo */
  quanti: number;
  /** Quanti di questi hanno un margine più basso */
  sotto: number;
}

/**
 * Dove sta il cliente fra quelli dello studio nello stesso settore. Null sotto
 * MINIMO_PORTAFOGLIO: con tre clienti una «classifica» è rumore, e direbbe allo
 * studio qualcosa di troppo preciso su pochissimi casi.
 */
export function posizioneInPortafoglio(
  margineCliente: number,
  altri: number[],
): PosizionePortafoglio | null {
  const quanti = altri.length + 1;
  if (quanti < MINIMO_PORTAFOGLIO) return null;
  return { quanti, sotto: altri.filter((m) => m < margineCliente).length };
}
