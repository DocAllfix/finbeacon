import type { Metadata } from "next";
import Link from "next/link";

import { Contenitore, Occhiello } from "@/components/base";
import { Intestazione } from "@/components/sezioni/apertura";
import { Piede } from "@/components/sezioni/chiusura";
import { ARGOMENTI, guidePubblicate, type Argomento } from "@/lib/guide";

const DESCRIZIONE =
  "Guide per commercialisti su indicatori di bilancio, DSCR e Codice della crisi: formule, soglie ed esempi calcolati, con le fonti citate.";

/*
 * Finché non esce la prima guida, la pagina esiste ma non si offre ai motori:
 * un indice vuoto indicizzato è una pagina sottile col nome del sito sopra.
 * Anche il collegamento «Guide» in testata e la voce in sitemap compaiono solo
 * da quel momento.
 */
export function generateMetadata(): Metadata {
  const vuota = guidePubblicate().length === 0;
  return {
    title: "Guide su bilancio e Codice della crisi",
    description: DESCRIZIONE,
    alternates: { canonical: "/guide" },
    openGraph: {
      url: "/guide",
      title: "Guide su bilancio e Codice della crisi",
      description: DESCRIZIONE,
    },
    ...(vuota ? { robots: { index: false, follow: true } } : {}),
  };
}

/**
 * Un sommario, non una griglia di schede: per argomento, e per ogni voce la
 * data, il titolo e una riga. Come l'indice di una rivista professionale.
 */
export default function IndiceGuide() {
  const guide = guidePubblicate();
  const gruppi = (Object.keys(ARGOMENTI) as Argomento[])
    .map((a) => ({ argomento: a, voci: guide.filter((g) => g.argomento === a) }))
    .filter((gr) => gr.voci.length > 0);

  return (
    <>
      <Intestazione />
      <main id="contenuto">
        <Contenitore className="py-16 md:py-24">
          <div className="max-w-[44rem]">
            <Occhiello>Guide</Occhiello>
            <h1 className="mt-5 text-[clamp(2rem,1.35rem+2.5vw,3.25rem)] leading-[1.06] font-semibold tracking-[-0.025em] text-balance">
              Bilancio e Codice della crisi, spiegati sui numeri.
            </h1>
            <p className="mt-5 text-[1.0625rem] leading-[1.65] text-testo-attenuato">
              Formule, soglie ed esempi calcolati dallo stesso motore del prodotto. Ogni guida cita
              le sue fonti.
            </p>
          </div>

          {gruppi.length === 0 ? (
            <p className="mt-14 border-t border-bordo pt-8 text-[1.0625rem] text-testo-attenuato">
              Le prime guide sono in preparazione.
            </p>
          ) : (
            <div className="mt-14 space-y-14">
              {gruppi.map((gr) => (
                <section key={gr.argomento} aria-labelledby={`argomento-${gr.argomento}`}>
                  <h2 id={`argomento-${gr.argomento}`} className="etichetta text-testo-attenuato">
                    {ARGOMENTI[gr.argomento]}
                  </h2>
                  <ol className="mt-4 border-t border-bordo">
                    {gr.voci.map((g) => (
                      <li key={g.slug} className="border-b border-filetto">
                        <Link
                          href={`/guide/${g.slug}`}
                          className="group grid gap-x-8 gap-y-1 py-5 md:grid-cols-[7.5rem_minmax(0,1fr)]"
                        >
                          <time
                            dateTime={g.data}
                            className="cifre pt-0.5 text-xs text-testo-attenuato"
                          >
                            {g.data.split("-").reverse().join("/")}
                          </time>
                          <span>
                            <span className="text-[1.125rem] leading-snug font-semibold group-hover:underline">
                              {g.titolo}
                            </span>
                            <span className="mt-1.5 block max-w-[60ch] text-[0.9375rem] leading-[1.55] text-testo-attenuato">
                              {g.descrizione}
                            </span>
                          </span>
                        </Link>
                      </li>
                    ))}
                  </ol>
                </section>
              ))}
            </div>
          )}
        </Contenitore>
      </main>
      <Piede />
    </>
  );
}
