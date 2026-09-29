import { formatNumero } from "@finbeacon/engine";
import Link from "next/link";

import { Giudizio, TESTO_TONO } from "@/components/giudizio";
import { ANALISI_ESEMPIO, CLIENTE_ESEMPIO, SOGLIA_DSCR6M } from "@/lib/esempio";
import { FORMULE, type ChiaveFormula } from "@/lib/formule";

/**
 * I pezzi che una guida può usare dentro il Markdown. Tutti i NUMERI escono dal
 * motore sul cliente di esempio (regola 1 di CLAUDE.md): chi scrive una guida,
 * persona o routine, non digita mai un valore calcolato, lo chiede a un
 * componente. Così l'articolo non può contraddire il prodotto.
 */

/** Una formula con il conto fatto sul cliente di esempio. */
export function Formula({ chiave }: { chiave: ChiaveFormula }) {
  const f = FORMULE[chiave];
  if (!f) throw new Error(`[guide] <Formula chiave="${chiave}"> non esiste`);
  return (
    <figure className="guida-riquadro">
      <p className="m-0 text-[0.9375rem]">
        <span className="font-semibold">{f.nome}</span>
        <span className="text-testo-attenuato"> = {f.formula}</span>
      </p>
      <p className="cifre m-0 mt-2 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 text-sm text-testo-attenuato">
        <span>{f.conto}</span>
        <span className="text-base font-semibold whitespace-nowrap text-testo">= {f.esito}</span>
      </p>
      <figcaption className="mt-2 text-xs text-testo-attenuato">
        {CLIENTE_ESEMPIO}, dati inventati. Calcolo del motore di FinBeacon.
      </figcaption>
    </figure>
  );
}

/** Il DSCR prospettico dell'esempio, con il giudizio e la soglia del motore. */
export function EsempioDscr() {
  const f = FORMULE.dscr6m;
  const g = ANALISI_ESEMPIO.giudizi.dscrPro;
  return (
    <figure className="guida-riquadro">
      <p className="m-0 text-[0.9375rem]">
        <span className="font-semibold">{f.nome}</span>
        <span className="text-testo-attenuato"> = {f.formula}</span>
      </p>
      <p className="cifre m-0 mt-2 text-sm text-testo-attenuato">{f.conto}</p>
      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2 border-t border-bordo pt-3">
        <span className={`cifre text-2xl font-semibold ${TESTO_TONO[g.tone]}`}>{f.esito}</span>
        <span className="text-xs">
          <Giudizio tono={g.tone}>{g.label}</Giudizio>
        </span>
        <span className="text-sm">{g.testo}</span>
      </div>
      <figcaption className="mt-2 text-xs text-testo-attenuato">
        {CLIENTE_ESEMPIO}, dati inventati. Soglia di FinBeacon: {formatNumero(SOGLIA_DSCR6M, 2)}.
      </figcaption>
    </figure>
  );
}

/** Un'osservazione da non perdere. Fondo tonale e bordo pieno: niente strisce laterali. */
export function Nota({ children }: { children: React.ReactNode }) {
  return (
    <aside className="guida-riquadro">
      <p className="etichetta m-0 text-testo-attenuato">Da ricordare</p>
      <div className="mt-2 [&>p]:m-0 [&>p+p]:mt-2">{children}</div>
    </aside>
  );
}

/** I link del Markdown: interni con Link, esterni in una scheda nuova e detto. */
function Collegamento({ href = "", children, ...resto }: React.ComponentProps<"a">) {
  // `resto` porta la classe `ancora` dei titoli (rehype-autolink-headings):
  // senza, i titoli sembravano link blu sottolineati.
  if (href.startsWith("#"))
    return (
      <a href={href} {...resto}>
        {children}
      </a>
    );
  if (href.startsWith("/"))
    return (
      <Link href={href} {...resto}>
        {children}
      </Link>
    );
  return (
    <a href={href} target="_blank" rel="noopener" {...resto}>
      {children}
      <span className="sr-only"> (si apre in una nuova scheda)</span>
    </a>
  );
}

/** Una tabella larga scorre DENTRO il suo contenitore, mai la pagina. */
function Tabella(props: React.ComponentProps<"table">) {
  return (
    <div className="guida-tabella" tabIndex={0} role="region" aria-label="Tabella">
      <table {...props} />
    </div>
  );
}

export const COMPONENTI_GUIDA = {
  Formula,
  EsempioDscr,
  Nota,
  a: Collegamento,
  table: Tabella,
};
