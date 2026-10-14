import { formatEuro, formatNumero } from "@finbeacon/engine";

/**
 * I conti degli esempi nelle guide che il motore non fa: EBITDA, cash flow,
 * margini, liquidità, giorni di incasso. Chi scrive una guida dà solo gli
 * IMPORTI di partenza (inventati, dichiaratamente); somme e rapporti li fa
 * questo modulo al build. Così vale anche qui la regola 3 di REDAZIONE.md:
 * nessun numero calcolato scritto a mano, quindi nessun conto sbagliato.
 *
 * Un dato non valido ferma il build: un esempio sbagliato in una guida firmata
 * è peggio di una guida che non esce.
 */

export type RigaConto = readonly [voce: string, importo: number];

function verificaImporto(dove: string, voce: string, importo: unknown): number {
  if (typeof importo !== "number" || !Number.isFinite(importo)) {
    throw new Error(`[guide] ${dove}: l'importo di «${voce}» non è un numero (${String(importo)})`);
  }
  return importo;
}

export interface ContoCalcolato {
  righe: { voce: string; importo: string; negativo: boolean }[];
  totale: string;
  totaleNegativo: boolean;
}

/** Somma le righe di un conto (i costi si scrivono negativi) e formatta in euro. */
export function calcolaConto(righe: readonly RigaConto[]): ContoCalcolato {
  if (!Array.isArray(righe) || righe.length < 2) {
    throw new Error("[guide] <Conto>: servono almeno due righe");
  }
  let somma = 0;
  const formattate = righe.map(([voce, importo]) => {
    const n = verificaImporto("<Conto>", voce, importo);
    somma += n;
    return { voce, importo: formatEuro(n), negativo: n < 0 };
  });
  // Arrotonda all'euro prima di formattare: niente «-0 €» da somme di decimali.
  const totale = Math.round(somma) === 0 ? 0 : Math.round(somma);
  return { righe: formattate, totale: formatEuro(totale), totaleNegativo: totale < 0 };
}

export type FormatoRapporto = "%" | "x" | "giorni";

/**
 * Un rapporto fra due importi: «%» per i margini, «x» per i quozienti (current
 * ratio, copertura degli interessi), «giorni» per i giorni medi (num/den × 365).
 * Con denominatore zero il risultato non esiste: «n.d.», mai un infinito.
 */
export function calcolaRapporto(num: number, den: number, formato: FormatoRapporto): string {
  verificaImporto("<Rapporto>", "numeratore", num);
  verificaImporto("<Rapporto>", "denominatore", den);
  if (den === 0) return "n.d.";
  const r = num / den;
  if (formato === "%") return `${formatNumero(r * 100, 1)}%`;
  if (formato === "x") return formatNumero(r, 2);
  if (formato === "giorni") return `${formatNumero(r * 365, 0)} giorni`;
  throw new Error(`[guide] <Rapporto>: formato «${String(formato)}» non previsto (%, x, giorni)`);
}
