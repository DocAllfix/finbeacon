import { formatEuro, formatNumero } from "@finbeacon/engine";
import { ChevronDown } from "lucide-react";
import { Fragment } from "react";

import { Anteprima } from "@/components/anteprima";
import { Contenitore, Occhiello, Paragrafo, Titolo2 } from "@/components/base";
import { Giudizio, SEGNO_TONO, TESTO_TONO } from "@/components/giudizio";
import { ANTEPRIMA, DOMANDE, METODO, RISERVATEZZA } from "@/lib/contenuti";
import { ANALISI_ESEMPIO, BILANCIO_ESEMPIO, CLIENTE_ESEMPIO, SOGLIA_DSCR6M } from "@/lib/esempio";

/** Il secondo momento notte: il motore vero, da provare. */
export function SezioneAnteprima() {
  return (
    <section id="anteprima" aria-labelledby="titolo-anteprima" className="notte scroll-mt-20">
      <Contenitore className="py-24 md:py-32">
        <div className="comparsa max-w-[40rem]">
          <Occhiello>{ANTEPRIMA.occhiello}</Occhiello>
          <Titolo2 id="titolo-anteprima">{ANTEPRIMA.titolo}</Titolo2>
          <Paragrafo className="mt-5">{ANTEPRIMA.testo}</Paragrafo>
        </div>
        <div className="mt-14">
          <Anteprima />
        </div>
      </Contenitore>
    </section>
  );
}

/**
 * Il posto della «prova sociale», che al lancio non esiste: niente loghi né
 * testimonianze inventate. La fiducia si costruisce con ciò che si può
 * verificare.
 *
 * UN PROSPETTO ANNOTATO (29/09). Prima erano cinque paragrafi uguali uno sotto
 * l'altro, «la lista della spesa»: l'unico punto della pagina che affermava
 * senza mostrare, mentre tutto il resto fa parlare il prodotto. Ora ogni
 * affermazione ha accanto il suo REPERTO, e ogni reperto esce dal motore sul
 * cliente di esempio: nessuna cifra scritta a mano. I reperti sono di specie
 * diverse (una soglia, un albero, un giudizio, una formula, un verbale), così
 * le righe non si ripetono.
 */
export function Metodo() {
  const reperti = [
    <RepertoSoglia key="soglia" />,
    <RepertoMotore key="motore" />,
    <RepertoConsiglio key="consiglio" />,
    <RepertoFormule key="formule" />,
    <RepertoVerifica key="verifica" />,
  ];
  return (
    <section id="metodo" aria-labelledby="titolo-metodo" className="scroll-mt-20">
      <Contenitore className="py-24 md:py-32">
        <div className="comparsa grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:items-end lg:gap-16">
          <div>
            <Occhiello>{METODO.occhiello}</Occhiello>
            <Titolo2 id="titolo-metodo">{METODO.titolo}</Titolo2>
          </div>
          <Paragrafo className="max-w-[30rem] lg:pb-2">{METODO.testo}</Paragrafo>
        </div>
        <ol className="mt-14 border-t border-bordo">
          {METODO.punti.map((p, i) => (
            <li
              key={p.titolo}
              className="comparsa grid grid-cols-[2.25rem_minmax(0,1fr)] gap-x-4 gap-y-5 border-b border-filetto py-8 md:grid-cols-[2.5rem_minmax(0,1fr)_minmax(0,1.05fr)] md:gap-x-10"
            >
              <span className="cifre pt-1 text-sm text-testo-attenuato" aria-hidden>
                {String(i + 1).padStart(2, "0")}
              </span>
              <div className="max-w-[26rem]">
                <h3 className="text-[1.1875rem] leading-snug font-semibold tracking-[-0.01em]">
                  {p.titolo}
                </h3>
                <p className="mt-2.5 text-[0.9375rem] leading-[1.65] text-testo-attenuato">
                  {p.testo}
                </p>
              </div>
              <div className="col-start-2 md:col-start-3">{reperti[i]}</div>
            </li>
          ))}
        </ol>
      </Contenitore>
    </section>
  );
}

/** La lastra su cui sta un reperto: un gradino tonale, nessuna ombra. */
function Lastra({ children, didascalia }: { children: React.ReactNode; didascalia: string }) {
  return (
    <figure className="m-0">
      <div className="rounded-[0.6rem] bg-tonale px-5 py-4">{children}</div>
      <figcaption className="mt-2 text-xs text-testo-attenuato">{didascalia}</figcaption>
    </figure>
  );
}

