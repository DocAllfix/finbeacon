import { BellOff } from "lucide-react";
import Link from "next/link";

import { ElencoAvvisi } from "@/components/avvisi/elenco-avvisi";
import { EmptyState } from "@/components/ui/empty-state";
import { listAvvisi } from "@/lib/avvisi/queries";
import { cn } from "@/lib/utils";

import { SegnaTuttiLetti } from "./segna-tutti-letti";

export default async function AvvisiPage({
  searchParams,
}: {
  searchParams: Promise<{ stato?: string }>;
}) {
  const { stato: richiesto } = await searchParams;
  const stato = richiesto === "chiusi" ? "chiusi" : "aperti";
  const avvisi = await listAvvisi(stato);
  const daLeggere = stato === "aperti" && avvisi.some((a) => !a.letto);

  return (
    <div>
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Avvisi</h1>
          <p className="mt-1 max-w-[62ch] text-sm text-muted-foreground">
            Quando un indicatore di un cliente passa una soglia, o un dato invecchia, compare qui.
            Si chiudono da soli quando la condizione rientra.
          </p>
        </div>
        {daLeggere && <SegnaTuttiLetti />}
      </header>

      <nav aria-label="Stato degli avvisi" className="mt-6 flex gap-1 border-b border-hairline">
        {(["aperti", "chiusi"] as const).map((s) => (
          <Link
            key={s}
            href={s === "aperti" ? "/app/avvisi" : "/app/avvisi?stato=chiusi"}
            aria-current={s === stato ? "page" : undefined}
            className={cn(
              "-mb-px flex min-h-11 items-center border-b-2 px-3 text-sm transition-colors",
              s === stato
                ? "border-primary font-medium text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            {s === "aperti" ? "Aperti" : "Chiusi"}
          </Link>
        ))}
      </nav>

      {avvisi.length > 0 ? (
        <ElencoAvvisi avvisi={avvisi} className="mt-2" />
      ) : (
        <EmptyState
          className="mt-8"
          icon={BellOff}
          titolo={stato === "aperti" ? "Nessun avviso aperto" : "Nessun avviso chiuso"}
          descrizione={
            stato === "aperti"
              ? "Gli avvisi si aprono da soli al salvataggio di un esercizio, e ogni mattina per previsioni di cassa scadute e bilanci mancanti."
              : "Qui finiscono gli avvisi la cui condizione è rientrata."
          }
        />
      )}
    </div>
  );
}
