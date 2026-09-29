"use client";

import {
  calcolaIndicatori,
  formatEuro,
  formatNumero,
  giudicaDscrProspettico,
  parseNumeroIt,
  SOGLIE_GIUDIZIO,
  type DatiBilancio,
  type DatiPrevisionali6M,
} from "@finbeacon/engine";
import { useId, useState } from "react";

import { PREVISIONALE_ESEMPIO } from "@/lib/esempio";

import { Giudizio, SEGNO_TONO, TESTO_TONO } from "./giudizio";

/**
 * Il DSCR prospettico a sei mesi, calcolato nel browser dal motore di
 * FinBeacon: gli stessi `calcolaIndicatori` e `giudicaDscrProspettico` del
 * prodotto, nessuna formula qui (regola 1). Niente lascia il browser: nessuna
 * richiesta di rete, nessun salvataggio.
 *
 * Si parte dai numeri del cliente di esempio, così l'HTML reso dal server
 * contiene già un risultato vero anche senza JavaScript.
 */

type Campo = keyof DatiPrevisionali6M;

const CAMPI: { chiave: Campo; etichetta: string; aiuto: string; negativo: boolean }[] = [
  {
    chiave: "liquiditaIniziale",
    etichetta: "Liquidità iniziale",
    aiuto: "Cassa e saldi dei conti correnti oggi. Può essere negativa (scoperto).",
    negativo: true,
  },
  {
    chiave: "entrate6m",
    etichetta: "Entrate dei prossimi 6 mesi",
    aiuto: "Incassi previsti dal budget di tesoreria.",
    negativo: false,
  },
  {
    chiave: "uscite6m",
    etichetta: "Uscite dei prossimi 6 mesi",
    aiuto: "Pagamenti previsti, esclusi capitale e interessi dei debiti finanziari.",
    negativo: false,
  },
  {
    chiave: "debito6m",
    etichetta: "Debito da servire nei 6 mesi",
    aiuto: "Rate di capitale e interessi dei debiti finanziari in scadenza.",
    negativo: false,
  },
];

// Il DSCR prospettico non dipende dal bilancio: un bilancio a zero basta a
// chiamare il motore senza inventare numeri.
const BILANCIO_VUOTO: DatiBilancio = {
  valProd: 0,
  fatturato: 0,
  ro: 0,
  capInvest: 0,
  patrNetto: 0,
  utileNetto: 0,
  ebitda: 0,
  pfn: 0,
  servizioDebito: 0,
  flussoCassa: 0,
};

const iniziale = Object.fromEntries(
  CAMPI.map((c) => [c.chiave, formatNumero(PREVISIONALE_ESEMPIO[c.chiave], 0)]),
) as Record<Campo, string>;

/** Righello da 0 a 2: le due soglie del motore cadono a metà, leggibili. */
const MAX_RIGHELLO = 2;
const posizione = (v: number) => `${Math.min(100, Math.max(0, (v / MAX_RIGHELLO) * 100))}%`;

