import { existsSync } from "node:fs";
import { join } from "node:path";

import { FASCE_SALUTE, formatNumero, SOGLIE_GIUDIZIO } from "@finbeacon/engine";
import { ArrowDown, ArrowRight } from "lucide-react";
import Link from "next/link";

import { CollegamentoAFilo, Contenitore, Occhiello, PulsantePrimario } from "@/components/base";
import { Logotipo } from "@/components/marchio";
import { PannelloCliente } from "@/components/pannello-cliente";
import { URL_DEMO_PUBBLICA } from "@/lib/configurazione";
import { HERO, VOCI_MENU } from "@/lib/contenuti";
import { guidePubblicate } from "@/lib/guide";
import { ORDINE } from "@/lib/indicatori";
import { SOGLIA_DSCR6M } from "@/lib/esempio";

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
 * L'apertura (11/10, scelta del committente fra le prove della PR #36).
 *
 * Prima: testo a sinistra e una cornice scura con un documento inclinato e
 * schede sospese, la stessa composizione di Evalis Deck. Ora, sui riferimenti
 * di Linear e Ramp: titolo e una scheda di tre righe, una riga ponte che dice
 * cosa fare, e un solo pannello largo, la scheda di un cliente con la leva
 * della liquidità. La demo si offre dentro il pannello, dopo averlo provato.
 *
 * Due verbi, mai confusi (29/09): «demo» è SOLO quella che si apre subito; il
 * contatto umano si chiama «Parla con noi». Senza demo configurata, il tasto
 * del pannello diventa il contatto.
 */
export function Hero() {
  const righe = [
    ["Indicatori di bilancio", `${ORDINE.length}, con soglia e giudizio`],
    ["DSCR a 6 mesi", `soglia ${formatNumero(SOGLIA_DSCR6M, 2)} · art. 3 CCII`],
    ["Report", "per il cliente e per la banca"],
  ] as const;
  return (
    <section aria-labelledby="titolo-principale" className="relative overflow-x-clip">
      <Contenitore className="pt-14 md:pt-20 lg:pt-24">
        <div className="grid gap-y-8 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)] lg:items-end lg:gap-x-16">
          <div>
            <Occhiello>{HERO.occhiello}</Occhiello>
            <h1
              id="titolo-principale"
              className="mt-4 max-w-[17ch] text-[clamp(2.5rem,1.2rem+4.6vw,5rem)] leading-[1.02] font-semibold tracking-[-0.035em] text-balance"
            >
              {HERO.titolo}
            </h1>
          </div>
          <dl className="border-t border-testo text-[0.9375rem]">
            {righe.map(([voce, valore]) => (
              <div
                key={voce}
                className="flex items-baseline justify-between gap-4 border-b border-filetto py-3"
              >
                <dt className="text-testo-attenuato">{voce}</dt>
                <dd className="text-right font-medium">{valore}</dd>
              </div>
            ))}
          </dl>
        </div>

        {/* Il ponte: dice che il pannello qui sotto si muove. */}
        <div className="mt-10 flex flex-col gap-y-4 border-t border-filetto pt-5 sm:flex-row sm:items-center sm:justify-between sm:gap-x-8">
          <p className="flex items-center gap-2.5 text-[0.9375rem] font-medium">
            <ArrowDown className="size-4 shrink-0 text-accento" aria-hidden />
            Prova su un cliente d&apos;esempio: sposta la sua liquidità.
          </p>
          {URL_DEMO_PUBBLICA && (
            <Link
              href="#richiesta"
              className="inline-flex shrink-0 items-center gap-2 py-3 text-[0.9375rem] font-medium text-testo-attenuato hover:text-testo"
            >
              Parla con noi
              <ArrowRight className="size-4" aria-hidden />
            </Link>
          )}
        </div>
      </Contenitore>

      {/* Il pannello sta su una fascia a puntini che parte a metà della sua altezza: lo «appoggia». */}
      <div className="relative mt-10 pb-20 lg:pb-24">
        <div
          className="puntinato pointer-events-none absolute inset-x-0 top-24 bottom-0"
          aria-hidden
        />
        <Contenitore className="relative">
          <PannelloCliente
            piede={
              <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3 border-t border-filetto px-5 py-4 sm:px-7">
                <p className="text-[0.9375rem] text-testo-attenuato">
                  Hai mosso un cliente inventato. Nella demo c&apos;è un portafoglio intero.
                </p>
                {URL_DEMO_PUBBLICA ? (
                  <PulsantePrimario href={URL_DEMO_PUBBLICA}>Apri la demo</PulsantePrimario>
                ) : (
                  <PulsantePrimario href="#richiesta">Parla con noi</PulsantePrimario>
                )}
              </div>
            }
          />
          <p className="mt-4 text-xs text-testo-attenuato">
            Esempio con dati inventati, calcolato dal motore di FinBeacon.
          </p>
        </Contenitore>
      </div>
    </section>
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
