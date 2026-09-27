"use client";

import { useState } from "react";

import { FasciaDemo } from "@/components/fascia-demo";
import { Toaster } from "@/components/ui/sonner";
import { useSidebarRidotta } from "@/lib/preferenza-sidebar";

import { CommandMenu } from "./command-menu";
import { Sidebar } from "./sidebar";
import { Topbar } from "./topbar";

export type DatiStudio = { nome: string };
export type DatiUtente = { nome: string; email: string };
export type ClienteRicerca = { id: string; ragioneSociale: string };

export function AppShell({
  studio,
  utente,
  clienti,
  demo,
  urlLanding,
  children,
}: {
  studio: DatiStudio;
  utente: DatiUtente;
  clienti: ClienteRicerca[];
  demo: boolean;
  /** Dove mandare chi, dalla demo, vuole un appuntamento. Assente = nessuna fascia. */
  urlLanding?: string;
  children: React.ReactNode;
}) {
  const [drawerAperto, setDrawerAperto] = useState(false);
  const [cercaAperto, setCercaAperto] = useState(false);
  const [ridotta, cambiaRidotta] = useSidebarRidotta();

  return (
    <div
      className={
        ridotta
          ? "min-h-screen lg:grid lg:grid-cols-[68px_1fr]"
          : "min-h-screen lg:grid lg:grid-cols-[248px_1fr]"
      }
    >
      <Sidebar
        studio={studio}
        utente={utente}
        drawerAperto={drawerAperto}
        onChiudiDrawer={() => setDrawerAperto(false)}
        ridotta={ridotta}
        onCambiaRidotta={cambiaRidotta}
      />
      <div className="flex min-h-screen min-w-0 flex-col">
        <Topbar
          onApriDrawer={() => setDrawerAperto(true)}
          onApriCerca={() => setCercaAperto(true)}
          demo={demo}
        />
        <main className="mx-auto w-full max-w-5xl flex-1 px-5 py-8 sm:px-8 sm:py-10">
          {children}
        </main>
        {/* Solo in demo, e solo se sappiamo dove mandare chi vuole parlarci:
            una fascia con due pulsanti che non portano da nessuna parte sarebbe
            peggio che nessuna fascia. */}
        {demo && urlLanding && <FasciaDemo urlLanding={urlLanding} />}
      </div>
      <CommandMenu aperto={cercaAperto} onCambioApertura={setCercaAperto} clienti={clienti} />
      <Toaster position="bottom-center" />
    </div>
  );
}
