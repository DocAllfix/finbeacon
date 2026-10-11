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
  STUDIO_ESEMPIO,
} from "@/lib/esempio";
import { sinteticoDaScore } from "@/lib/fasce";
import { PORTAFOGLIO_ESEMPIO } from "@/lib/portafoglio-esempio";

/**
 * Il pannello dell'apertura A: la scheda di un cliente come la vede lo studio.
 * Quattro modi in prova (11/10), stessa forma:
 *   fermo        cifra, soglia e serie dei sei mesi
 *   avviso       in più, la riga d'allerta che compare quando la serie passa sotto soglia
 *   prova        la liquidità si sposta con un cursore, e cifra e serie si ricalcolano
 *   portafoglio  la scheda aperta dentro l'elenco dei clienti dello studio
 *
 * Nessun calcolo qui: solo `analizza()` e i dati d'esempio (CLAUDE.md regola 1).
 * Il valore di partenza è quello del cliente d'esempio, quindi l'HTML del server
 * porta già i numeri veri.
 */
export type ModoPannello = "fermo" | "avviso" | "prova" | "portafoglio";

const MAX_LIQUIDITA = 160_000;

function Corpo({ modo }: { modo: ModoPannello }) {
  const id = useId();
  const [liquidita, setLiquidita] = useState(PREVISIONALE_ESEMPIO.liquiditaIniziale);
  const analisi =
    modo === "prova"
      ? analizza(BILANCIO_ESEMPIO, { ...PREVISIONALE_ESEMPIO, liquiditaIniziale: liquidita })
      : ANALISI_ESEMPIO;
  const dscr = analisi.indicatori.dscrProspettico ?? 0;
  const giudizio = analisi.giudizi.dscrPro;
  const sotto = dscr < SOGLIA_DSCR6M;
  const sintesi = sinteticoDaScore(ANALISI_ESEMPIO.score);
  // Nella prova cambia l'ultima rilevazione, quella del mese in corso.
  const valori = [...SERIE_DSCR6M.slice(0, -1).map((r) => r.dscr6m), dscr];

  return (
    <div className="grid lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.5fr)]">
      <div className="border-b border-filetto px-5 py-7 sm:px-7 lg:border-r lg:border-b-0 lg:py-9">
        <p className="text-sm text-testo-attenuato">DSCR prospettico a 6 mesi</p>
        <p aria-live={modo === "prova" ? "polite" : undefined}>
          <span
            key={modo === "prova" ? dscr.toFixed(2) : undefined}
            className={`mt-2 block font-[family-name:var(--font-titoli)] text-[clamp(4rem,2.6rem+4.5vw,6.25rem)] leading-[0.9] font-semibold tracking-[-0.045em] tabular-nums ${modo === "prova" ? "prova-cifra" : ""} ${sotto ? "text-critico-testo" : "text-ottimo-testo"}`}
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
        {modo === "prova" ? (
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
        ) : (
          <p className="mt-5 max-w-[22rem] text-[0.9375rem] leading-[1.6] text-testo-attenuato">
            Il bilancio dice «{sintesi.label.toLowerCase()}». La cassa dei prossimi sei mesi non
            copre il debito.
          </p>
        )}
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
  );
}

/** La riga d'allerta: compare quando il grafico ha finito di scendere sotto soglia. */
function Avviso() {
  const primo = SERIE_DSCR6M.find((r) => r.dscr6m < SOGLIA_DSCR6M);
  if (!primo) return null;
  return (
    <div className="pannello-avviso flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-filetto bg-critico-fondo px-5 py-3.5 text-sm sm:px-7">
      <span className="size-2 shrink-0 rounded-full bg-critico" aria-hidden />
      <span className="font-medium text-critico-testo">
        {primo.mese}: DSCR a 6 mesi sotto soglia ({formatNumero(primo.dscr6m, 2)})
      </span>
      <span className="text-testo-attenuato">È il momento di chiamare il cliente.</span>
    </div>
  );
}

function Testata() {
  const sintesi = sinteticoDaScore(ANALISI_ESEMPIO.score);
  return (
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
  );
}

/** Il portafoglio: una riga per cliente, la scheda di Meccanica Ardesia aperta al suo posto. */
function Portafoglio() {
  return (
    <>
      <figcaption className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 border-b border-filetto px-5 py-3.5 sm:px-7">
        <span className="text-[0.9375rem] font-semibold">{STUDIO_ESEMPIO}</span>
        <span className="text-sm text-testo-attenuato">
          {PORTAFOGLIO_ESEMPIO.length} clienti, i più urgenti in cima
        </span>
      </figcaption>
      <ul>
        {PORTAFOGLIO_ESEMPIO.map((c, i) => {
          const aperta = c.nome === CLIENTE_ESEMPIO;
          const dscr = c.analisi.indicatori.dscrProspettico;
          const g = c.analisi.giudizi.dscrPro;
          return (
            <li
              key={c.nome}
              style={{ "--i": i } as React.CSSProperties}
              className={`registro-riga border-b border-filetto last:border-b-0 ${aperta ? "bg-tonale" : ""}`}
            >
              <div className="flex items-center gap-4 px-5 py-3 sm:px-7">
                <span
                  className={`min-w-0 flex-1 truncate text-[0.9375rem] ${aperta ? "font-semibold" : ""}`}
                >
                  {c.nome}
                </span>
                <span className="cifre hidden w-10 text-right text-sm text-testo-attenuato sm:block">
                  {c.analisi.score}
                </span>
                <span
                  className={`cifre w-14 text-right text-sm ${c.dscr6mSotto ? "text-critico-testo" : ""}`}
                >
                  {dscr === null ? "n.d." : formatNumero(dscr, 2)}
                </span>
                <span className="hidden w-24 text-xs md:block">
                  <Giudizio tono={g.tone}>{g.label}</Giudizio>
                </span>
              </div>
              {aperta && (
                <div className="border-t border-filetto bg-superficie">
                  <Corpo modo="fermo" />
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </>
  );
}

export function PannelloCliente({
  modo,
  piede = null,
}: {
  modo: ModoPannello;
  piede?: React.ReactNode;
}) {
  return (
    <figure className="pannello-cliente m-0 overflow-hidden rounded-[0.9rem] border border-bordo bg-superficie">
      {modo === "portafoglio" ? (
        <Portafoglio />
      ) : (
        <>
          <Testata />
          <Corpo modo={modo} />
          {modo === "avviso" && <Avviso />}
        </>
      )}
      {piede}
    </figure>
  );
}
