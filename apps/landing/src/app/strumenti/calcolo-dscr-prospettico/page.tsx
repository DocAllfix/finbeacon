import type { Metadata } from "next";
import Link from "next/link";

import { CalcolatoreDscr } from "@/components/calcolatore-dscr";
import { CollegamentoAFilo, Contenitore, Occhiello, PulsantePrimario } from "@/components/base";
import { DatiStrutturati } from "@/components/dati-strutturati";
import { Intestazione } from "@/components/sezioni/apertura";
import { Piede } from "@/components/sezioni/chiusura";
import { URL_DEMO_PUBBLICA } from "@/lib/configurazione";
import { indirizzo, NOME, SITO } from "@/lib/indirizzo";

const PERCORSO = "/strumenti/calcolo-dscr-prospettico";
const TITOLO = "Calcolo del DSCR prospettico a 6 mesi";
const DESCRIZIONE =
  "Calcola gratis il DSCR prospettico a sei mesi dal budget di tesoreria, con il giudizio del motore di FinBeacon. Nessuna registrazione, i dati restano nel browser.";

export const metadata: Metadata = {
  title: TITOLO,
  description: DESCRIZIONE,
  alternates: { canonical: PERCORSO },
  openGraph: { url: PERCORSO, title: TITOLO, description: DESCRIZIONE },
};

/**
 * Lo strumento gratuito: il primo contenuto della landing che risponde a una
 * ricerca vera («calcolo dscr prospettico», dall'autocompletamento) e che può
 * prendere collegamenti spontanei. Chi lo usa ha già un budget di tesoreria in
 * mano: è il pubblico del prodotto.
 */
function schema(): Record<string, unknown> {
  const url = indirizzo(PERCORSO);
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebApplication",
        "@id": `${url}#strumento`,
        name: TITOLO,
        url,
        description: DESCRIZIONE,
        applicationCategory: "FinanceApplication",
        operatingSystem: "Web",
        inLanguage: "it-IT",
        isAccessibleForFree: true,
        provider: { "@id": `${SITO}/#organizzazione` },
      },
      {
        "@type": "Organization",
        "@id": `${SITO}/#organizzazione`,
        name: NOME,
        url: SITO,
        logo: indirizzo("/icon-512.png"),
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: NOME, item: SITO },
          { "@type": "ListItem", position: 2, name: TITOLO, item: url },
        ],
      },
    ],
  };
}

export default function PaginaCalcoloDscr() {
  return (
    <>
      <DatiStrutturati dati={schema()} />
      <Intestazione />
      <main id="contenuto">
        <Contenitore className="py-16 md:py-24">
          <div className="max-w-[44rem]">
            <Occhiello>Strumento gratuito</Occhiello>
            <h1 className="mt-5 text-[clamp(2rem,1.35rem+2.5vw,3.25rem)] leading-[1.06] font-semibold tracking-[-0.025em] text-balance">
              {TITOLO}
            </h1>
            <p className="mt-5 text-[1.0625rem] leading-[1.65] text-testo-attenuato">
              Inserisci quattro numeri del budget di tesoreria: il DSCR e il giudizio li calcola lo
              stesso motore che FinBeacon usa per ogni cliente dello studio. Nessuna registrazione,
              e i numeri non lasciano il tuo browser.
            </p>
          </div>

          <div className="mt-12">
            <CalcolatoreDscr />
          </div>

          <section
            aria-labelledby="titolo-come"
            className="mt-20 grid gap-10 border-t border-bordo pt-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-16"
          >
            <div>
              <h2 id="titolo-come" className="text-xl font-semibold">
                Come si legge il risultato
              </h2>
              <div className="mt-4 space-y-4 text-[0.9375rem] leading-[1.65] text-testo-attenuato">
                <p>
                  Il DSCR prospettico confronta quello che l&apos;impresa avrà a disposizione nei
                  prossimi sei mesi con il debito finanziario da pagare nello stesso periodo. Sotto
                  1 le risorse previste non bastano a coprire le rate.
                </p>
                <p>
                  FinBeacon avvisa già sotto 1,10: fra 1 e 1,10 il debito è coperto, ma con un
                  margine sottile che un incasso in ritardo può consumare. Sopra, il giudizio è
                  adeguato o ottimo.
                </p>
                <p>
                  Il risultato vale quanto il budget da cui nasce: entrate e uscite vanno stimate
                  con prudenza, mese per mese.
                </p>
              </div>
            </div>
            <div>
              <h2 className="text-xl font-semibold">Per tutti i clienti dello studio</h2>
              <p className="mt-4 text-[0.9375rem] leading-[1.65] text-testo-attenuato">
                In FinBeacon il DSCR prospettico si calcola per ogni cliente, accanto agli
                indicatori di bilancio, e finisce nel report da consegnare al cliente e alla banca.
              </p>
              <div className="mt-6 flex flex-wrap items-center gap-x-7 gap-y-3">
                {URL_DEMO_PUBBLICA ? (
                  <>
                    <PulsantePrimario href={URL_DEMO_PUBBLICA}>Prova la demo</PulsantePrimario>
                    <CollegamentoAFilo href="/#richiesta">Parla con noi</CollegamentoAFilo>
                  </>
                ) : (
                  <PulsantePrimario href="/#richiesta">Parla con noi</PulsantePrimario>
                )}
              </div>
              <p className="mt-6 text-sm text-testo-attenuato">
                Vuoi vedere come nasce il giudizio?{" "}
                <Link href="/#metodo" className="underline underline-offset-4 hover:text-testo">
                  Il metodo di FinBeacon
                </Link>
                .
              </p>
            </div>
          </section>
        </Contenitore>
      </main>
      <Piede />
    </>
  );
}
