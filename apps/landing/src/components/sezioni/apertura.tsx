import { existsSync } from "node:fs";
import { join } from "node:path";

import { FASCE_SALUTE, formatNumero, SOGLIE_GIUDIZIO } from "@finbeacon/engine";
import { ArrowRight } from "lucide-react";
import Link from "next/link";

import { CollegamentoAFilo, Contenitore, Occhiello, PulsantePrimario } from "@/components/base";
import { GraficoSoglia } from "@/components/grafico-soglia";
import { Giudizio } from "@/components/giudizio";
import { Logotipo } from "@/components/marchio";
import { ProvaDscr } from "@/components/prova-dscr";
import { URL_DEMO_PUBBLICA } from "@/lib/configurazione";
import { HERO, VOCI_MENU } from "@/lib/contenuti";
import {
  ANALISI_ESEMPIO,
  CLIENTE_ESEMPIO,
  SERIE_DSCR6M,
  SOGLIA_DSCR6M,
  STUDIO_ESEMPIO,
} from "@/lib/esempio";
import { sinteticoDaScore } from "@/lib/fasce";
import { guidePubblicate } from "@/lib/guide";
import { ORDINE } from "@/lib/indicatori";
import { PORTAFOGLIO_ESEMPIO } from "@/lib/portafoglio-esempio";
import { APERTURA_PREDEFINITA, APERTURE, VARIANTI_IN_PROVA, type Apertura } from "@/lib/varianti";

/** Il report d'esempio si offre solo se il file c'è davvero: niente link rotti. */
const REPORT_ESEMPIO = "/report-esempio.pdf";
export const reportEsempioPresente = existsSync(join(process.cwd(), "public", REPORT_ESEMPIO));

export function Intestazione() {
  const ciSonoGuide = guidePubblicate().length > 0;
  return (
    <header className="sticky top-0 z-40 border-b border-filetto bg-fondo">
      <Contenitore className="flex h-16 items-center justify-between gap-6">
        <Link href="/" className="-m-2 p-2 text-testo" aria-label="FinBeacon, torna all'inizio">
          <Logotipo className="h-6 w-auto" titolo="FinBeacon" />
        </Link>
        <nav aria-label="Sezioni" className="hidden lg:block">
          <ul className="flex items-center gap-7 text-[0.9375rem] text-testo-attenuato">
            {/*
             * `/#…` e non `#…`: la testata compare anche sulle pagine legali e
             * sulle guide, dove `#metodo` puntava a un'ancora inesistente.
             */}
            {VOCI_MENU.map((v) => (
              <li key={v.href}>
                <a href={`/${v.href}`} className="py-2 hover:text-testo">
                  {v.testo}
                </a>
              </li>
            ))}
            {ciSonoGuide && (
              <li>
                <Link href="/guide" className="py-2 hover:text-testo">
                  Guide
                </Link>
              </li>
            )}
          </ul>
        </nav>
        {/*
         * Le stesse due azioni dell'hero, nello stesso ordine, e restano con
         * chi scorre (29/09, richiesta del committente). «Parla con noi» si
         * ritira sotto i 640px: logo e due azioni non ci stanno in 375px, e
         * l'azione che resta è quella che si fa subito.
         */}
        <div className="flex items-center gap-5">
          {URL_DEMO_PUBBLICA ? (
            <>
              {/* Contenitore a parte: `hidden` sul collegamento perderebbe contro il suo `inline-flex`. */}
              <span className="hidden sm:contents">
                <CollegamentoAFilo href="/#richiesta" compatto>
                  Parla con noi
                </CollegamentoAFilo>
              </span>
              <PulsantePrimario href={URL_DEMO_PUBBLICA} compatto>
                Prova la demo
              </PulsantePrimario>
            </>
          ) : (
            <PulsantePrimario href="/#richiesta" compatto>
              Parla con noi
            </PulsantePrimario>
          )}
        </div>
      </Contenitore>
    </header>
  );
}

/*
 * L'apertura (11/10). Prima: testo a sinistra e, a destra, una cornice scura con
 * un documento inclinato e schede sospese, la stessa composizione di Evalis
 * Deck. Ora tre composizioni in prova (vedi `lib/varianti.ts`), tutte con al
 * massimo quattro elementi di testo: occhiello, titolo, sottotitolo, azioni. Il
 * paragrafo lungo e la rassicurazione sono scesi nel Prospetto.
 */

/** Il segno dell'evidenziatore sulle parole chiave: invisibile, salvo la palette 4. */
function evidenziato(testo: string, parole: string) {
  const i = testo.indexOf(parole);
  if (i < 0) return testo;
  return (
    <>
      {testo.slice(0, i)}
      <mark className="evidenzia">{parole}</mark>
      {testo.slice(i + parole.length)}
    </>
  );
}