/** 01 — La soglia, su un righello: il valore da una parte, la norma dall'altra. */
function RepertoSoglia() {
  const valore = ANALISI_ESEMPIO.indicatori.dscrProspettico!;
  const giudizio = ANALISI_ESEMPIO.giudizi.dscrPro;
  // Righello da 0 a 2: la soglia CCII cade a poco più di metà.
  const pos = (v: number) => `${Math.min(100, Math.max(0, (v / 2) * 100))}%`;
  return (
    <Lastra didascalia={`${CLIENTE_ESEMPIO}, dati inventati. La soglia viene dal motore.`}>
      <div className="flex items-baseline justify-between gap-4">
        <span className="text-sm font-medium">DSCR prospettico · 6 mesi</span>
        <span className={`cifre text-xl font-semibold ${TESTO_TONO[giudizio.tone]}`}>
          {formatNumero(valore, 2)}
        </span>
      </div>
      <div className="relative mt-5 mb-7 h-px bg-bordo" aria-hidden>
        <span
          className="absolute top-1/2 h-4 w-px -translate-y-1/2 bg-testo"
          style={{ left: pos(SOGLIA_DSCR6M) }}
        />
        <span
          className="cifre absolute top-3 -translate-x-1/2 text-xs whitespace-nowrap text-testo"
          style={{ left: pos(SOGLIA_DSCR6M) }}
        >
          soglia {formatNumero(SOGLIA_DSCR6M, 2)} · art. 3 CCII
        </span>
        <span
          className={`absolute top-1/2 size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full ${SEGNO_TONO[giudizio.tone]}`}
          style={{ left: pos(valore) }}
        />
      </div>
    </Lastra>
  );
}

/** 02 — Un solo motore, quattro superfici: un albero, come lo stamperebbe un terminale. */
function RepertoMotore() {
  const rami = ["portafoglio", "analisi", "simulatore", "report PDF"];
  return (
    <Lastra didascalia="Nessuna superficie ricalcola per conto suo.">
      <pre className="cifre m-0 text-[0.8125rem] leading-[1.75] whitespace-pre">
        <span className="font-semibold text-accento">analizza</span>
        <span className="text-testo-attenuato">(bilancio, previsionale)</span>
        {"\n"}
        {rami.map((r, i) => (
          <span key={r}>
            <span className="text-testo-attenuato">{i === rami.length - 1 ? " └─ " : " ├─ "}</span>
            {r}
            {i < rami.length - 1 ? "\n" : ""}
          </span>
        ))}
      </pre>
    </Lastra>
  );
}

/** 03 — Dal dato al consiglio: il giudizio vero, con lettura e azione. */
function RepertoConsiglio() {
  const g = ANALISI_ESEMPIO.giudizi.dscrPro;
  return (
    <Lastra didascalia="Testo del motore, com'è nell'analisi e nel report.">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <span className="text-xs">
          <Giudizio tono={g.tone}>{g.label}</Giudizio>
        </span>
        <span className="text-sm font-medium">{g.testo}</span>
      </div>
      <p className="mt-3 border-t border-bordo pt-3 text-sm leading-[1.55]">
        <span className="etichetta mr-2 text-testo-attenuato">Azione</span>
        {g.azione}
      </p>
    </Lastra>
  );
}

/** 04 — Le formule, con il conto fatto sui numeri dell'esempio. */
function RepertoFormule() {
  const b = BILANCIO_ESEMPIO;
  const i = ANALISI_ESEMPIO.indicatori;
  const righe = [
    {
      nome: "ROS",
      formula: "RO / Valore della produzione",
      conto: `${formatEuro(b.ro)} / ${formatEuro(b.valProd)}`,
      esito: `${formatNumero(i.ros!, 1)}%`,
    },
    {
      nome: "GI",
      formula: "PFN / EBITDA",
      conto: `${formatEuro(b.pfn)} / ${formatEuro(b.ebitda)}`,
      esito: `${formatNumero(i.gi!, 1)} anni`,
    },
    {
      nome: "DSCR",
      formula: "Flusso di cassa / Servizio del debito",
      conto: `${formatEuro(b.flussoCassa)} / ${formatEuro(b.servizioDebito)}`,
      esito: formatNumero(i.dscr!, 2),
    },
  ];
  return (
    <Lastra didascalia="Le stesse formule del manuale di analisi di bilancio.">
      <dl className="m-0 divide-y divide-bordo">
        {righe.map((r) => (
          <div key={r.nome} className="py-2.5 first:pt-0 last:pb-0">
            <dt className="flex items-baseline justify-between gap-3 text-sm">
              <span>
                <span className="font-semibold">{r.nome}</span>
                <span className="text-testo-attenuato"> = {r.formula}</span>
              </span>
            </dt>
            <dd className="cifre m-0 mt-0.5 flex items-baseline justify-between gap-3 text-xs text-testo-attenuato">
              <span className="truncate">{r.conto}</span>
              <span className="text-sm font-semibold whitespace-nowrap text-testo">{r.esito}</span>
            </dd>
          </div>
        ))}
      </dl>
    </Lastra>
  );
}

