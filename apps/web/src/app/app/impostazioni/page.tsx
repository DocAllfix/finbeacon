import { requireStudio } from "@/lib/auth-helpers";
import { preferenzeAvvisiUtente } from "@/lib/avvisi/queries";

import { PannelloStudio } from "./pannello-studio";
import { PreferenzeAvvisiPannello } from "./preferenze-avvisi";

export default async function ImpostazioniPage() {
  const [{ demo }, preferenze] = await Promise.all([requireStudio(), preferenzeAvvisiUtente()]);
  return (
    <div>
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Impostazioni studio</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Persone dello studio, inviti e le tue email degli avvisi.
        </p>
      </header>
      <div className="mt-8">
        <PannelloStudio demo={demo} />
      </div>
      <div className="mt-10">
        <PreferenzeAvvisiPannello iniziali={preferenze} demo={demo} />
      </div>
    </div>
  );
}