function TitoloApertura({ id }: { id: string }) {
  return (
    <h1
      id={id}
      className="mt-4 text-[clamp(2.5rem,1.3rem+4.4vw,4.75rem)] leading-[1.02] font-semibold tracking-[-0.03em] text-balance"
    >
      {evidenziato(HERO.titolo, "la crisi")}
    </h1>
  );
}

/*
 * Due verbi, mai confusi (29/09): «demo» è SOLO quella che si apre subito. Il
 * contatto umano si chiama «Parla con noi».
 */
function Azioni({ className = "" }: { className?: string }) {
  return (
    <div className={`flex flex-wrap items-center gap-x-7 gap-y-3 ${className}`}>
      {URL_DEMO_PUBBLICA ? (
        <>
          <PulsantePrimario href={URL_DEMO_PUBBLICA}>Prova la demo</PulsantePrimario>
          <CollegamentoAFilo href="#richiesta">Parla con noi</CollegamentoAFilo>
        </>
      ) : (
        <PulsantePrimario href="#richiesta">Parla con noi</PulsantePrimario>
      )}
    </div>
  );
}

type PropsApertura = { idTitolo: string; prova?: Apertura };

/**
 * A · Numero, ricomposta (11/10) sui riferimenti di Linear e Ramp: un solo asse
 * a sinistra, titolo su due righe larghe, una riga con sottotitolo e azioni, e
 * sotto UN oggetto solo, largo quanto la pagina e tagliato dalla piega. Prima
 * erano due oggetti (la cifra e la scheda del grafico) in gara col titolo.
 *
 * Il pannello è la scheda di un cliente come la vede lo studio: la cifra con
 * soglia e giudizio a sinistra, la serie dei sei mesi a destra. Tutto dal motore.
 */
function AperturaNumero({ idTitolo, prova }: PropsApertura) {
  const dscr = ANALISI_ESEMPIO.indicatori.dscrProspettico!;
  const sintesi = sinteticoDaScore(ANALISI_ESEMPIO.score);
  const giudizio = ANALISI_ESEMPIO.giudizi.dscrPro;
  return (
    <section data-apertura={prova} aria-labelledby={idTitolo} className="relative overflow-x-clip">
      <Contenitore className="pt-14 md:pt-20 lg:pt-24">
        <Occhiello>{HERO.occhiello}</Occhiello>
        <h1
          id={idTitolo}
          className="mt-4 max-w-[17ch] text-[clamp(2.5rem,1.2rem+4.6vw,5rem)] leading-[1.02] font-semibold tracking-[-0.035em] text-balance"
        >
          {evidenziato(HERO.titolo, "la crisi")}
        </h1>
        <div className="mt-7 flex flex-col gap-y-7 lg:flex-row lg:items-center lg:justify-between lg:gap-x-12">
          <p className="max-w-[40rem] text-[clamp(1.0625rem,1rem+0.35vw,1.3125rem)] leading-snug text-pretty text-testo-attenuato">
            {HERO.sottotitolo}
          </p>
          <Azioni className="shrink-0" />
        </div>
      </Contenitore>

      {/* Il pannello sta su una fascia a puntini che parte a metà della sua altezza: lo «appoggia». */}
      <div className="relative mt-14 pb-20 lg:mt-16 lg:pb-24">
        <div
          className="puntinato pointer-events-none absolute inset-x-0 top-24 bottom-0"
          aria-hidden
        />
        <Contenitore className="relative">
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
                <p className="mt-2 font-[family-name:var(--font-titoli)] text-[clamp(4rem,2.6rem+4.5vw,6.25rem)] leading-[0.9] font-semibold tracking-[-0.045em] text-critico-testo tabular-nums">
                  {formatNumero(dscr, 2)}
                </p>
                <p className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-2 text-sm text-testo-attenuato">
                  <span className="text-xs">
                    <Giudizio tono={giudizio.tone}>{giudizio.label}</Giudizio>
                  </span>
                  <span className="cifre">
                    soglia {formatNumero(SOGLIA_DSCR6M, 2)} · art. 3 CCII
                  </span>
                </p>
                <p className="mt-5 max-w-[22rem] text-[0.9375rem] leading-[1.6] text-testo-attenuato">
                  Il bilancio dice «{sintesi.label.toLowerCase()}». La cassa dei prossimi sei mesi
                  non copre il debito.
                </p>
              </div>
              <div data-cornice className="px-5 pt-6 pb-5 text-testo sm:px-7 lg:pt-9">
                <p className="mb-5 text-sm text-testo-attenuato">Una rilevazione al mese</p>
                <GraficoSoglia
                  valori={SERIE_DSCR6M.map((r) => r.dscr6m)}
                  soglia={SOGLIA_DSCR6M}
                  etichette={SERIE_DSCR6M.map((r) => r.mese)}
                  animato
                />
              </div>
            </div>
          </figure>
          <div className="mt-4 flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 text-xs text-testo-attenuato">
            <span>Esempio con dati inventati, calcolato dal motore di FinBeacon.</span>
            {URL_DEMO_PUBBLICA && (
              <a
                href={URL_DEMO_PUBBLICA}
                className="inline-flex items-center gap-1.5 py-1 text-sm font-medium text-accento"
              >
                Provalo nella demo, su un altro cliente di esempio
                <ArrowRight className="size-3.5" aria-hidden />
              </a>
            )}
          </div>
        </Contenitore>
      </div>
    </section>
  );
}

