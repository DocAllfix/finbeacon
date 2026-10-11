import { existsSync } from "node:fs";
import { join } from "node:path";

import { FASCE_SALUTE, formatNumero, SOGLIE_GIUDIZIO } from "@finbeacon/engine";
import { ArrowRight } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import { CollegamentoAFilo, Contenitore, Occhiello, PulsantePrimario } from "@/components/base";
import { GraficoSoglia } from "@/components/grafico-soglia";
import { Logotipo } from "@/components/marchio";
import { URL_DEMO_PUBBLICA } from "@/lib/configurazione";
import { HERO, VOCI_MENU } from "@/lib/contenuti";
import { ANALISI_ESEMPIO, CLIENTE_ESEMPIO, SERIE_DSCR6M, SOGLIA_DSCR6M } from "@/lib/esempio";
import { sinteticoDaScore } from "@/lib/fasce";
import { guidePubblicate } from "@/lib/guide";
import { ORDINE } from "@/lib/indicatori";
import {
  APERTURA_PREDEFINITA,
  APERTURE,
  VARIANTI_IN_PROVA,
  type Apertura,
} from "@/lib/varianti";

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

function TitoloApertura({ id }: { id: string }) {
  return (
    <h1
      id={id}
      className="mt-4 text-[clamp(2.5rem,1.3rem+4.4vw,4.75rem)] leading-[1.02] font-semibold tracking-[-0.03em] text-balance"
    >
      {HERO.titolo}
    </h1>
  );
}

