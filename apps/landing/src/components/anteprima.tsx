"use client";

import { analizza, formatEuro, formatNumero, SOGLIE_GIUDIZIO } from "@finbeacon/engine";
import { useId, useMemo, useState } from "react";

import { BILANCIO_ESEMPIO, PREVISIONALE_ESEMPIO } from "@/lib/esempio";
import { sinteticoDaScore } from "@/lib/fasce";
import { righeIndicatori } from "@/lib/indicatori";

import { Giudizio, TESTO_TONO } from "./giudizio";

/**
 * Il motore di FinBeacon, lo stesso dell'applicazione, nel browser. Le tre leve
 * sono ingressi DIRETTI del motore, senza derivazioni inventate: il resto del
 * bilancio resta quello del cliente di esempio, e la pagina lo dice.
 *
 * Lo stato iniziale è reso dal server con i valori di partenza, quindi l'HTML
 * contiene già punteggio e giudizi veri (nessun «0» per chi non esegue
 * JavaScript). Nessun calcolo qui: solo `analizza()`.
 */
/*
 * OGNI LEVA DICE COSA MUOVE (29/09). Senza, il visitatore spostava la liquidità
 * e guardava il punteggio fermo a 71, convinto che l'anteprima fosse rotta. Non
 * lo era: il punteggio legge il bilancio dell'anno, e il DSCR prospettico ne
 * resta fuori per scelta del motore (è la lettura di continuità dell'art. 3
 * CCII). La mappa qui sotto è la conseguenza delle formule di
 * `calcolaIndicatori`, non un'opinione: se il motore cambia, va rivista.
 */
type Voce = "score" | "dscrPro" | "ros" | "roi" | "gi";
const NOME_VOCE: Record<Voce, string> = {
  score: "il punteggio",
  dscrPro: "il DSCR prospettico",
  ros: "il ROS",
  roi: "il ROI",
  gi: "il GI",
};

const LEVE = [
  {
    chiave: "liquidita",
    etichetta: "Liquidità iniziale",
    aiuto: "Cassa e conti correnti all'inizio dei sei mesi",
    min: 0,
    max: 300_000,
    passo: 1_000,
    partenza: PREVISIONALE_ESEMPIO.liquiditaIniziale,
    muove: ["dscrPro"],
  },
  {
    chiave: "ro",
    etichetta: "Reddito operativo",
    aiuto: "Risultato della gestione caratteristica",
    min: -100_000,
    max: 500_000,
    passo: 5_000,
    partenza: BILANCIO_ESEMPIO.ro,
    muove: ["score", "ros", "roi"],
  },
  {
    chiave: "pfn",
    etichetta: "Posizione finanziaria netta",
    aiuto: "Debito finanziario al netto della liquidità",
    min: 0,
    max: 4_000_000,
    passo: 50_000,
    partenza: BILANCIO_ESEMPIO.pfn,
    muove: ["score", "gi"],
  },
] as const;

type Chiave = (typeof LEVE)[number]["chiave"];
const PARTENZA = Object.fromEntries(LEVE.map((l) => [l.chiave, l.partenza])) as Record<
  Chiave,
  number
>;

/*
 * Solo gli indicatori che almeno una leva muove. Il DSCR sull'esercizio
 * (flusso di cassa / servizio del debito) non dipende da nessuna delle tre, e
 * una riga che resta immobile mentre tutto il resto si sposta sembrava un
 * guasto. Il punteggio lo include comunque: il motore non cambia.
 */
const RIGHE = ["ros", "roi", "gi"] as const;

const ANALISI_PARTENZA = analizza(BILANCIO_ESEMPIO, PREVISIONALE_ESEMPIO);

/** «a», «a e b», «a, b e c». */
function elenco(voci: readonly string[]) {
  return voci.length < 2 ? (voci[0] ?? "") : `${voci.slice(0, -1).join(", ")} e ${voci.at(-1)}`;
}

function formatDscr(v: number | null) {
  return v === null ? "n.d." : v >= 99 ? "∞" : formatNumero(v, 2);
}

/**
 * Un valore che può cambiare. Diverso dalla partenza, lampeggia (lo span si
 * rimonta a ogni nuovo valore, quindi l'animazione riparte) e dice da dove
 * veniva: l'occhio trova subito cosa si è mosso, e chi ha il movimento spento
 * legge la stessa cosa a parole.
 */
function Cifra({
  valore,
  partenza,
  className = "",
  classeEra = "",
}: {
  valore: string;
  partenza: string;
  className?: string;
  classeEra?: string;
}) {
  const cambiato = valore !== partenza;
  return (
    <>
      <span
        key={valore}
        className={`-mx-1 rounded-[0.3rem] px-1 ${cambiato ? "lampo" : ""} ${className}`}
      >
        {valore}
      </span>
      {cambiato && (
        <span className={`block text-xs font-normal text-testo-attenuato ${classeEra}`}>
          era {partenza}
        </span>
      )}
    </>
  );
}

