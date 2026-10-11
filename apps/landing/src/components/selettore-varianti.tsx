"use client";

import { useEffect, useState } from "react";

import { APERTURA_PREDEFINITA, APERTURE, type Apertura } from "@/lib/varianti";

/**
 * Il selettore delle aperture, solo sull'anteprima (vedi `lib/varianti.ts`).
 * Cambia l'attributo su <html> e l'indirizzo (?v=), così il link si può
 * mandare già sulla variante giusta.
 */
export function SelettoreVarianti() {
  const [attiva, setAttiva] = useState<Apertura | null>(null);

  useEffect(() => {
    const v = document.documentElement.dataset.variante as Apertura | undefined;
    // Lettura unica del valore messo dallo script in <head> prima dell'idratazione.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setAttiva(v ?? APERTURA_PREDEFINITA);
  }, []);

  function scegli(v: Apertura) {
    document.documentElement.setAttribute("data-variante", v);
    const url = new URL(location.href);
    url.searchParams.set("v", v);
    history.replaceState(null, "", url);
    setAttiva(v);
    window.scrollTo({ top: 0 });
  }

  return (
    <div
      role="group"
      aria-label="Apertura in prova"
      className="fixed bottom-4 left-1/2 z-50 flex -translate-x-1/2 items-center gap-1 rounded-full border border-bordo bg-superficie p-1 text-sm shadow-[0_8px_24px_-12px_oklch(0.3_0.03_240/0.35)]"
    >
      <span className="px-3 text-testo-attenuato max-sm:sr-only">Apertura</span>
      {APERTURE.map((a) => (
        <button
          key={a.id}
          type="button"
          aria-pressed={attiva === a.id}
          onClick={() => scegli(a.id)}
          className="h-9 rounded-full px-3.5 font-medium whitespace-nowrap text-testo-attenuato aria-pressed:bg-testo aria-pressed:text-fondo"
        >
          <span className="cifre uppercase">{a.id}</span>
          <span className="ml-1.5">{a.nome}</span>
        </button>
      ))}
    </div>
  );
}