/**
 * Testata delle aperture D-G: titolo a sinistra, sottotitolo a destra, nessun
 * pulsante. Le azioni vengono DOPO l'oggetto (il dato, la leva, i mesi, il
 * portafoglio): niente blocco «titolo + sottotitolo + due pulsanti», che
 * l'utente non vuole (resoconto di Axialoop, 11/10).
 */
function Testata({ idTitolo }: { idTitolo: string }) {
  return (
    <div className="grid gap-y-6 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)] lg:items-end lg:gap-x-16">
      <div>
        <Occhiello>{HERO.occhiello}</Occhiello>
        <TitoloApertura id={idTitolo} />
      </div>
      <p className="max-w-[26rem] text-[clamp(1.0625rem,1rem+0.3vw,1.25rem)] leading-snug text-testo-attenuato lg:pb-2">
        {HERO.sottotitolo}
      </p>
    </div>
  );
}

/** D · Prova. Il primo gesto sulla pagina è muovere la cassa e vedere il DSCR passare la soglia. */
function AperturaProva({ idTitolo, prova }: PropsApertura) {
  return (
    <section data-apertura={prova} aria-labelledby={idTitolo} className="relative overflow-x-clip">
      <Contenitore className="pt-14 pb-20 md:pt-20 lg:pt-24 lg:pb-24">
        <Testata idTitolo={idTitolo} />
        <div className="mt-12 grid gap-y-8 lg:mt-14 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:items-end lg:gap-x-16">
          <div className="order-2 lg:order-1">
            <p className="max-w-[24rem] text-[0.9375rem] leading-[1.6] text-testo-attenuato">
              {CLIENTE_ESEMPIO}: il punteggio dell&apos;anno è {ANALISI_ESEMPIO.score}, ma la cassa
              dei prossimi sei mesi non copre il debito. Prova a cambiarla.
            </p>
            <Azioni className="mt-7" />
          </div>
          <div className="order-1 lg:order-2">
            <ProvaDscr />
          </div>
        </div>
      </Contenitore>
    </section>
  );
}

/**
 * E · Linea. Una sola riga attraversa la pagina: la soglia. Il titolo sta
 * sopra, il DSCR del cliente è caduto sotto. Tipografia pura, niente grafico.
 */
function AperturaLinea({ idTitolo, prova }: PropsApertura) {
  const dscr = ANALISI_ESEMPIO.indicatori.dscrProspettico!;
  return (
    <section data-apertura={prova} aria-labelledby={idTitolo} className="relative overflow-x-clip">
      <Contenitore className="pt-14 md:pt-20 lg:pt-24">
        <Testata idTitolo={idTitolo} />
      </Contenitore>
      {/* La linea va da bordo a bordo della finestra: è la soglia, non un filetto di sezione. */}
      <Contenitore className="mt-12 flex justify-end lg:mt-16">
        <p className="cifre pb-2 text-xs text-testo-attenuato">
          soglia {formatNumero(SOGLIA_DSCR6M, 2)} · art. 3 CCII
        </p>
      </Contenitore>
      <div className="linea-soglia h-0.5 w-full origin-left bg-testo" aria-hidden />
      <Contenitore className="grid gap-y-8 pt-5 pb-20 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)] lg:items-end lg:gap-x-16 lg:pb-24">
        <div>
          <p className="text-sm text-testo-attenuato">
            {CLIENTE_ESEMPIO} · DSCR prospettico a 6 mesi
          </p>
          <p className="linea-caduta mt-1 font-[family-name:var(--font-titoli)] text-[clamp(6rem,3rem+12vw,13rem)] leading-[0.85] font-semibold tracking-[-0.05em] text-critico-testo tabular-nums">
            {formatNumero(dscr, 2)}
          </p>
        </div>
        <div className="lg:pb-4">
          <p className="max-w-[24rem] text-[0.9375rem] leading-[1.6] text-testo-attenuato">
            Il punteggio dell&apos;anno dice {ANALISI_ESEMPIO.score}. La cassa è già sotto la linea:
            FinBeacon lo segnala sei mesi prima.
          </p>
          <Azioni className="mt-7" />
        </div>
      </Contenitore>
    </section>
  );
}