export function Anteprima() {
  const [valori, setValori] = useState<Record<Chiave, number>>(PARTENZA);
  const [attiva, setAttiva] = useState<Chiave | null>(null);
  const base = useId();
  const mosse = new Set<Voce>(attiva ? LEVE.find((l) => l.chiave === attiva)!.muove : []);
  /** Il fondo appena acceso sulle voci che la leva in mano sta muovendo. */
  const evidenzia = (v: Voce) =>
    `transition-colors duration-200 ${mosse.has(v) ? "bg-accento/8" : "bg-transparent"}`;

  const analisi = useMemo(
    () =>
      analizza(
        { ...BILANCIO_ESEMPIO, ro: valori.ro, pfn: valori.pfn },
        { ...PREVISIONALE_ESEMPIO, liquiditaIniziale: valori.liquidita },
      ),
    [valori],
  );

  const sintetico = sinteticoDaScore(analisi.score);
  const righe = righeIndicatori(analisi, RIGHE);
  const righePartenza = righeIndicatori(ANALISI_PARTENZA, RIGHE);
  const modificato = LEVE.some((l) => valori[l.chiave] !== l.partenza);

  return (
    <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] lg:gap-14">
      <fieldset className="m-0 min-w-0 border-0 p-0">
        <legend className="etichetta mb-6 text-testo-attenuato">Le leve</legend>
        <div className="space-y-8">
          {LEVE.map((l) => {
            const id = `${base}-${l.chiave}`;
            return (
              <div key={l.chiave}>
                <div className="flex items-baseline justify-between gap-4">
                  <label htmlFor={id} className="text-[0.9375rem] font-semibold">
                    {l.etichetta}
                  </label>
                  <output htmlFor={id} className="cifre text-[0.9375rem] font-semibold">
                    {formatEuro(valori[l.chiave])}
                  </output>
                </div>
                <p id={`${id}-aiuto`} className="mt-0.5 text-[0.8125rem] text-testo-attenuato">
                  {l.aiuto}.{" "}
                  <span className="text-testo">
                    Muove {elenco(l.muove.map((v) => NOME_VOCE[v]))}.
                  </span>
                </p>
                <input
                  onFocus={() => setAttiva(l.chiave)}
                  onBlur={() => setAttiva((a) => (a === l.chiave ? null : a))}
                  id={id}
                  type="range"
                  min={l.min}
                  max={l.max}
                  step={l.passo}
                  value={valori[l.chiave]}
                  aria-describedby={`${id}-aiuto`}
                  aria-valuetext={formatEuro(valori[l.chiave])}
                  onChange={(e) => setValori((v) => ({ ...v, [l.chiave]: Number(e.target.value) }))}
                  className="leva mt-3 w-full"
                />
              </div>
            );
          })}
        </div>
        <div className="mt-8 flex flex-wrap items-center gap-x-5 gap-y-3">
          <button
            type="button"
            onClick={() => setValori(PARTENZA)}
            disabled={!modificato}
            className="inline-flex h-10 items-center rounded-[var(--radius-pulsante)] border border-bordo px-4 text-sm font-medium transition-transform duration-150 ease-[var(--ease-uscita)] enabled:hover:-translate-y-px disabled:cursor-default disabled:border-filetto disabled:text-testo-attenuato"
          >
            Torna ai valori di partenza
          </button>
          <p className="text-[0.8125rem] text-testo-attenuato">
            Il resto del bilancio resta quello del cliente di esempio.
          </p>
        </div>
      </fieldset>

      <div
        aria-live="polite"
        className="rounded-[0.8rem] border border-bordo bg-superficie p-6 sm:p-8"
      >
        <div
          className={`-mx-3 flex items-end justify-between gap-6 rounded-[0.5rem] border-b border-filetto px-3 pb-6 ${evidenzia("score")}`}
        >
          <div>
            <p className="etichetta text-testo-attenuato">Punteggio di sintesi</p>
            <p
              className={`cifre mt-2 text-6xl leading-none font-semibold ${TESTO_TONO[sintetico.tone]}`}
            >
              <Cifra
                valore={String(analisi.score)}
                partenza={String(ANALISI_PARTENZA.score)}
                classeEra="mt-2"
              />
            </p>
          </div>
          <div className="text-right">
            <Giudizio tono={sintetico.tone}>{sintetico.label}</Giudizio>
            <p className="mt-2 text-[0.8125rem] text-testo-attenuato">{analisi.sintesi.titolo}</p>
          </div>
        </div>

        <div
          className={`-mx-3 rounded-[0.5rem] border-b border-filetto px-3 py-5 ${evidenzia("dscrPro")}`}
        >
          <div className="flex items-baseline justify-between gap-4">
            <p className="text-[0.9375rem] font-semibold">
              DSCR prospettico · 6 mesi
              <span className="block text-[0.8125rem] font-normal text-testo-attenuato">
                soglia {formatNumero(SOGLIE_GIUDIZIO.dscr6m.soglia, 2)} · art. 3 CCII · fuori dal
                punteggio
              </span>
            </p>
            <p
              className={`cifre text-right text-3xl font-semibold ${TESTO_TONO[analisi.giudizi.dscrPro.tone]}`}
            >
              <Cifra
                valore={formatDscr(analisi.indicatori.dscrProspettico)}
                partenza={formatDscr(ANALISI_PARTENZA.indicatori.dscrProspettico)}
              />
            </p>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <Giudizio tono={analisi.giudizi.dscrPro.tone}>{analisi.giudizi.dscrPro.label}</Giudizio>
            <p className="text-[0.8125rem] text-testo-attenuato">{analisi.giudizi.dscrPro.testo}</p>
          </div>
        </div>

        <ul>
          {righe.map((r, i) => (
            <li
              key={r.chiave}
              className={`-mx-3 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-2 rounded-[0.5rem] border-b border-filetto px-3 py-3 last:border-b-0 sm:grid-cols-[minmax(0,1fr)_6.5rem_10.5rem] ${evidenzia(r.chiave as Voce)}`}
            >
              <span className="min-w-0 text-[0.9375rem]">
                <span className="font-semibold">{r.titolo}</span>
                <span className="block truncate text-[0.8125rem] text-testo-attenuato">
                  {r.soglia}
                </span>
              </span>
              <span className="cifre text-right text-[0.9375rem]">
                <Cifra valore={r.valore} partenza={righePartenza[i]!.valore} />
              </span>
              <span className="col-span-2 text-xs sm:col-span-1">
                <Giudizio tono={r.giudizio.tone}>{r.giudizio.label}</Giudizio>
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
