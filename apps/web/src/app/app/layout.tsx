import { AppShell } from "@/components/app-shell/app-shell";
import { requireStudio } from "@/lib/auth-helpers";
import { contaAvvisiNonLetti } from "@/lib/avvisi/queries";
import { listClientiPerRicerca } from "@/lib/clienti/queries";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  // requireStudio è memoizzata per render: layout, pagina e query la
  // condividono senza rileggere sessione e studio ogni volta.
  const [studio, clienti, avvisi] = await Promise.all([
    requireStudio(),
    listClientiPerRicerca(),
    contaAvvisiNonLetti(),
  ]);

  return (
    <AppShell
      studio={{ nome: studio.nomeStudio }}
      utente={{ nome: studio.nomeUtente, email: studio.email }}
      clienti={clienti}
      demo={studio.demo}
      urlLanding={process.env.URL_LANDING}
      avvisi={avvisi}
    >
      {children}
    </AppShell>
  );
}
