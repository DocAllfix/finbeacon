"use client";

import { Bell, Menu, Search } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Fragment } from "react";

import { Button } from "@/components/ui/button";
import { etichettaIdentificativo, etichetteSegmento, isIdentificativo } from "@/lib/navigazione";
import { cn } from "@/lib/utils";

import { Guida } from "./guida";

export type ContoAvvisi = { nonLetti: number; critici: number };

/**
 * Avvisi da leggere: il numero, e rosso solo se fra questi c'è un critico.
 * Il conteggio è anche nel nome accessibile, non solo nel pallino.
 */
function Campanella({ nonLetti, critici }: ContoAvvisi) {
  const etichetta =
    nonLetti === 0
      ? "Avvisi, nessuno da leggere"
      : `Avvisi, ${nonLetti} da leggere${critici > 0 ? `, ${critici} critic${critici === 1 ? "o" : "i"}` : ""}`;
  return (
    <Link
      href="/app/avvisi"
      aria-label={etichetta}
      title={etichetta}
      className="relative grid size-11 shrink-0 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none sm:size-9"
    >
      <Bell className="size-[18px]" aria-hidden />
      {nonLetti > 0 && (
        <span
          aria-hidden
          className={cn(
            "nums absolute top-1 right-1 grid h-4 min-w-4 place-items-center rounded-full px-1 text-[10px] leading-none font-semibold sm:-top-0.5 sm:-right-0.5",
            critici > 0 ? "bg-danger text-background" : "bg-foreground text-background",
          )}
        >
          {nonLetti > 99 ? "99+" : nonLetti}
        </span>
      )}
    </Link>
  );
}

type Briciola = { label: string; href: string; navigabile: boolean };

/**
 * Costruisce il percorso: gli identificativi diventano etichette leggibili
 * ("Scheda", "Esercizio") e solo i segmenti che sono rotte reali sono link.
 */
function briciole(pathname: string): Briciola[] {
  const segmenti = pathname.split("/").filter(Boolean); // es. ["app","clienti","<id>"]
  const out: Briciola[] = [];
  let acc = "";
  segmenti.forEach((seg, i) => {
    acc += `/${seg}`;
    const precedente = segmenti[i - 1];
    const identificativo = isIdentificativo(seg);
    const label = identificativo
      ? etichettaIdentificativo(precedente)
      : (etichetteSegmento[seg] ?? seg);
    const navigabile =
      seg === "app" || seg === "clienti" || seg === "impostazioni"
        ? true
        : identificativo && precedente === "clienti";
    out.push({ label, href: acc, navigabile });
  });
  return out;
}

export function Topbar({
  onApriDrawer,
  onApriCerca,
  demo,
  avvisi,
}: {
  onApriDrawer: () => void;
  onApriCerca: () => void;
  demo: boolean;
  avvisi: ContoAvvisi;
}) {
  const pathname = usePathname();
  const percorso = briciole(pathname);

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-border bg-background/85 px-5 backdrop-blur-sm sm:px-8">
      <Button
        variant="ghost"
        size="icon"
        className="size-11 lg:hidden"
        onClick={onApriDrawer}
        aria-label="Apri il menu"
      >
        <Menu className="size-5" />
      </Button>

      <nav aria-label="Percorso" className="min-w-0 flex-1">
        <ol className="flex items-center gap-1.5 text-sm">
          {percorso.map((b, i) => {
            const ultimo = i === percorso.length - 1;
            return (
              <Fragment key={b.href}>
                {/* Sul telefono, accanto a menu, guida, campanella e ricerca,
                    il percorso intero non ci sta: resta solo la pagina corrente. */}
                {i > 0 && (
                  <li aria-hidden className="hidden text-muted-foreground/50 sm:block">
                    /
                  </li>
                )}
                <li className={ultimo ? "min-w-0 overflow-hidden" : "hidden min-w-0 sm:block"}>
                  {ultimo ? (
                    <span
                      className="block truncate font-medium text-foreground"
                      aria-current="page"
                    >
                      {b.label}
                    </span>
                  ) : b.navigabile ? (
                    <Link
                      href={b.href}
                      className="flex min-h-11 items-center truncate text-muted-foreground transition-colors hover:text-foreground sm:min-h-0"
                    >
                      {b.label}
                    </Link>
                  ) : (
                    <span className="truncate text-muted-foreground">{b.label}</span>
                  )}
                </li>
              </Fragment>
            );
          })}
        </ol>
      </nav>

      <Guida demo={demo} />

      <Campanella {...avvisi} />

      <button
        type="button"
        onClick={onApriCerca}
        className="flex min-h-11 items-center gap-2 rounded-lg border border-border bg-card px-3 py-1.5 text-sm text-muted-foreground sm:min-h-9 transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
      >
        <Search className="size-4" aria-hidden />
        <span className="sr-only sm:not-sr-only">Cerca cliente</span>
        <kbd
          aria-hidden
          className="ml-1 hidden rounded border border-border bg-muted px-1.5 font-mono text-[11px] text-muted-foreground sm:inline"
        >
          Ctrl K
        </kbd>
      </button>
    </header>
  );
}