export function CalcolatoreDscr() {
  const [testi, setTesti] = useState<Record<Campo, string>>(iniziale);
  const base = useId();

  const valori = Object.fromEntries(
    CAMPI.map((c) => [c.chiave, parseNumeroIt(testi[c.chiave])]),
  ) as Record<Campo, number | null>;
  const errori = Object.fromEntries(
    CAMPI.map((c) => {
      const v = valori[c.chiave];
      if (v === null) return [c.chiave, "Serve un importo, es. 150.000"];
      if (v < 0 && !c.negativo) return [c.chiave, "Non può essere negativo"];
      return [c.chiave, null];
    }),
  ) as Record<Campo, string | null>;
  const completo = CAMPI.every((c) => errori[c.chiave] === null);

  const prev = completo ? (valori as DatiPrevisionali6M) : null;
  const dscr = prev ? calcolaIndicatori(BILANCIO_VUOTO, prev).dscrProspettico : null;
  const giudizio = giudicaDscrProspettico(dscr);
  const disponibile = prev ? prev.liquiditaIniziale + prev.entrate6m - prev.uscite6m : null;
  const soglia = SOGLIE_GIUDIZIO.dscr6m.soglia;
  const mostrato = dscr === null ? "n.d." : dscr >= 99 ? "∞" : formatNumero(dscr, 2);

  return (
    <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] lg:gap-14">
      <form
        className="space-y-6"
        onSubmit={(e) => e.preventDefault()}
        aria-label="Dati del budget di tesoreria"
      >
        {CAMPI.map((c) => {
          const id = `${base}-${c.chiave}`;
          const errore = errori[c.chiave];
          return (
            <div key={c.chiave}>
              <label htmlFor={id} className="text-[0.9375rem] font-semibold">
                {c.etichetta}
              </label>
              <p id={`${id}-aiuto`} className="mt-0.5 text-[0.8125rem] text-testo-attenuato">
                {c.aiuto}
              </p>
              <div className="relative mt-2">
                <input
                  id={id}
                  type="text"
                  inputMode="decimal"
                  autoComplete="off"
                  spellCheck={false}
                  value={testi[c.chiave]}
                  onChange={(e) => setTesti((t) => ({ ...t, [c.chiave]: e.target.value }))}
                  onBlur={() => {
                    const v = valori[c.chiave];
                    if (v !== null) setTesti((t) => ({ ...t, [c.chiave]: formatNumero(v, 0) }));
                  }}
                  aria-invalid={errore !== null}
                  aria-describedby={`${id}-aiuto${errore ? ` ${id}-errore` : ""}`}
                  className="cifre h-11 w-full rounded-[var(--radius-pulsante)] border border-bordo bg-superficie pr-10 pl-3 text-right text-[0.9375rem] aria-invalid:border-critico"
                />
                <span
                  className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-sm text-testo-attenuato"
                  aria-hidden
                >
                  €
                </span>
              </div>
              {errore && (
                <p id={`${id}-errore`} className="mt-1.5 text-[0.8125rem] text-critico-testo">
                  {errore}
                </p>
              )}
            </div>
          );
        })}
        <button
          type="button"
          onClick={() => setTesti(iniziale)}
          className="text-sm font-medium text-testo-attenuato underline decoration-bordo underline-offset-4 hover:text-testo hover:decoration-testo"
        >
          Torna ai numeri di esempio
        </button>
      </form>

      <section
        aria-live="polite"
        aria-label="Risultato"
        className="self-start rounded-[0.8rem] border border-bordo bg-superficie p-6 sm:p-8"
      >
        <p className="etichetta text-testo-attenuato">DSCR prospettico · 6 mesi</p>
        <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
          <p className={`cifre text-6xl leading-none font-semibold ${TESTO_TONO[giudizio.tone]}`}>
            {mostrato}
          </p>
          <span className="text-sm">
            <Giudizio tono={giudizio.tone}>{giudizio.label}</Giudizio>
          </span>
        </div>
        <p className="mt-4 text-[0.9375rem] font-medium">{giudizio.testo}</p>
        <p className="mt-1.5 text-[0.9375rem] leading-[1.55] text-testo-attenuato">
          {giudizio.azione}
        </p>

        {dscr !== null && (
          <div className="relative mt-12 mb-10 h-px bg-bordo" aria-hidden>
            {/*
             * Le due etichette ai lati opposti della linea (sopra e sotto) e
             * tutte e due verso SINISTRA della loro tacca: a 375px l'etichetta
             * della soglia, scritta verso destra, usciva dallo schermo.
             */}
            {[
              { v: 1, testo: "1,00 · non copre", sopra: true },
              {
                v: soglia,
                testo: `${formatNumero(soglia, 2)} · soglia di FinBeacon`,
                sopra: false,
              },
            ].map((t) => (
              <span key={t.v} className="absolute top-0" style={{ left: posizione(t.v) }}>
                <span className="absolute -top-2 h-4 w-px bg-testo" />
                <span
                  className={`cifre absolute right-1.5 text-[0.6875rem] whitespace-nowrap text-testo-attenuato ${t.sopra ? "bottom-2" : "top-2"}`}
                >
                  {t.testo}
                </span>
              </span>
            ))}
            <span
              className={`absolute top-1/2 size-3 -translate-x-1/2 -translate-y-1/2 rounded-full ring-2 ring-superficie ${SEGNO_TONO[giudizio.tone]}`}
              style={{ left: posizione(dscr) }}
            />
          </div>
        )}

        {prev && disponibile !== null && (
          <dl className="mt-6 border-t border-filetto pt-4 text-sm">
            <div className="flex items-baseline justify-between gap-4 py-1">
              <dt className="text-testo-attenuato">Disponibile per il debito</dt>
              <dd className="cifre m-0">{formatEuro(disponibile)}</dd>
            </div>
            <div className="flex items-baseline justify-between gap-4 py-1">
              <dt className="text-testo-attenuato">Debito da servire</dt>
              <dd className="cifre m-0">{formatEuro(prev.debito6m)}</dd>
            </div>
            <p className="mt-3 text-xs leading-[1.5] text-testo-attenuato">
              DSCR = (liquidità iniziale + entrate − uscite) / debito da servire. Calcolato nel tuo
              browser: i numeri non vengono inviati né salvati.
            </p>
          </dl>
        )}
      </section>
    </div>
  );
}
