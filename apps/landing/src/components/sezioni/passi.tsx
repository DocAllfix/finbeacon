import { formatEuro, formatNumero } from "@finbeacon/engine";
import { FileText } from "lucide-react";

import { Contenitore, Occhiello, Titolo2 } from "@/components/base";
import { Giudizio, TESTO_TONO } from "@/components/giudizio";
import { PASSI } from "@/lib/contenuti";
import {
  ANALISI_ESEMPIO,
  BILANCIO_ESEMPIO,
  CLIENTE_ESEMPIO,
  ESERCIZIO_ESEMPIO,
} from "@/lib/esempio";
import { sinteticoDaScore } from "@/lib/fasce";

/**
 * «Come funziona»: tre passi, ciascuno con il suo frammento di prodotto
 * lungo un filo verticale, con contenuti diversi.
 */

/** Stessa regola del nome del file nell'applicazione (api/report/[id]/route.ts). */
function nomeFile(ragioneSociale: string, anno: number) {
  const base = ragioneSociale
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 60);
  return `Analisi_${base || "cliente"}_${anno}.pdf`;
}

function Frammento({ children }: { children: React.ReactNode }) {
  return (
    <div className="mt-6 rounded-[0.7rem] border border-bordo bg-superficie p-4" aria-hidden>
      {children}
    </div>
  );
}

function FrammentoCarica() {
  const voci = [
    ["Valore della produzione", BILANCIO_ESEMPIO.valProd],
    ["Reddito operativo", BILANCIO_ESEMPIO.ro],
    ["Posizione finanziaria netta", BILANCIO_ESEMPIO.pfn],
  ] as const;
  return (
    <Frammento>
      <ul className="space-y-2">
        {voci.map(([voce, valore]) => (
          <li
            key={voce}
            className="flex items-baseline justify-between gap-3 border-b border-filetto pb-2 text-sm"
          >
            <span className="text-testo-attenuato">{voce}</span>
            <span className="cifre">{formatEuro(valore)}</span>
          </li>
        ))}
      </ul>
      <p className="mt-3 text-xs text-testo-attenuato">
        e altre sette grandezze · oppure importa un CSV
      </p>
    </Frammento>
  );
}

function FrammentoGiudizio() {
  const s = sinteticoDaScore(ANALISI_ESEMPIO.score);
  const g = ANALISI_ESEMPIO.giudizi.dscrPro;
  return (
    <Frammento>
      <div className="flex items-end justify-between gap-3">
        <p className={`cifre text-4xl leading-none font-semibold ${TESTO_TONO[s.tone]}`}>
          {ANALISI_ESEMPIO.score}
        </p>
        <span className="text-xs">
          <Giudizio tono={s.tone}>{s.label}</Giudizio>
        </span>
      </div>
      <div className="mt-4 flex items-center justify-between gap-3 border-t border-filetto pt-3 text-sm">
        <span className="text-testo-attenuato">
          DSCR 6M{" "}
          <span className="cifre text-critico-testo">
            {formatNumero(ANALISI_ESEMPIO.indicatori.dscrProspettico!, 2)}
          </span>
        </span>
        <span className="text-xs">
          <Giudizio tono={g.tone}>{g.label}</Giudizio>
        </span>
      </div>
    </Frammento>
  );
}

function FrammentoConsegna() {
  return (
    <Frammento>
      <div className="flex items-center gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-[0.4rem] bg-tonale">
          <FileText className="size-5 text-testo-attenuato" />
        </span>
        <span className="min-w-0">
          <span className="cifre block text-[0.8125rem] leading-snug break-all">
            {nomeFile(CLIENTE_ESEMPIO, ESERCIZIO_ESEMPIO)}
          </span>
          <span className="block text-xs text-testo-attenuato">Per il cliente e per la banca</span>
        </span>
      </div>
    </Frammento>
  );
}

export function Passi() {
  const frammenti = [
    <FrammentoCarica key="1" />,
    <FrammentoGiudizio key="2" />,
    <FrammentoConsegna key="3" />,
  ];
  return (
    <section
      id="come-funziona"
      aria-labelledby="titolo-passi"
      className="scroll-mt-20 border-t border-filetto"
    >
      {/*
       * Un filo verticale, non tre colonne (11/10): le tre colonne numerate
       * con la loro schedina erano la sezione gemella di Evalis Deck. Il titolo
       * resta fermo a sinistra mentre i passi scorrono; il punto acceso è sul
       * secondo, dove arriva il giudizio.
       */}
      <Contenitore className="grid gap-12 py-24 md:py-28 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] lg:gap-16">
        <div className="comparsa max-w-[30rem] lg:sticky lg:top-28 lg:self-start">
          <Occhiello>{PASSI.occhiello}</Occhiello>
          <Titolo2 id="titolo-passi">{PASSI.titolo}</Titolo2>
        </div>

        <ol className="relative before:absolute before:top-2 before:bottom-2 before:left-[0.4375rem] before:w-px before:bg-bordo">
          {PASSI.passi.map((p, i) => (
            <li key={p.titolo} className="comparsa relative min-w-0 pb-14 pl-12 last:pb-0">
              <span
                className={`absolute top-1.5 left-0 size-[0.9375rem] rounded-full border-2 ${i === 1 ? "border-accento bg-accento" : "border-bordo bg-fondo"}`}
                aria-hidden
              />
              <span className="cifre block text-sm text-testo-attenuato" aria-hidden>
                {String(i + 1).padStart(2, "0")}
              </span>
              <h3 className="mt-1 text-xl leading-snug font-semibold tracking-[-0.01em]">
                {p.titolo}
              </h3>
              <p className="mt-2.5 max-w-[34rem] text-[0.9375rem] leading-[1.6] text-testo-attenuato">
                {p.testo}
              </p>
              <div className="max-w-[24rem]">{frammenti[i]}</div>
            </li>
          ))}
        </ol>
      </Contenitore>
    </section>
  );
}
