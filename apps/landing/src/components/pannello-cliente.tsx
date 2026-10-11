"use client";

import { analizza, formatEuro, formatNumero } from "@finbeacon/engine";
import { useId, useState } from "react";

import { GraficoSoglia } from "@/components/grafico-soglia";
import { Giudizio } from "@/components/giudizio";
import {
  ANALISI_ESEMPIO,
  BILANCIO_ESEMPIO,
  CLIENTE_ESEMPIO,
  PREVISIONALE_ESEMPIO,
  SERIE_DSCR6M,
  SOGLIA_DSCR6M,
} from "@/lib/esempio";
import { sinteticoDaScore } from "@/lib/fasce";

/**
 * Il pannello dell'apertura: la scheda di un cliente come la vede lo studio,
 * con la liquidità da spostare. Cifra, giudizio e ultima rilevazione della
 * serie si ricalcolano dal motore mentre si muove il cursore.
 *
 * Nessun calcolo qui: solo `analizza()` e i dati d'esempio (CLAUDE.md regola 1).
 * Il valore di partenza è quello del cliente d'esempio, quindi l'HTML del server
 * porta già i numeri veri.
 */
const MAX_LIQUIDITA = 160_000;

export function PannelloCliente({ piede = null }: { piede?: React.ReactNode }) {
  const id = useId();
  const [liquidita, setLiquidita] = useState(PREVISIONALE_ESEMPIO.liquiditaIniziale);
  const analisi = analizza(BILANCIO_ESEMPIO, {
    ...PREVISIONALE_ESEMPIO,
    liquiditaIniziale: liquidita,
  });
  const dscr = analisi.indicatori.dscrProspettico ?? 0;
  const giudizio = analisi.giudizi.dscrPro;
  const sotto = dscr < SOGLIA_DSCR6M;
  const sintesi = sinteticoDaScore(ANALISI_ESEMPIO.score);
  // Il cursore muove l'ultima rilevazione, quella del mese in corso.
  const valori = [...SERIE_DSCR6M.slice(0, -1).map((r) => r.dscr6m), dscr];

  return (
    <figure className="pannello-cliente m-0 overflow-hidden rounded-[0.9rem] border border-bordo bg-superficie">
      <figcaption className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 border-b border-filetto px-5 py-3.5 sm:px-7">
        <span className="text-[0.9375rem] font-semibold">{CLIENTE_ESEMPIO}</span>
        <span className="flex items-center gap-3 text-sm text-testo-attenuato">
          Punteggio sull&apos;esercizio
          <span className="cifre text-testo">{ANALISI_ESEMPIO.score}</span>
          <span className="text-xs">
            <Giudizio tono={sintesi.tone}>{sintesi.label}</Giudizio>
          </span>
        </span>
      </figcaption>
      <div className="grid lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.5fr)]">
        <div className="border-b border-filetto px-5 py-7 sm:px-7 lg:border-r lg:border-b-0 lg:py-9">
          <p className="text-sm text-testo-attenuato">DSCR prospettico a 6 mesi</p>
          <p aria-live="polite">
            <span
              key={dscr.toFixed(2)}
              className={`prova-cifra mt-2 block font-[family-name:var(--font-titoli)] text-[clamp(4rem,2.6rem+4.5vw,6.25rem)] leading-[0.9] font-semibold tracking-[-0.045em] tabular-nums ${sotto ? "text-critico-testo" : "text-ottimo-testo"}`}
            >
              {formatNumero(dscr, 2)}
            </span>
          </p>
          <p className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-2 text-sm text-testo-attenuato">
            <span className="text-xs">
              <Giudizio tono={giudizio.tone}>{giudizio.label}</Giudizio>
            </span>
            <span className="cifre">soglia {formatNumero(SOGLIA_DSCR6M, 2)} · art. 3 CCII</span>
          </p>
          <div className="mt-6 border-t border-filetto pt-5">
            <div className="flex items-baseline justify-between gap-4 text-sm">
              <label htmlFor={id} className="font-medium">
                Liquidità iniziale
              </label>
              <span className="cifre">{formatEuro(liquidita)}</span>
            </div>
            <input
              id={id}
              type="range"
              min={0}
              max={MAX_LIQUIDITA}
              step={1_000}
              value={liquidita}
              aria-valuetext={`${formatEuro(liquidita)}, DSCR ${formatNumero(dscr, 2)}`}
              onChange={(e) => setLiquidita(Number(e.target.value))}
              className="leva mt-1 w-full"
            />
            <p className="text-xs text-testo-attenuato">Spostala: il motore ricalcola.</p>
          </div>
        </div>
        <div data-cornice className="px-5 pt-6 pb-5 text-testo sm:px-7 lg:pt-9">
          <p className="mb-5 text-sm text-testo-attenuato">Una rilevazione al mese</p>
          <GraficoSoglia
            valori={valori}
            soglia={SOGLIA_DSCR6M}
            etichette={SERIE_DSCR6M.map((r) => r.mese)}
            animato
          />
        </div>
      </div>
      {piede}
    </figure>
  );
}