/**
 * F · Sei mesi. La cassa letta come un registro: sei rilevazioni, una per
 * mese, e il filetto rosso dove il DSCR passa sotto soglia. Valori dal motore.
 */
function AperturaMesi({ idTitolo, prova }: PropsApertura) {
  const primoSotto = SERIE_DSCR6M.findIndex((r) => r.dscr6m < SOGLIA_DSCR6M);
  return (
    <section data-apertura={prova} aria-labelledby={idTitolo} className="relative overflow-x-clip">
      <Contenitore className="pt-14 pb-20 md:pt-20 lg:pt-24 lg:pb-24">
        <Testata idTitolo={idTitolo} />
        <figure className="mt-12 lg:mt-16">
          <figcaption className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 border-t border-testo pt-3 text-sm text-testo-attenuato">
            <span>{CLIENTE_ESEMPIO} · DSCR prospettico, una rilevazione al mese</span>
            <span className="cifre text-xs">soglia {formatNumero(SOGLIA_DSCR6M, 2)}</span>
          </figcaption>
          <ol className="mesi-registro mt-6 grid grid-cols-3 gap-y-8 lg:grid-cols-6">
            {SERIE_DSCR6M.map((r, i) => {
              const sotto = r.dscr6m < SOGLIA_DSCR6M;
              return (
                <li
                  key={r.mese}
                  style={{ "--i": i } as React.CSSProperties}
                  className={`relative pr-3 pl-4 ${i === primoSotto ? "border-l-2 border-critico" : "border-l border-filetto"}`}
                >
                  <span className="cifre block text-xs text-testo-attenuato">{r.mese}</span>
                  <span
                    className={`mt-1 block font-[family-name:var(--font-titoli)] text-[clamp(2.25rem,1.4rem+3vw,4rem)] leading-none font-semibold tracking-[-0.03em] tabular-nums ${sotto ? "text-critico-testo" : "text-testo"}`}
                  >
                    {formatNumero(r.dscr6m, 2)}
                  </span>
                  {i === primoSotto && (
                    <span className="mt-2 block text-xs font-medium text-critico-testo">
                      sotto soglia
                    </span>
                  )}
                </li>
              );
            })}
          </ol>
        </figure>
        <div className="mt-12 flex flex-wrap items-center justify-between gap-x-10 gap-y-6">
          <p className="max-w-[30rem] text-[0.9375rem] leading-[1.6] text-testo-attenuato">
            Il bilancio dell&apos;anno non è cambiato. La cassa sì, mese dopo mese.
          </p>
          <Azioni />
        </div>
      </Contenitore>
    </section>
  );
}

/**
 * G · Portafoglio. «Cliente per cliente» preso alla lettera: lo studio vede
 * tutti i suoi clienti in un registro, e la riga che scende sotto soglia si
 * accende. Cinque clienti inventati, giudizi dal motore.
 */
