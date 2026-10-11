"use client";

import { useEffect, useState } from "react";

import { APERTURA_PREDEFINITA, APERTURE, COLORI, type Apertura, type Colore } from "@/lib/varianti";

/**
 * Il selettore delle prove, solo sull'anteprima (vedi `lib/varianti.ts`):
 * apertura (?v=) e colore (?c=). Cambia gli attributi su <html> e l'indirizzo,
 * così il link si può mandare già sulla combinazione giusta.
 */
export function SelettoreVarianti() {
  const [apertura, setApertura] = useState<Apertura | null>(null);
  const [colore, setColore] = useState<Colore | null>(null);

  useEffect(() => {
    const d = document.documentElement.dataset;
    // Lettura unica dei valori messi dallo script in <head> prima dell'idratazione.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setApertura((d.variante as Apertura | undefined) ?? APERTURA_PREDEFINITA);
    setColore((d.colore as Colore | undefined) ?? "0");
  }, []);

  function imposta(attributo: "variante" | "colore", parametro: "v" | "c", valore: string) {
    const url = new URL(location.href);
    if (attributo === "colore" && valore === "0") {
      document.documentElement.removeAttribute("data-colore");
      url.searchParams.delete(parametro);
    } else {
      document.documentElement.setAttribute(`data-${attributo}`, valore);
      url.searchParams.set(parametro, valore);
    }
    history.replaceState(null, "", url);
  }

  const voce =
    "h-8 rounded-full px-3 font-medium whitespace-nowrap text-testo-attenuato aria-pressed:bg-testo aria-pressed:text-fondo";

  return (
    <div className="fixed inset-x-2 bottom-3 z-50 mx-auto flex w-fit max-w-[calc(100%-1rem)] flex-col gap-1 rounded-[1.4rem] border border-bordo bg-superficie p-1 text-[0.8125rem] shadow-[0_8px_24px_-12px_oklch(0.3_0.03_240/0.35)] sm:flex-row sm:rounded-full">
      <div role="group" aria-label="Apertura in prova" className="flex items-center gap-0.5">
        <span className="px-2 text-testo-attenuato max-sm:sr-only">Apertura</span>
        {APERTURE.map((a) => (
          <button
            key={a.id}
            type="button"
            aria-pressed={apertura === a.id}
            onClick={() => {
              imposta("variante", "v", a.id);
              setApertura(a.id);
              window.scrollTo({ top: 0 });
            }}
            className={voce}
          >
            <span className="cifre uppercase">{a.id}</span>
            <span className="ml-1 max-sm:sr-only">{a.nome}</span>
          </button>
        ))}
      </div>
      <span className="hidden w-px self-stretch bg-bordo sm:block" aria-hidden />
      <div role="group" aria-label="Colore in prova" className="flex items-center gap-0.5">
        <span className="px-2 text-testo-attenuato max-sm:sr-only">Colore</span>
        {COLORI.map((c) => (
          <button
            key={c.id}
            type="button"
            aria-pressed={colore === c.id}
            onClick={() => {
              imposta("colore", "c", c.id);
              setColore(c.id);
            }}
            className={voce}
          >
            <span className="cifre">{c.id}</span>
            <span className="ml-1 max-sm:sr-only">{c.nome}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
