"use client";

import { useEffect, useState } from "react";

import { APERTURA_PREDEFINITA, APERTURE, COLORI, TASTI } from "@/lib/varianti";

/**
 * Il selettore delle prove, solo sull'anteprima (vedi `lib/varianti.ts`):
 * apertura (?v=), colore (?c=) e tasti (?t=). Cambia gli attributi su <html> e
 * l'indirizzo, così il link si può mandare già sulla combinazione giusta.
 */
type Gruppo = {
  etichetta: string;
  attributo: "variante" | "colore" | "tasti";
  parametro: "v" | "c" | "t";
  voci: readonly { id: string; nome: string }[];
  /** Il valore che vale «nessuna scelta»: toglie l'attributo invece di scriverlo. */
  base: string;
  nomi: boolean;
};

const GRUPPI: Gruppo[] = [
  {
    etichetta: "Apertura",
    attributo: "variante",
    parametro: "v",
    voci: APERTURE,
    base: APERTURA_PREDEFINITA,
    nomi: false,
  },
  {
    etichetta: "Colore",
    attributo: "colore",
    parametro: "c",
    voci: COLORI,
    base: "0",
    nomi: false,
  },
  { etichetta: "Tasti", attributo: "tasti", parametro: "t", voci: TASTI, base: "1", nomi: true },
];

export function SelettoreVarianti() {
  const [scelte, setScelte] = useState<Record<string, string>>({});

  useEffect(() => {
    const d = document.documentElement.dataset;
    // Lettura unica dei valori messi dallo script in <head> prima dell'idratazione.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setScelte(Object.fromEntries(GRUPPI.map((g) => [g.attributo, d[g.attributo] ?? g.base])));
  }, []);

  function scegli(g: Gruppo, valore: string) {
    const url = new URL(location.href);
    if (valore === g.base) {
      document.documentElement.removeAttribute(`data-${g.attributo}`);
      url.searchParams.delete(g.parametro);
    } else {
      document.documentElement.setAttribute(`data-${g.attributo}`, valore);
      url.searchParams.set(g.parametro, valore);
    }
    history.replaceState(null, "", url);
    setScelte((s) => ({ ...s, [g.attributo]: valore }));
  }

  return (
    <div className="fixed inset-x-2 bottom-3 z-50 mx-auto flex w-fit max-w-[calc(100%-1rem)] flex-col gap-1 rounded-[1.4rem] border border-bordo bg-superficie p-1 text-[0.8125rem] shadow-[0_8px_24px_-12px_oklch(0.3_0.03_240/0.35)] lg:flex-row lg:rounded-full">
      {GRUPPI.map((g, i) => (
        <div
          key={g.attributo}
          role="group"
          aria-label={`${g.etichetta} in prova`}
          className={`flex items-center gap-0.5 ${i > 0 ? "lg:border-l lg:border-bordo lg:pl-1" : ""}`}
        >
          <span className="w-16 px-2 text-testo-attenuato lg:w-auto">{g.etichetta}</span>
          {g.voci.map((v) => (
            <button
              key={v.id}
              type="button"
              title={v.nome}
              aria-pressed={scelte[g.attributo] === v.id}
              onClick={() => scegli(g, v.id)}
              className="h-8 rounded-full px-2.5 font-medium whitespace-nowrap text-testo-attenuato aria-pressed:bg-testo aria-pressed:text-fondo"
            >
              <span className="cifre uppercase">{v.id}</span>
              {g.nomi ? (
                <span className="ml-1 max-sm:sr-only">{v.nome}</span>
              ) : (
                <span className="sr-only"> {v.nome}</span>
              )}
            </button>
          ))}
        </div>
      ))}
    </div>
  );
}
