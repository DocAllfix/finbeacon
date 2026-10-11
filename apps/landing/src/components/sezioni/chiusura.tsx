import Link from "next/link";

import {
  CollegamentoAFilo,
  Contenitore,
  Occhiello,
  Paragrafo,
  PulsanteSecondario,
  Titolo2,
} from "@/components/base";
import { Logotipo } from "@/components/marchio";
import { ModuloDemo } from "@/components/modulo-demo";
import {
  EMAIL_CONTATTO,
  IDENTIFICAZIONE,
  URL_DEMO_PUBBLICA,
  URL_PRENOTAZIONE,
} from "@/lib/configurazione";
import { CHIUSURA, VOCI_MENU } from "@/lib/contenuti";
import { guidePubblicate } from "@/lib/guide";

export function Chiusura() {
  return (
    <section
      id="richiesta"
      aria-labelledby="titolo-richiesta"
      className="scroll-mt-20 border-t border-filetto"
    >
      <Contenitore className="grid gap-12 py-24 md:py-32 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] lg:gap-16">
        <div>
          <Occhiello>{CHIUSURA.occhiello}</Occhiello>
          <Titolo2 id="titolo-richiesta">{CHIUSURA.titolo}</Titolo2>
          <Paragrafo className="mt-5 max-w-[30rem]">{CHIUSURA.testo}</Paragrafo>
          {(URL_PRENOTAZIONE || URL_DEMO_PUBBLICA) && (
            <div className="mt-8 flex flex-wrap gap-3">
              {URL_DEMO_PUBBLICA && (
                <CollegamentoAFilo href={URL_DEMO_PUBBLICA}>
                  Prima di scriverci, prova la demo
                </CollegamentoAFilo>
              )}
              {URL_PRENOTAZIONE && (
                <PulsanteSecondario href={URL_PRENOTAZIONE} esterno>
                  Prenota una chiamata
                </PulsanteSecondario>
              )}
            </div>
          )}
        </div>
        <ModuloDemo emailRipiego={EMAIL_CONTATTO} />
      </Contenitore>
    </section>
  );
}

export function Piede() {
  return (
    <footer className="bg-tonale">
      <Contenitore className="py-14">
        <div className="flex flex-col gap-10 md:flex-row md:items-start md:justify-between">
          <div className="max-w-[22rem]">
            <Logotipo className="h-6 w-auto text-testo" />
            <p className="mt-4 text-sm leading-[1.6] text-testo-attenuato">
              Analisi di bilancio e allerta crisi per gli studi commercialisti.
            </p>
          </div>
          <nav aria-label="Piè di pagina" className="grid grid-cols-2 gap-x-14 gap-y-2 text-sm">
            <ul className="space-y-2">
              {VOCI_MENU.map((v) => (
                <li key={v.href}>
                  <Link href={`/${v.href}`} className="text-testo-attenuato hover:text-testo">
                    {v.testo}
                  </Link>
                </li>
              ))}
            </ul>
            <ul className="space-y-2">
              {URL_DEMO_PUBBLICA && (
                <li>
                  <a href={URL_DEMO_PUBBLICA} className="text-testo-attenuato hover:text-testo">
                    Prova la demo
                  </a>
                </li>
              )}
              <li>
                <Link href="/#richiesta" className="text-testo-attenuato hover:text-testo">
                  Parla con noi
                </Link>
              </li>
              <li>
                <Link
                  href="/strumenti/calcolo-dscr-prospettico"
                  className="text-testo-attenuato hover:text-testo"
                >
                  Calcolo del DSCR
                </Link>
              </li>
              {guidePubblicate().length > 0 && (
                <li>
                  <Link href="/guide" className="text-testo-attenuato hover:text-testo">
                    Guide
                  </Link>
                </li>
              )}
              <li>
                <Link href="/privacy" className="text-testo-attenuato hover:text-testo">
                  Privacy
                </Link>
              </li>
              <li>
                <Link href="/cookie" className="text-testo-attenuato hover:text-testo">
                  Cookie
                </Link>
              </li>
              <li>
                <Link href="/note-legali" className="text-testo-attenuato hover:text-testo">
                  Note legali
                </Link>
              </li>
            </ul>
          </nav>
        </div>
        <div className="mt-12 flex flex-col gap-3 border-t border-bordo pt-6 text-xs text-testo-attenuato sm:flex-row sm:items-center sm:justify-between">
          {/*
           * Nome e partita IVA nel piede di OGNI pagina, non solo dentro le
           * note legali: la legge li vuole «reperibili», e una voce di menu che
           * bisogna cercare lo è meno di una riga che si vede sempre. Le altre
           * voci restano nelle note legali, che il piede collega.
           */}
          <p>
            © {new Date().getFullYear()} {IDENTIFICAZIONE.nome ?? "FinBeacon"}
            {IDENTIFICAZIONE.partitaIva && <> · P. IVA {IDENTIFICAZIONE.partitaIva}</>}
          </p>
          {/*
           * Chi ha sviluppato FinBeacon (11/10, richiesta del committente, come
           * sugli altri prodotti di Axialoop). Collegamento seguito dai motori:
           * niente nofollow. Stessa misura, colore e passaggio del mouse degli
           * altri link del piede; logo di 19px nei colori originali, perché il
           * piede è chiaro. Area cliccabile di almeno 24px.
           */}
          <a
            href="https://www.axialoop.com/it"
            target="_blank"
            rel="noopener"
            aria-label="powered by Axialoop: sito di Axialoop, che ha sviluppato FinBeacon (si apre in una nuova scheda)"
            className="-my-1 inline-flex min-h-6 items-center gap-2 self-start text-sm text-testo-attenuato hover:text-testo sm:self-auto"
          >
            <span>powered by</span>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 497 494"
              className="size-[1.1875rem] shrink-0"
              aria-hidden
              focusable="false"
            >
              <path
                fill="#14171c"
                fillRule="evenodd"
                d="M247 4 L139 67 L137 161 L5 238 L4 348 L210 470 L251 490 L492 350 L493 238 L358 158 L358 67 Z M245 231 L248 243 L347 301 L250 358 L197 328 L197 260 Z"
              />
              <path
                fill="#5683a9"
                d="M428 317 L377 290 L256 362 L307 389 L428 320 Z M142 293 L190 323 L193 322 L192 265 Z M10 245 L10 347 L201 459 L246 482 L246 428 L62 321 L60 274 Z M361 231 L355 240 L308 269 L308 272 L349 296 L376 283 L376 241 Z M360 167 L360 224 L434 267 L484 240 Z M246 75 L199 101 L199 188 L246 161 Z M148 67 L193 95 L204 92 L248 66 L301 96 L350 69 L250 9 Z"
              />
              <path
                fill="#7cbb84"
                d="M70 317 L248 422 L297 395 L290 388 L120 289 Z M382 246 L383 284 L432 311 L432 273 Z M188 193 L138 166 L17 236 L15 240 L66 267 L183 199 Z M252 76 L253 240 L300 265 L300 103 Z M144 75 L144 159 L193 187 L193 103 Z"
              />
            </svg>
            <span className="-ml-0.5 font-semibold">Axialoop</span>
          </a>
        </div>
      </Contenitore>
    </footer>
  );
}