function AperturaPortafoglio({ idTitolo, prova }: PropsApertura) {
  return (
    <section data-apertura={prova} aria-labelledby={idTitolo} className="relative overflow-x-clip">
      <Contenitore className="pt-14 pb-20 md:pt-20 lg:pt-24 lg:pb-24">
        <Testata idTitolo={idTitolo} />
        <figure className="mt-12 lg:mt-16">
          <table className="w-full border-t border-testo text-left">
            <caption className="sr-only">
              Portafoglio di uno studio di esempio, con dati inventati
            </caption>
            <thead>
              <tr className="text-xs text-testo-attenuato">
                <th scope="col" className="py-3 font-normal">
                  {STUDIO_ESEMPIO}
                </th>
                <th scope="col" className="hidden py-3 text-right font-normal sm:table-cell">
                  Punteggio
                </th>
                <th scope="col" className="py-3 text-right font-normal">
                  DSCR 6 mesi
                </th>
                <th scope="col" className="hidden py-3 pl-6 font-normal md:table-cell">
                  Giudizio
                </th>
              </tr>
            </thead>
            <tbody>
              {PORTAFOGLIO_ESEMPIO.map((c, i) => {
                const dscr = c.analisi.indicatori.dscrProspettico;
                const g = c.analisi.giudizi.dscrPro;
                return (
                  <tr
                    key={c.nome}
                    style={{ "--i": i } as React.CSSProperties}
                    className={`registro-riga border-t border-filetto ${c.dscr6mSotto ? "bg-critico-fondo" : ""}`}
                  >
                    <th
                      scope="row"
                      className={`py-4 pr-4 pl-3 text-[0.9375rem] ${c.dscr6mSotto ? "font-semibold" : "font-medium"}`}
                    >
                      {c.nome}
                    </th>
                    <td className="cifre hidden py-4 text-right sm:table-cell">
                      {c.analisi.score}
                    </td>
                    <td
                      className={`cifre py-4 pr-3 text-right text-lg ${c.dscr6mSotto ? "font-semibold text-critico-testo" : ""}`}
                    >
                      {dscr === null ? "n.d." : formatNumero(dscr, 2)}
                    </td>
                    <td className="hidden py-4 pl-6 text-xs md:table-cell">
                      <Giudizio tono={g.tone}>{g.label}</Giudizio>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </figure>
        <div className="mt-10 flex flex-wrap items-center justify-between gap-x-10 gap-y-6">
          <p className="max-w-[30rem] text-[0.9375rem] leading-[1.6] text-testo-attenuato">
            {PORTAFOGLIO_ESEMPIO.filter((c) => c.dscr6mSotto).length} clienti su{" "}
            {PORTAFOGLIO_ESEMPIO.length} hanno la cassa sotto soglia: si chiamano per primi. Dati
            inventati.
          </p>
          <Azioni />
        </div>
      </Contenitore>
    </section>
  );
}

const COMPOSIZIONI = {
  a: AperturaNumero,
  d: AperturaProva,
  e: AperturaLinea,
  f: AperturaMesi,
  g: AperturaPortafoglio,
} as const;

export function Hero() {
  if (!VARIANTI_IN_PROVA) {
    const Scelta = COMPOSIZIONI[APERTURA_PREDEFINITA];
    return <Scelta idTitolo="titolo-principale" />;
  }
  return (
    <>
      {APERTURE.map(({ id }) => {
        const Composizione = COMPOSIZIONI[id];
        return (
          <Composizione
            key={id}
            prova={id}
            idTitolo={id === APERTURA_PREDEFINITA ? "titolo-principale" : `titolo-principale-${id}`}
          />
        );
      })}
    </>
  );
}

/**
 * «Cosa calcola»: non la fascia di numeri giganti con l'etichetta sotto (il
 * cliché dell'hero-metric), ma un prospetto, come una pagina di bilancio
 * stampata. Ogni valore esce dal motore al momento del build: niente contatori
 * che partono da zero e che un motore di ricerca leggerebbe come «0».
 */
export function Prospetto() {
  const voci = [
    {
      voce: "Indicatori di bilancio, ciascuno con soglia e giudizio",
      valore: String(ORDINE.length),
    },
    { voce: "Fasce di salute sul punteggio da 0 a 100", valore: String(FASCE_SALUTE.length) },
    {
      voce: "Soglia del DSCR prospettico a 6 mesi (art. 3 CCII)",
      valore: formatNumero(SOGLIE_GIUDIZIO.dscr6m.soglia, 2),
    },
    {
      voce: "Soglia del DSCR sull'esercizio",
      valore: formatNumero(SOGLIE_GIUDIZIO.dscr.soglia, 2),
    },
  ];
  return (
    <section aria-labelledby="titolo-prospetto" className="bg-tonale">
      <Contenitore className="grid gap-8 py-14 md:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)] md:gap-14">
        {/* Il paragrafo lungo e la rassicurazione stavano nell'apertura (fino all'11/10). */}
        <div>
          <h2
            id="titolo-prospetto"
            className="text-xl leading-snug font-semibold text-balance md:text-2xl"
          >
            Cosa calcola FinBeacon, per ogni cliente dello studio.
          </h2>
          <p className="mt-4 text-[0.9375rem] leading-[1.65] text-testo-attenuato">{HERO.testo}</p>
          <p className="mt-4 text-sm text-testo-attenuato">{HERO.rassicurazione}</p>
        </div>
        <dl className="border-t border-bordo">
          {voci.map((v) => (
            <div key={v.voce} className="flex items-baseline gap-4 border-b border-filetto py-3.5">
              <dt className="flex-1 text-[0.9375rem]">{v.voce}</dt>
              <dd className="cifre text-lg font-semibold">{v.valore}</dd>
            </div>
          ))}
        </dl>
      </Contenitore>
    </section>
  );
}