/**
 * 05 — Il verbale della verifica. I bilanci sono quelli veri dell'archivio, ma
 * qui non compare NIENTE di loro, nemmeno il punteggio: sono clienti reali del
 * committente. Si dice cosa si controlla, non cosa si è trovato.
 */
function RepertoVerifica() {
  const voci = ["punteggio di sintesi", "giudizio di ogni indicatore", "testi e azioni"];
  return (
    <Lastra didascalia="Il controllo gira da solo a ogni modifica del codice.">
      <p className="cifre m-0 text-xs text-testo-attenuato">
        2 bilanci reali · report già consegnati
      </p>
      <ul className="m-0 mt-2.5 space-y-1.5 p-0">
        {voci.map((v) => (
          <li key={v} className="flex items-center justify-between gap-4 text-sm">
            <span>{v}</span>
            <span className="cifre text-xs text-ottimo-testo">identico</span>
          </li>
        ))}
      </ul>
    </Lastra>
  );
}

/**
 * LO SCHEMA, NON QUATTRO FRASI (29/09). La riservatezza è un'architettura, e
 * un'architettura si disegna: due corsie separate dentro il confine europeo, la
 * striscia di un mese di copie, e una riga di registro tecnico com'è davvero.
 * I quattro testi restano, come didascalie di ciò che si vede.
 */
export function Riservatezza() {
  const [separati, europa, copie, registri] = RISERVATEZZA.punti;
  return (
    <section
      id="riservatezza"
      aria-labelledby="titolo-riservatezza"
      className="scroll-mt-20 bg-tonale"
    >
      <Contenitore className="py-20 md:py-28">
        <div className="comparsa max-w-[40rem]">
          <Occhiello>{RISERVATEZZA.occhiello}</Occhiello>
          <Titolo2 id="titolo-riservatezza">{RISERVATEZZA.titolo}</Titolo2>
        </div>

        <div className="comparsa mt-12 grid gap-10 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)] lg:gap-14">
          <SchemaCorsie />
          <dl className="m-0 space-y-6 self-center">
            <Voce titolo={separati.titolo} testo={separati.testo} />
            <Voce titolo={europa.titolo} testo={europa.testo} />
          </dl>
        </div>

        <div className="mt-12 grid gap-10 border-t border-bordo pt-10 md:grid-cols-2 md:gap-14">
          <div className="comparsa">
            <StrisciaCopie />
            <dl className="m-0 mt-6">
              <Voce titolo={copie.titolo} testo={copie.testo} />
            </dl>
          </div>
          <div className="comparsa">
            <RigaRegistro />
            <dl className="m-0 mt-6">
              <Voce titolo={registri.titolo} testo={registri.testo} />
            </dl>
          </div>
        </div>
      </Contenitore>
    </section>
  );
}

function Voce({ titolo, testo }: { titolo: string; testo: string }) {
  return (
    <div>
      <dt className="text-[1.0625rem] font-semibold">{titolo}</dt>
      <dd className="m-0 mt-1.5 max-w-[32rem] text-[0.9375rem] leading-[1.6] text-testo-attenuato">
        {testo}
      </dd>
    </div>
  );
}

