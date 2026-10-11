"use client";

import { analizza, formatEuro, formatNumero } from "@finbeacon/engine";
import { useId, useState } from "react";

import { BILANCIO_ESEMPIO, PREVISIONALE_ESEMPIO, SOGLIA_DSCR6M } from "@/lib/esempio";

/**
 * L'apertura che si prova (variante D, 11/10). Una sola leva, la liquidità, e il
 * DSCR prospettico che il motore ricalcola mentre la si muove: si vede la cassa
 * attraversare la soglia. Nessun calcolo qui, solo `analizza()`.
 *
 * Il valore di partenza è quello del cliente d'esempio, quindi il server lo
 * scrive già nell'HTML: senza JavaScript si legge 0,94 e non uno zero.
 */
const MIN = 0;
const MAX = 160_000;
const PASSO = 1_000;
/** La scala disegnata va da 0 a 2: la soglia cade a poco più di metà. */
const FONDO_SCALA = 2;

export function ProvaDscr() {
  const id = useId();
  const [liquidita, setLiquidita] = useState(PREVISIONALE_ESEMPIO.liquiditaIniziale);
  const analisi = analizza(BILANCIO_ESEMPIO, {
    ...PREVISIONALE_ESEMPIO,
    liquiditaIniziale: liquidita,
  });
  const dscr = analisi.indicatori.dscrProspettico ?? 0;
  const giudizio = analisi.giudizi.dscrPro;
  const sotto = dscr < SOGLIA_DSCR6M;
  const posizione = (v: number) => Math.min(1, Math.max(0, v / FONDO_SCALA));

  return (
    <div className="rounded-[var(--radius-scheda)] border border-bordo bg-superficie p-5 sm:p-7">
      <div className="flex items-end justify-between gap-6">
        <div aria-live="polite">
          <p className="text-sm text-testo-attenuato">DSCR prospettico a 6 mesi</p>
          <p
            key={dscr.toFixed(2)}
            className={`prova-cifra mt-1 font-[family-name:var(--font-titoli)] text-[clamp(4rem,2.5rem+5vw,6.5rem)] leading-[0.9] font-semibold tracking-[-0.04em] tabular-nums ${sotto ? "text-critico-testo" : "text-testo"}`}
          >
            {formatNumero(dscr, 2)}
          </p>
        </div>
        <p
          className={`mb-2 shrink-0 text-sm font-medium ${sotto ? "text-critico-testo" : "text-ottimo-testo"}`}
        >
          {giudizio.label}
        </p>
      </div>

      {/* La scala: la soglia è una tacca fissa, il segno del valore scorre (solo transform). */}
      <div className="relative mt-6 h-2 rounded-full bg-tonale" aria-hidden>
        <span
          className="absolute inset-y-0 left-0 w-full origin-left rounded-full bg-critico-fondo"
          style={{ transform: `scaleX(${posizione(SOGLIA_DSCR6M)})` }}
        />
        <span
          className="absolute top-1/2 h-5 w-px -translate-y-1/2 bg-testo"
          style={{ left: `${posizione(SOGLIA_DSCR6M) * 100}%` }}
        />
        {/* Un binario largo quanto la scala, traslato in % della SUA larghezza: il segno ci sta in cima. */}
        <span
          className="prova-segno absolute inset-0"
          style={{ transform: `translateX(${posizione(dscr) * 100}%)` }}
        >
          <span
            className="absolute top-1/2 left-0 size-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-superficie"
            style={{ background: sotto ? "var(--critico)" : "var(--ottimo)" }}
          />
        </span>
      </div>
      <p className="cifre relative mt-2 h-4 text-xs text-testo-attenuato" aria-hidden>
        <span className="absolute left-0">0</span>
        <span
          className="absolute -translate-x-1/2 whitespace-nowrap"
          style={{ left: `${posizione(SOGLIA_DSCR6M) * 100}%` }}
        >
          soglia {formatNumero(SOGLIA_DSCR6M, 2)}
        </span>
        <span className="absolute right-0">{formatNumero(FONDO_SCALA, 0)}</span>
      </p>

      <div className="mt-7 border-t border-filetto pt-5">
        <div className="flex items-baseline justify-between gap-4">
          <label htmlFor={id} className="text-[0.9375rem] font-medium">
            Liquidità iniziale
          </label>
          <span className="cifre text-[0.9375rem]">{formatEuro(liquidita)}</span>
        </div>
        <input
          id={id}
          type="range"
          min={MIN}
          max={MAX}
          step={PASSO}
          value={liquidita}
          aria-valuetext={`${formatEuro(liquidita)}, DSCR ${formatNumero(dscr, 2)}`}
          onChange={(e) => setLiquidita(Number(e.target.value))}
          className="leva mt-2 w-full"
        />
        <p className="text-xs text-testo-attenuato">
          Spostala: il motore di FinBeacon ricalcola. Dati inventati.
        </p>
      </div>
    </div>
  );
}
