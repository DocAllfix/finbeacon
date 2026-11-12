"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";

import { MicroEtichetta } from "@/components/ui/micro-etichetta";
import { salvaPreferenzeAvvisi } from "@/lib/avvisi/actions";
import type { PreferenzeAvvisi } from "@/lib/avvisi/queries";
import { MESSAGGIO_DEMO } from "@/lib/demo";

const VOCI: { chiave: keyof PreferenzeAvvisi; titolo: string; descrizione: string }[] = [
  {
    chiave: "emailCritici",
    titolo: "Email immediata per i critici",
    descrizione:
      "Appena un indicatore di un cliente passa in zona critica. L'email non contiene né nomi né importi: dice solo di aprire FinBeacon.",
  },
  {
    chiave: "riepilogoSettimanale",
    titolo: "Riepilogo del lunedì",
    descrizione: "Quanti avvisi sono aperti, ogni lunedì mattina. Non arriva se non ce ne sono.",
  },
];

/** Preferenze personali: valgono per chi le imposta, non per tutto lo studio. */
export function PreferenzeAvvisiPannello({
  iniziali,
  demo,
}: {
  iniziali: PreferenzeAvvisi;
  demo: boolean;
}) {
  const [valori, setValori] = useState(iniziali);
  const [inCorso, avvia] = useTransition();

  function cambia(chiave: keyof PreferenzeAvvisi, attivo: boolean) {
    if (demo) return toast.error(MESSAGGIO_DEMO);
    const precedenti = valori;
    const nuovi = { ...valori, [chiave]: attivo };
    setValori(nuovi);
    avvia(async () => {
      const r = await salvaPreferenzeAvvisi(nuovi);
      if (!r.ok) {
        setValori(precedenti);
        toast.error(r.errore);
      } else {
        toast.success("Preferenze degli avvisi salvate.");
      }
    });
  }

  return (
    <section>
      <MicroEtichetta come="h2">Avvisi per email</MicroEtichetta>
      <div className="mt-3 border-t border-hairline">
        <ul className="divide-y divide-hairline">
          {VOCI.map((v) => (
            <li key={v.chiave}>
              <label className="flex cursor-pointer items-start gap-3 py-3.5">
                <input
                  type="checkbox"
                  className="mt-0.5 size-4 shrink-0 accent-primary"
                  checked={valori[v.chiave]}
                  disabled={demo || inCorso}
                  onChange={(e) => cambia(v.chiave, e.target.checked)}
                />
                <span className="min-w-0">
                  <span className="block text-sm font-medium">{v.titolo}</span>
                  <span className="mt-0.5 block max-w-[62ch] text-sm text-muted-foreground">
                    {v.descrizione}
                  </span>
                </span>
              </label>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
