"use client";

import Link from "next/link";
import { useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { JudgmentBadge } from "@/components/ui/judgment-badge";
import { segnaAvvisoLetto } from "@/lib/avvisi/actions";
import type { AvvisoLista } from "@/lib/avvisi/queries";
import { cn } from "@/lib/utils";

const data = new Intl.DateTimeFormat("it-IT", { day: "numeric", month: "short", year: "numeric" });

function Riga({ a, conCliente }: { a: AvvisoLista; conCliente: boolean }) {
  const [inCorso, avvia] = useTransition();
  const daLeggere = a.aperto && !a.letto;

  function leggi() {
    avvia(async () => {
      const r = await segnaAvvisoLetto(a.id);
      if (!r.ok) toast.error(r.errore);
    });
  }

  return (
    <li className="grid gap-x-4 gap-y-2 py-4 sm:grid-cols-[1fr_auto]">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1.5">
          <JudgmentBadge tone={a.gravita}>
            {a.gravita === "critico" ? "Critico" : "Attenzione"}
          </JudgmentBadge>
          <h3 className={cn("text-sm", daLeggere ? "font-semibold" : "font-medium")}>{a.titolo}</h3>
          {daLeggere && (
            <span className="text-xs font-medium text-primary">
              <span
                aria-hidden
                className="mr-1 inline-block size-1.5 rounded-full bg-primary align-middle"
              />
              Da leggere
            </span>
          )}
        </div>
        {conCliente && (
          <Link
            href={`/app/clienti/${a.clienteId}`}
            className="mt-1.5 inline-block text-sm font-medium underline-offset-4 hover:underline"
          >
            {a.cliente}
          </Link>
        )}
        <p className="mt-1 max-w-[68ch] text-sm text-muted-foreground">{a.testo}</p>
        <p className="nums mt-1.5 text-xs text-muted-foreground">
          {a.aperto
            ? `Aperto il ${data.format(a.creatoIl)}`
            : `Aperto il ${data.format(a.creatoIl)}, chiuso il ${data.format(a.chiusoIl!)}`}
        </p>
      </div>
      {daLeggere && (
        <div className="sm:pt-0.5">
          <Button variant="outline" size="sm" onClick={leggi} disabled={inCorso}>
            {inCorso ? "Un momento…" : "Segna come letto"}
          </Button>
        </div>
      )}
    </li>
  );
}

export function ElencoAvvisi({
  avvisi,
  conCliente = true,
  className,
}: {
  avvisi: AvvisoLista[];
  /** Nella scheda del cliente il nome è già nel titolo della pagina */
  conCliente?: boolean;
  className?: string;
}) {
  return (
    <ul className={cn("divide-y divide-hairline", className)}>
      {avvisi.map((a) => (
        <Riga key={a.id} a={a} conCliente={conCliente} />
      ))}
    </ul>
  );
}
