import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { CollegamentoAFilo, Contenitore, PulsantePrimario } from "@/components/base";
import { DatiStrutturati } from "@/components/dati-strutturati";
import { ContenutoGuida } from "@/components/guide/contenuto";
import { Intestazione } from "@/components/sezioni/apertura";
import { Piede } from "@/components/sezioni/chiusura";
import { AUTORI } from "@/lib/autori";
import { URL_DEMO_PUBBLICA } from "@/lib/configurazione";
import { ARGOMENTI, dataModifica, guidaPubblicata, guidePubblicate } from "@/lib/guide";
import { dataEstesa } from "@/lib/revisioni";
import { schemaGuida } from "@/lib/schema";

/*
 * Solo le guide pubblicate in questo build, e nient'altro: uno slug che non
 * c'è è un 404 vero, non una pagina generata al volo (la landing resta statica,
 * `verifica-statica.mjs` lo controlla).
 */
export const dynamicParams = false;

export function generateStaticParams() {
  return guidePubblicate().map((g) => ({ slug: g.slug }));
}

type Parametri = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Parametri): Promise<Metadata> {
  const g = guidaPubblicata((await params).slug);
  if (!g) return {};
  const autore = AUTORI[g.autore];
  return {
    title: g.titolo,
    description: g.descrizione,
    alternates: { canonical: `/guide/${g.slug}` },
    authors: [{ name: autore.nome }],
    openGraph: {
      type: "article",
      url: `/guide/${g.slug}`,
      title: g.titolo,
      description: g.descrizione,
      publishedTime: g.data,
      modifiedTime: dataModifica(g),
      authors: [autore.nome],
      section: ARGOMENTI[g.argomento],
    },
    twitter: { card: "summary_large_image", title: g.titolo, description: g.descrizione },
  };
}

export default async function PaginaGuida({ params }: Parametri) {
  const g = guidaPubblicata((await params).slug);
  if (!g) notFound();
  const autore = AUTORI[g.autore];
  const tutte = guidePubblicate();
  const correlate = g.correlati
    .map((s) => tutte.find((x) => x.slug === s))
    .filter((x) => x !== undefined)
    .slice(0, 2);

  return (
    <>
      <DatiStrutturati dati={schemaGuida(g)} />
      <Intestazione />
      <main id="contenuto">
        <Contenitore className="py-14 md:py-20">
          <nav aria-label="Percorso" className="text-sm text-testo-attenuato">
            <Link href="/guide" className="hover:text-testo">
              Guide
            </Link>
            <span aria-hidden> / </span>
            <span>{ARGOMENTI[g.argomento]}</span>
          </nav>

          <div className="mt-6 grid gap-12 lg:grid-cols-[minmax(0,44rem)_minmax(0,15rem)] lg:justify-between">
            <article className="min-w-0">
              <header>
                <h1 className="text-[clamp(2rem,1.4rem+2.2vw,3rem)] leading-[1.08] font-semibold tracking-[-0.025em] text-balance">
                  {g.titolo}
                </h1>
                <p className="mt-5 text-[1.1875rem] leading-[1.55] text-testo-attenuato">
                  {g.descrizione}
                </p>
                <p className="cifre mt-6 flex flex-wrap gap-x-3 gap-y-1 border-y border-filetto py-3 text-xs text-testo-attenuato">
                  <span className="font-sans text-sm text-testo">{autore.nome}</span>
                  <span aria-hidden>·</span>
                  <time dateTime={g.data}>{dataEstesa(g.data)}</time>
                  {g.aggiornato && (
                    <>
                      <span aria-hidden>·</span>
                      <span>
                        aggiornata il{" "}
                        <time dateTime={g.aggiornato}>{dataEstesa(g.aggiornato)}</time>
                      </span>
                    </>
                  )}
                  <span aria-hidden>·</span>
                  <span>{g.minuti} min di lettura</span>
                </p>
              </header>

              {g.sezioni.length > 2 && (
                <nav aria-label="In questa guida" className="mt-8 lg:hidden">
                  <Sommario sezioni={g.sezioni} />
                </nav>
              )}

              <div className="testo-guida mt-10">
                <ContenutoGuida corpo={g.corpo} />
              </div>

              <section aria-labelledby="titolo-fonti" className="mt-14 border-t border-bordo pt-8">
                <h2 id="titolo-fonti" className="etichetta text-testo-attenuato">
                  Fonti
                </h2>
                <ol className="mt-4 list-decimal space-y-2 pl-5 text-[0.9375rem] leading-[1.55]">
                  {g.fonti.map((f) => (
                    <li key={f.url}>
                      <a
                        href={f.url}
                        target="_blank"
                        rel="noopener"
                        className="underline decoration-bordo underline-offset-4 hover:decoration-testo"
                      >
                        {f.titolo}
                        <span className="sr-only"> (si apre in una nuova scheda)</span>
                      </a>
                    </li>
                  ))}
                </ol>
              </section>

              <section aria-label="Autore" className="mt-10 rounded-[0.8rem] bg-tonale p-6">
                <p className="text-[0.9375rem] font-semibold">{autore.nome}</p>
                <p className="text-sm text-testo-attenuato">{autore.ruolo}</p>
                <p className="mt-3 text-[0.9375rem] leading-[1.6]">{autore.biografia}</p>
              </section>

              <section
                aria-labelledby="titolo-prova"
                className="mt-10 flex flex-col gap-5 border-t border-bordo pt-10 sm:flex-row sm:items-center sm:justify-between"
              >
                <p
                  id="titolo-prova"
                  className="max-w-[26rem] text-[1.0625rem] font-semibold text-balance"
                >
                  Questi indicatori, calcolati sui clienti del tuo studio.
                </p>
                {URL_DEMO_PUBBLICA ? (
                  <PulsantePrimario href={URL_DEMO_PUBBLICA}>Prova la demo</PulsantePrimario>
                ) : (
                  <CollegamentoAFilo href="/#richiesta">Parla con noi</CollegamentoAFilo>
                )}
              </section>

              {correlate.length > 0 && (
                <section aria-labelledby="titolo-correlate" className="mt-14">
                  <h2 id="titolo-correlate" className="etichetta text-testo-attenuato">
                    Continua con
                  </h2>
                  <ul className="mt-4 border-t border-bordo">
                    {correlate.map((c) => (
                      <li key={c.slug} className="border-b border-filetto">
                        <Link href={`/guide/${c.slug}`} className="group block py-4">
                          <span className="font-semibold group-hover:underline">{c.titolo}</span>
                          <span className="mt-1 block text-sm text-testo-attenuato">
                            {c.descrizione}
                          </span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </section>
              )}
            </article>

            {g.sezioni.length > 2 && (
              <nav aria-label="In questa guida" className="hidden lg:block">
                <div className="sticky top-28">
                  <Sommario sezioni={g.sezioni} />
                </div>
              </nav>
            )}
          </div>
        </Contenitore>
      </main>
      <Piede />
    </>
  );
}

function Sommario({ sezioni }: { sezioni: { id: string; titolo: string }[] }) {
  return (
    <>
      <p className="etichetta text-testo-attenuato">In questa guida</p>
      <ol className="mt-3 space-y-2 border-l border-bordo pl-4 text-sm leading-snug">
        {sezioni.map((s) => (
          <li key={s.id}>
            <a href={`#${s.id}`} className="text-testo-attenuato hover:text-testo">
              {s.titolo}
            </a>
          </li>
        ))}
      </ol>
    </>
  );
}