function Sottotitolo() {
  return (
    <p className="text-[clamp(1.125rem,1rem+0.5vw,1.375rem)] leading-snug font-medium text-balance">
      {HERO.sottotitolo}
    </p>
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

function Didascalia({ testo, collegamento }: { testo: string; collegamento: string }) {
  return (
    <figcaption className="mt-4 flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 text-xs text-testo-attenuato">
      <span>{testo}</span>
      {URL_DEMO_PUBBLICA && (
        <a
          href={URL_DEMO_PUBBLICA}
          className="inline-flex items-center gap-1.5 py-1 text-sm font-medium text-accento"
        >
          {collegamento}
          <ArrowRight className="size-3.5" aria-hidden />
        </a>
      )}
    </figcaption>
  );
}

type PropsApertura = { idTitolo: string; prova?: Apertura };

/**
 * A · Numero. Il protagonista è il dato che Evalis Deck non può mostrare: il
 * DSCR prospettico che scende sotto soglia mentre il punteggio dell'anno è
 * ancora discreto. Cifra, soglia e serie escono dal motore.
 */
function AperturaNumero({ idTitolo, prova }: PropsApertura) {
  const dscr = ANALISI_ESEMPIO.indicatori.dscrProspettico!;
  const sintesi = sinteticoDaScore(ANALISI_ESEMPIO.score);
  return (
    <section
      data-apertura={prova}
      aria-labelledby={idTitolo}
      className="relative overflow-x-clip"
    >
      <div className="carta-rigata pointer-events-none absolute inset-0" aria-hidden />
      <Contenitore className="relative pt-14 pb-20 md:pt-20 lg:pt-24 lg:pb-24">
        <div className="grid gap-y-7 lg:grid-cols-[minmax(0,1.45fr)_minmax(0,1fr)] lg:items-end lg:gap-x-16">
          <div>
            <Occhiello>{HERO.occhiello}</Occhiello>
            <TitoloApertura id={idTitolo} />
          </div>
          <div className="lg:pb-2">
            <Sottotitolo />
            <Azioni className="mt-7" />
          </div>
        </div>

        <figure className="mt-14 grid gap-8 border-t border-testo pt-7 lg:mt-16 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.3fr)] lg:gap-14">
          <div>
            <p className="text-sm text-testo-attenuato">
              DSCR prospettico a 6 mesi · {CLIENTE_ESEMPIO}
            </p>
            {/* Nel carattere dei titoli: in Plex Mono, a questa misura, la virgola apriva un buco. */}
            <p className="mt-2 font-[family-name:var(--font-titoli)] text-[clamp(5rem,3rem+7vw,9.5rem)] leading-[0.9] font-semibold tracking-[-0.04em] text-critico-testo tabular-nums">

              {formatNumero(dscr, 2)}
            </p>
            <p className="mt-4 max-w-[26rem] text-[0.9375rem] leading-[1.6] text-testo-attenuato">
              Sotto la soglia di{" "}
              <span className="cifre text-testo">{formatNumero(SOGLIA_DSCR6M, 2)}</span> (art. 3
              CCII), mentre il punteggio sull&apos;esercizio è ancora{" "}
              <span className="cifre text-testo">{ANALISI_ESEMPIO.score}</span>, «
              {sintesi.label.toLowerCase()}». La cassa lo dice prima del bilancio.
            </p>
          </div>
          <div>
            <div
              data-cornice
              className="rounded-[var(--radius-scheda)] border border-bordo bg-superficie px-5 pt-4 pb-4 text-testo sm:px-6"
            >
              <div className="mb-4 flex items-baseline justify-between gap-4 text-xs text-testo-attenuato">
                <span>Sei rilevazioni mensili</span>
                <span className="cifre">soglia {formatNumero(SOGLIA_DSCR6M, 2)}</span>
              </div>
              <GraficoSoglia
                valori={SERIE_DSCR6M.map((r) => r.dscr6m)}
                soglia={SOGLIA_DSCR6M}
                etichette={SERIE_DSCR6M.map((r) => r.mese)}
                animato
              />
            </div>
            <Didascalia
              testo="Esempio con dati inventati, calcolato dal motore di FinBeacon."
              collegamento="Provalo nella demo, su un altro cliente di esempio"
            />
          </div>
        </figure>
      </Contenitore>
    </section>
  );
}

/**
 * Lo schermo vero della demo, che esce dal bordo destro della pagina: niente
 * finto prodotto disegnato in div. Sopra 1024px il margine negativo porta
 * l'immagine fino al bordo della finestra; la sezione taglia il resto.
 */
const FINO_AL_BORDO = "-mr-5 sm:-mr-8 lg:mr-[min(-2rem,calc(34rem_-_50vw))]";

/** B · Schermata. Titolo largo sopra, la pagina d'analisi della demo sotto, a tutta larghezza. */
function AperturaSchermata({ idTitolo, prova }: PropsApertura) {
  return (
    <section
      data-apertura={prova}
      aria-labelledby={idTitolo}
      className="relative overflow-x-clip"
    >
      <Contenitore className="pt-14 md:pt-20 lg:pt-24">
        <div className="grid gap-y-7 lg:grid-cols-[minmax(0,1.45fr)_minmax(0,1fr)] lg:items-end lg:gap-x-16">
          <div>
            <Occhiello>{HERO.occhiello}</Occhiello>
            <TitoloApertura id={idTitolo} />
          </div>
          <div className="lg:pb-2">
            <Sottotitolo />
            <Azioni className="mt-7" />
          </div>
        </div>
      </Contenitore>
      <Contenitore className="pt-12 pb-20 lg:pt-16 lg:pb-24">
        <figure className={`m-0 ${FINO_AL_BORDO}`}>
          <div className="overflow-hidden rounded-l-[0.9rem] border border-r-0 border-bordo">
            <Image
              src="/apertura/analisi.webp"
              alt="La pagina di analisi di un cliente nella demo di FinBeacon: punteggio 49 su 100, «Equilibrio fragile», l'azione prioritaria e gli indicatori con il loro giudizio."
              width={2880}
              height={1800}
              sizes="(min-width: 1024px) 85vw, 100vw"
              priority={!prova || prova === APERTURA_PREDEFINITA}
              className="h-auto w-full max-lg:aspect-[4/3] max-lg:object-cover max-lg:object-[28%_0%]"
            />
          </div>
          <Didascalia
            testo="La demo, così come si apre: un cliente di esempio con dati inventati."
            collegamento="Aprila e prova su questo cliente"
          />
        </figure>
      </Contenitore>
    </section>
  );
}

/** C · Affiancata. Testo a sinistra; a destra gli indicatori della demo, tagliati dal bordo. */
function AperturaAffiancata({ idTitolo, prova }: PropsApertura) {
  return (
    <section
      data-apertura={prova}
      aria-labelledby={idTitolo}
      className="relative overflow-x-clip"
    >
      <Contenitore className="grid items-center gap-x-14 gap-y-12 pt-14 pb-20 md:pt-20 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] lg:pt-24 lg:pb-28">
        <div className="max-w-[34rem]">
          <Occhiello>{HERO.occhiello}</Occhiello>
          <TitoloApertura id={idTitolo} />
          <div className="mt-6">
            <Sottotitolo />
          </div>
          <Azioni className="mt-9" />
        </div>
        <figure className={`m-0 ${FINO_AL_BORDO}`}>
          <div className="overflow-hidden rounded-l-[0.9rem] border border-r-0 border-bordo">
            <Image
              src="/apertura/indicatori.webp"
              alt="Nella demo di FinBeacon: grado di indebitamento buono, DSCR sull'esercizio 0,86 critico e DSCR prospettico a 6 mesi 0,39, sotto la soglia CNDCEC di 1,1, con le azioni consigliate."
              width={1560}
              height={1273}
              sizes="(min-width: 1024px) 55vw, 100vw"
              priority={!prova || prova === APERTURA_PREDEFINITA}
              className="h-auto w-full"
            />
          </div>
          <Didascalia
            testo="Dalla demo: dati inventati."
            collegamento="Aprila nella demo"
          />
        </figure>
      </Contenitore>
    </section>
  );
}

const COMPOSIZIONI = { a: AperturaNumero, b: AperturaSchermata, c: AperturaAffiancata } as const;

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
