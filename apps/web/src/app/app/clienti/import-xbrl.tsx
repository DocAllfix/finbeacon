"use client";

import {
  ErroreXbrl,
  formatEuro,
  leggiBilancioXbrl,
  ORIGINE_XBRL,
  type AnnoXbrl,
  type BilancioDaXbrl,
  type DatiBilancio,
  type MotivoMancante,
} from "@finbeacon/engine";
import { FileCheck2, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button, buttonVariants } from "@/components/ui/button";
import { MicroEtichetta } from "@/components/ui/micro-etichetta";
import { impostaAtecoCliente } from "@/lib/clienti/actions";

/** Le 10 grandezze nell'ordine del modulo, con l'etichetta del modulo. */
export const CAMPI_XBRL: { campo: keyof DatiBilancio; label: string }[] = [
  { campo: "valProd", label: "Valore della produzione" },
  { campo: "fatturato", label: "Fatturato" },
  { campo: "ro", label: "Reddito operativo (RO)" },
  { campo: "ebitda", label: "EBITDA / MOL" },
  { campo: "utileNetto", label: "Utile netto" },
  { campo: "capInvest", label: "Capitale investito" },
  { campo: "patrNetto", label: "Patrimonio netto" },
  { campo: "pfn", label: "Posizione finanziaria netta (PFN)" },
  { campo: "servizioDebito", label: "Servizio del debito annuo" },
  { campo: "flussoCassa", label: "Flusso di cassa operativo" },
];

function spiegaMancante(motivo: MotivoMancante, anno: AnnoXbrl): string {
  switch (motivo) {
    case "assente-nel-bilancio":
      return anno.interessi !== null
        ? `Non è nel bilancio: è la quota capitale dei finanziamenti più gli interessi. Interessi e altri oneri finanziari (C17): ${formatEuro(anno.interessi)}.`
        : "Non è nel bilancio: è la quota capitale dei finanziamenti più gli interessi.";
    case "senza-rendiconto":
      return "Il bilancio non ha il rendiconto finanziario: inseriscilo a mano.";
    case "debiti-non-dettagliati":
      return "I debiti non sono divisi per natura (bilancio micro): calcola la PFN a mano.";
    case "voce-assente":
      return "La voce non c'è nel file.";
  }
}

export function ImportXbrl({
  clienteId,
  atecoCliente,
  onApplica,
  altriPulsanti,
}: {
  clienteId: string;
  atecoCliente: string | null;
  onApplica: (anno: AnnoXbrl) => void;
  /** Gli altri modi di importare (CSV), sulla stessa riga */
  altriPulsanti?: React.ReactNode;
}) {
  const [bilancio, setBilancio] = useState<BilancioDaXbrl | null>(null);
  const [indice, setIndice] = useState(0);
  const [atecoImpostato, setAtecoImpostato] = useState(false);
  const [inCorso, setInCorso] = useState(false);

  async function leggi(file: File) {
    if (file.size > 20 * 1024 * 1024) {
      toast.error("File troppo grande per essere un bilancio XBRL.");
      return;
    }
    try {
      const b = leggiBilancioXbrl(new Uint8Array(await file.arrayBuffer()));
      setBilancio(b);
      setIndice(0);
    } catch (e) {
      toast.error(e instanceof ErroreXbrl ? e.message : "Il file non si riesce a leggere.");
    }
  }

  async function impostaAteco(ateco: string) {
    setInCorso(true);
    const r = await impostaAtecoCliente(clienteId, ateco);
    setInCorso(false);
    if (!r.ok) {
      toast.error(r.errore);
      return;
    }
    setAtecoImpostato(true);
    toast.success(`Codice ATECO ${ateco} impostato per il cliente`);
  }

  const anno = bilancio?.anni[indice];

  return (
    <div className="mt-6">
      <div className="flex flex-wrap items-center gap-3">
        <label className="inline-flex">
          <input
            type="file"
            accept=".xbrl,.xml,.p7m,application/xml,text/xml,application/pkcs7-mime"
            className="sr-only"
            aria-label="Importa bilancio depositato (XBRL)"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void leggi(f);
              e.target.value = "";
            }}
          />
          <span
            className={`${buttonVariants({ variant: "outline" })} cursor-pointer has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring`}
          >
            <FileCheck2 className="size-4" aria-hidden />
            Importa bilancio depositato (XBRL)
          </span>
        </label>
        {altriPulsanti}
      </div>

      {bilancio && anno && (
        <section
          aria-label="Revisione del bilancio importato"
          className="mt-4 rounded-lg border border-border bg-card p-5"
        >
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <MicroEtichetta>Bilancio XBRL · tassonomia {bilancio.versione}</MicroEtichetta>
              <p className="mt-1 truncate font-semibold">
                {bilancio.denominazione ?? "Denominazione non indicata"}
              </p>
              {bilancio.ateco && (
                <p className="mt-0.5 text-sm text-muted-foreground">
                  ATECO <span className="nums">{bilancio.ateco}</span>
                </p>
              )}
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label="Chiudi senza importare"
              onClick={() => setBilancio(null)}
            >
              <X className="size-4" />
            </Button>
          </div>

          {bilancio.anni.length > 1 && (
            <div
              className="mt-4 flex flex-wrap gap-2"
              role="group"
              aria-label="Esercizio da importare"
            >
              {bilancio.anni.map((a, i) => (
                <Button
                  key={a.chiusura}
                  type="button"
                  size="sm"
                  variant={i === indice ? "default" : "outline"}
                  aria-pressed={i === indice}
                  onClick={() => setIndice(i)}
                >
                  Esercizio {a.anno}
                </Button>
              ))}
            </div>
          )}

          <table className="mt-4 w-full text-sm">
            <caption className="sr-only">Valori letti per l&apos;esercizio {anno.anno}</caption>
            <thead className="sr-only">
              <tr>
                <th scope="col">Grandezza</th>
                <th scope="col">Valore</th>
                <th scope="col">Da dove viene</th>
              </tr>
            </thead>
            <tbody>
              {CAMPI_XBRL.map(({ campo, label }) => {
                const v = anno.dati[campo];
                const manca = anno.mancanti.find((m) => m.campo === campo);
                return (
                  <tr key={campo} className="border-t border-hairline align-top">
                    <th scope="row" className="py-2.5 pr-4 text-left font-medium">
                      {label}
                    </th>
                    <td className="py-2.5 pr-4 text-right whitespace-nowrap">
                      {v !== undefined ? (
                        <span className="nums">{formatEuro(v)}</span>
                      ) : (
                        <span className="rounded-sm bg-warning-subtle px-1.5 py-0.5 text-xs font-medium text-warning-foreground">
                          Da completare
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 text-xs text-muted-foreground">
                      {manca ? spiegaMancante(manca.motivo, anno) : ORIGINE_XBRL[campo]}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <Button
              type="button"
              onClick={() => {
                onApplica(anno);
                setBilancio(null);
              }}
            >
              Usa i valori del {anno.anno}
            </Button>
            {bilancio.ateco && !atecoCliente && !atecoImpostato && (
              <Button
                type="button"
                variant="outline"
                disabled={inCorso}
                onClick={() => void impostaAteco(bilancio.ateco!)}
              >
                Imposta ATECO {bilancio.ateco} per il cliente
              </Button>
            )}
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            Nulla viene salvato finché non salvi l&apos;esercizio. Le voci da completare restano
            vuote: il bilancio non le contiene, e FinBeacon non le stima.
          </p>
        </section>
      )}
    </div>
  );
}
