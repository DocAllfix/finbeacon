import { existsSync } from "node:fs";
import { join } from "node:path";

import { FASCE_SALUTE, formatNumero, SOGLIE_GIUDIZIO } from "@finbeacon/engine";
import { ArrowRight } from "lucide-react";
import Link from "next/link";

import { CollegamentoAFilo, Contenitore, Occhiello, PulsantePrimario } from "@/components/base";
import { Logotipo } from "@/components/marchio";
import { PannelloCliente, type ModoPannello } from "@/components/pannello-cliente";
import { URL_DEMO_PUBBLICA } from "@/lib/configurazione";
import { HERO, VOCI_MENU } from "@/lib/contenuti";
import { guidePubblicate } from "@/lib/guide";
import { ORDINE } from "@/lib/indicatori";
import {
  APERTURA_PREDEFINITA,
  APERTURE,
  TASTI,
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

/*
 * Due verbi, mai confusi (29/09): «demo» è SOLO quella che si apre subito. Il
 * contatto umano si chiama «Parla con noi».
 */
function AzioniAttuali() {
  return URL_DEMO_PUBBLICA ? (
    <>
      <PulsantePrimario href={URL_DEMO_PUBBLICA}>Prova la demo</PulsantePrimario>
      <CollegamentoAFilo href="#richiesta">Parla con noi</CollegamentoAFilo>
    </>
  ) : (
    <PulsantePrimario href="#richiesta">Parla con noi</PulsantePrimario>
  );
}

/*
 * I tasti in prova (11/10, solo anteprima, ?t=). L'utente trova i tasti attuali
 * «da AI»: la cella scura con la freccia incassata è il pulsante di serie dei
 * modelli, e la coppia pieno + sottolineato a destra del sottotitolo è lo
 * schema «titolo, sottotitolo, due tasti». Se la demo non è configurata
 * l'azione principale resta il contatto, come sempre.
 */
const DEMO = URL_DEMO_PUBBLICA ?? "#richiesta";
const ETICHETTA_DEMO = URL_DEMO_PUBBLICA ? "Prova la demo" : "Parla con noi";

/** Il tasto pieno, senza cella: la freccia arriva solo al passaggio. */
function TastoPieno({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="tasto-pieno inline-flex h-12 items-center gap-2 rounded-[0.375rem] bg-accento pr-5 pl-6 text-[0.9375rem] font-medium whitespace-nowrap text-su-accento"
    >
      {children}
      <ArrowRight className="tasto-pieno-freccia size-4" aria-hidden />
    </Link>
  );
}

function AzioniPiene() {
  return (
    <>
      <TastoPieno href={DEMO}>{ETICHETTA_DEMO}</TastoPieno>
      {URL_DEMO_PUBBLICA && (
        <Link
          href="#richiesta"
          className="py-3 text-[0.9375rem] font-medium text-testo-attenuato hover:text-testo"
        >
          Parla con noi
        </Link>
      )}
    </>
  );
}

function AzioniTesto() {
  return (
    <>
      <Link
        href={DEMO}
        className="tasto-testo group inline-flex items-center gap-2 py-2 font-[family-name:var(--font-titoli)] text-[1.375rem] font-semibold tracking-[-0.015em] whitespace-nowrap text-testo"
      >
        <span className="relative">
          {ETICHETTA_DEMO}
          <span className="tasto-testo-filo absolute inset-x-0 -bottom-0.5 h-0.5 bg-accento" />
        </span>
        <ArrowRight className="tasto-testo-freccia size-5 text-accento" aria-hidden />
      </Link>
      {URL_DEMO_PUBBLICA && (
        <span className="text-[0.9375rem] text-testo-attenuato">
          o{" "}
          <Link href="#richiesta" className="font-medium text-testo hover:text-accento">
            parla con noi
          </Link>
        </span>
      )}
    </>
  );
}

/** Opzione 4: nella riga del titolo resta il contatto, la demo sta nel pannello. */
function AzioniNelPannello() {
  return (
    <Link
      href="#richiesta"
      className="inline-flex items-center gap-2 py-3 text-[0.9375rem] font-medium text-testo-attenuato hover:text-testo"
    >
      Parla con noi
      <ArrowRight className="size-4" aria-hidden />
    </Link>
  );
}

function PiedePannello() {
  return (
    <div
      data-tasti-v="4"
      className="flex-wrap items-center justify-between gap-x-6 gap-y-3 border-t border-filetto px-5 py-4 sm:px-7"
    >
      <p className="text-[0.9375rem] text-testo-attenuato">
        Hai mosso un cliente inventato. Nella demo c&apos;è un portafoglio intero.
      </p>
      <TastoPieno href={DEMO}>{URL_DEMO_PUBBLICA ? "Apri la demo" : "Parla con noi"}</TastoPieno>
    </div>
  );
}

function AzioniCoppia() {
  return (
    <span className="inline-flex items-center rounded-[0.55rem] border border-bordo bg-superficie p-1">
      <Link
        href={DEMO}
        className="tasto-pieno inline-flex h-10 items-center rounded-[0.375rem] bg-accento px-5 text-[0.9375rem] font-medium whitespace-nowrap text-su-accento"
      >
        {ETICHETTA_DEMO}
      </Link>
      {URL_DEMO_PUBBLICA && (
        <Link
          href="#richiesta"
          className="inline-flex h-10 items-center px-5 text-[0.9375rem] font-medium whitespace-nowrap text-testo-attenuato hover:text-testo"
        >
          Parla con noi
        </Link>
      )}
    </span>
  );
}

const TASTI_RESI = {
  "1": AzioniAttuali,
  "2": AzioniPiene,
  "3": AzioniTesto,
  "4": AzioniNelPannello,
  "5": AzioniCoppia,
} as const;

/*
 * Due verbi, mai confusi (29/09): «demo» è SOLO quella che si apre subito. Il
 * contatto umano si chiama «Parla con noi».
 */
function Azioni({ className = "" }: { className?: string }) {
  const classi = `flex-wrap items-center gap-x-7 gap-y-3 ${className}`;
  if (!VARIANTI_IN_PROVA) {
    return (
      <div className={`flex ${classi}`}>
        <AzioniAttuali />
      </div>
    );
  }
  return (
    <>
      {TASTI.map(({ id }) => {
        const Resa = TASTI_RESI[id];
        return (
          <div key={id} data-tasti-v={id} className={classi}>
            <Resa />
          </div>
        );
      })}
    </>
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
function AperturaNumero({ idTitolo, prova, modo }: PropsApertura & { modo: ModoPannello }) {
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
          <PannelloCliente modo={modo} piede={VARIANTI_IN_PROVA ? <PiedePannello /> : null} />
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

const COMPOSIZIONI: Record<Apertura, (p: PropsApertura) => React.ReactNode> = {
  a: (p) => <AperturaNumero {...p} modo="fermo" />,
  h: (p) => <AperturaNumero {...p} modo="avviso" />,
  i: (p) => <AperturaNumero {...p} modo="prova" />,
  l: (p) => <AperturaNumero {...p} modo="portafoglio" />,
};

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
    // Fascia sottile (11/10): dopo il pannello dell'apertura un secondo blocco tonale pesava troppo.
    <section aria-labelledby="titolo-prospetto">
      <Contenitore className="grid gap-8 border-t border-filetto py-10 md:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)] md:gap-14">
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
