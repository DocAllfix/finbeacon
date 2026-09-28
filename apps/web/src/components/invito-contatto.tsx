"use client";

import { Check, Send, X } from "lucide-react";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";

import { Button } from "@/components/ui/button";
import { ascolta, invitoDaMostrare, segnaChiuso } from "@/lib/invito";

/**
 * «Ti interessa? Scrivici», dentro la demo e solo dopo che il visitatore ha
 * provato il simulatore.
 *
 * PANNELLO E NON FINESTRA MODALE. Una modale va accompagnata da trappola del
 * fuoco, chiusura con Esc, ritorno del fuoco al punto di partenza e attributi
 * di ruolo: farla a mano bene costa, farla a mano male e' peggio di non farla.
 * Qui basta aprire un pannello dentro la fascia — chi non lo vuole continua a
 * usare il prodotto, e niente gli blocca la pagina.
 *
 * Il tempo di apertura viaggia nel corpo della richiesta e non in un campo
 * nascosto, perche' qui non c'e' un modulo HTML tradizionale: la rotta lo usa
 * per scartare chi compila in meno di tre secondi.
 */
export function InvitoContatto() {
  /*
   * `useSyncExternalStore` e non un effetto: il server non ha localStorage, e
   * leggerlo in un effetto farebbe comparire e sparire il pulsante al primo
   * disegno. E' il modo con cui questo progetto legge lo storage (vedi
   * `preferenza-sidebar.ts` e `app-shell/guida.tsx`).
   */
  const mostrare = useSyncExternalStore(
    ascolta,
    invitoDaMostrare,
    () => false, // sul server: mai, cosi' il primo disegno combacia
  );

  const [aperto, setAperto] = useState(false);
  const [esito, setEsito] = useState<null | "inviata" | "errore" | "troppi" | "inattivo">(null);
  const [inCorso, setInCorso] = useState(false);
  const [errore, setErrore] = useState<string | null>(null);
  const apertoIl = useRef<number>(0);
  const primoCampo = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (aperto) {
      apertoIl.current = Date.now();
      primoCampo.current?.focus();
    }
  }, [aperto]);

  if (!mostrare) return null;

  function chiudi() {
    setAperto(false);
    segnaChiuso();
  }

  async function invia(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    const dati = new FormData(evento.currentTarget);
    setInCorso(true);
    setErrore(null);
    try {
      const r = await fetch("/api/contatto", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nome: String(dati.get("nome") ?? ""),
          email: String(dati.get("email") ?? ""),
          messaggio: String(dati.get("messaggio") ?? ""),
          sito: String(dati.get("sito") ?? ""),
          t: apertoIl.current,
        }),
      });
      const corpo = (await r.json().catch(() => ({}))) as { stato?: string; errore?: string };
      if (corpo.stato === "inviata") setEsito("inviata");
      else if (r.status === 429) setEsito("troppi");
      else if (r.status === 503) setEsito("inattivo");
      else if (corpo.stato === "non-valida") setErrore(corpo.errore ?? "Controlla i campi.");
      else setEsito("errore");
    } catch {
      setEsito("errore");
    } finally {
      setInCorso(false);
    }
  }

  if (esito === "inviata") {
    return (
      <div
        role="status"
        className="flex items-center gap-2 text-sm font-medium text-success-foreground"
      >
        <Check className="size-4 shrink-0" aria-hidden />
        Ricevuta: ti scriviamo noi.
      </div>
    );
  }

  if (!aperto) {
    return (
      <div className="flex items-center gap-2">
        <Button size="sm" onClick={() => setAperto(true)}>
          <Send className="size-4" aria-hidden />
          Ti interessa? Scrivici
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={chiudi}
          aria-label="Non mostrare più questo invito"
        >
          <X className="size-4" aria-hidden />
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={invia} className="flex w-full flex-col gap-2 sm:max-w-md">
      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          ref={primoCampo}
          name="nome"
          required
          maxLength={120}
          placeholder="Il tuo nome"
          aria-label="Il tuo nome"
          className="min-h-9 flex-1 rounded-md border border-hairline bg-background px-3 text-sm focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        />
        <input
          name="email"
          type="email"
          required
          maxLength={200}
          placeholder="La tua email"
          aria-label="La tua email"
          className="min-h-9 flex-1 rounded-md border border-hairline bg-background px-3 text-sm focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        />
      </div>
      <input
        name="messaggio"
        maxLength={2000}
        placeholder="Due righe, se vuoi (facoltativo)"
        aria-label="Messaggio, facoltativo"
        className="min-h-9 rounded-md border border-hairline bg-background px-3 text-sm focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
      />
      {/* Trappola: fuori dallo schermo e fuori dal percorso della tastiera. */}
      <div className="absolute -left-[9999px] h-px w-px overflow-hidden" aria-hidden>
        <input name="sito" tabIndex={-1} autoComplete="off" />
      </div>

      {errore && (
        <p role="alert" className="text-xs text-danger-foreground">
          {errore}
        </p>
      )}
      {esito === "troppi" && (
        <p role="alert" className="text-xs text-warning-foreground">
          Hai già scritto da poco: questa non è partita. Riprova fra qualche minuto.
        </p>
      )}
      {esito === "inattivo" && (
        <p role="alert" className="text-xs text-warning-foreground">
          Il contatto dalla demo non è ancora attivo.
        </p>
      )}
      {esito === "errore" && (
        <p role="alert" className="text-xs text-danger-foreground">
          Non è partita. Riprova, oppure scrivici dalla pagina pubblica.
        </p>
      )}

      <div className="flex items-center gap-2">
        <Button type="submit" size="sm" disabled={inCorso}>
          {inCorso ? "Invio…" : "Invia"}
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={() => setAperto(false)}>
          Annulla
        </Button>
      </div>
      <p className="text-[11px] text-muted-foreground">
        Usiamo nome e indirizzo solo per risponderti.
      </p>
    </form>
  );
}