/** Due studi, due corsie, niente in comune. Tutto dentro il confine europeo. */
function SchemaCorsie() {
  const corsia = (nome: string, tuo: boolean) => (
    <div>
      <p className={`text-sm font-semibold ${tuo ? "text-testo" : "text-testo-attenuato"}`}>
        {nome}
      </p>
      <div className="mt-2.5 flex items-center">
        {["Server dedicato", "Database", "Copie cifrate"].map((n, i) => (
          <Fragment key={n}>
            {i > 0 && <span className="h-px min-w-3 flex-1 bg-bordo" />}
            <span
              className={`rounded-[0.4rem] border px-2.5 py-1.5 text-xs whitespace-nowrap sm:px-3 sm:text-[0.8125rem] ${tuo ? "border-accento/50 bg-superficie text-testo" : "border-bordo bg-superficie text-testo-attenuato"}`}
            >
              {n}
            </span>
          </Fragment>
        ))}
      </div>
    </div>
  );
  return (
    <figure className="m-0" aria-labelledby="schema-corsie">
      <div className="relative rounded-[0.8rem] border border-dashed border-bordo px-4 pt-9 pb-5 sm:px-6">
        <p className="etichetta absolute top-3 left-4 text-testo-attenuato sm:left-6">
          Unione europea
        </p>
        {corsia("Il tuo studio", true)}
        <div className="my-4 flex items-center gap-3" aria-hidden>
          <span className="h-px flex-1 border-t border-dashed border-bordo" />
          <span className="etichetta text-testo-attenuato">nessun collegamento</span>
          <span className="h-px flex-1 border-t border-dashed border-bordo" />
        </div>
        {corsia("Un altro studio", false)}
      </div>
      <figcaption id="schema-corsie" className="sr-only">
        Schema: ogni studio ha un server dedicato, un database e copie cifrate propri, senza
        collegamenti con quelli di un altro studio, tutto in data center dell&apos;Unione europea.
      </figcaption>
    </figure>
  );
}

/** Un mese di copie: una tacca al giorno, e il giorno della prova di ripristino. */
function StrisciaCopie() {
  const giorni = 30;
  return (
    <figure className="m-0">
      <div className="flex h-10 items-end gap-[3px]" aria-hidden>
        {Array.from({ length: giorni }, (_, i) => {
          const prova = i === giorni - 1;
          return (
            <span
              key={i}
              className={`flex-1 rounded-[1px] ${prova ? "h-full bg-accento" : "h-1/2 bg-testo-attenuato/30"}`}
            />
          );
        })}
      </div>
      <figcaption className="mt-2.5 flex justify-between gap-4 text-xs text-testo-attenuato">
        <span>una copia cifrata al giorno</span>
        <span className="text-accento">prova di ripristino, ogni mese</span>
      </figcaption>
    </figure>
  );
}

/** Cosa vede davvero il monitoraggio: tempi ed esiti, mai una cifra di bilancio. */
function RigaRegistro() {
  const righe = [
    ["09:14:02", "GET ", "/clienti", "200", "84 ms"],
    ["09:14:07", "POST", "/analisi", "200", "212 ms"],
    ["09:14:11", "GET ", "/report ", "200", "486 ms"],
  ];
  return (
    <figure className="m-0">
      <pre className="cifre m-0 overflow-x-auto rounded-[0.6rem] bg-superficie px-4 py-3 text-xs leading-[1.8] whitespace-pre text-testo-attenuato">
        {righe.map((r, i) => (
          <span key={i}>
            {r[0]} {r[1]} <span className="text-testo">{r[2]}</span> {r[3]} {r[4]}
            {i < righe.length - 1 ? "\n" : ""}
          </span>
        ))}
      </pre>
      <figcaption className="mt-2.5 text-xs text-testo-attenuato">
        Esempio di registro tecnico: percorso, esito, tempo. Nessun importo.
      </figcaption>
    </figure>
  );
}

/**
 * FAQ con `<details>` nativo: zero JavaScript, tastiera e lettori di schermo
 * funzionano da soli. Lo stesso array alimenta il JSON-LD `FAQPage`.
 */
export function Domande() {
  return (
    <section id="domande" aria-labelledby="titolo-domande" className="scroll-mt-20">
      <Contenitore className="grid gap-10 py-24 md:py-32 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.5fr)] lg:gap-16">
        <div className="comparsa">
          <Occhiello>Domande</Occhiello>
          <Titolo2 id="titolo-domande">Quello che di solito ci chiedono.</Titolo2>
        </div>
        <div className="border-t border-bordo">
          {DOMANDE.map((d) => (
            <details key={d.domanda} className="group border-b border-filetto">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-6 py-5 text-[1.0625rem] font-semibold [&::-webkit-details-marker]:hidden">
                {d.domanda}
                <ChevronDown
                  className="size-5 shrink-0 text-testo-attenuato transition-transform duration-200 ease-[var(--ease-uscita)] group-open:rotate-180"
                  aria-hidden
                />
              </summary>
              <p className="max-w-[60ch] pb-6 text-[0.9375rem] leading-[1.65] text-testo-attenuato">
                {d.risposta}
              </p>
            </details>
          ))}
        </div>
      </Contenitore>
    </section>
  );
}
