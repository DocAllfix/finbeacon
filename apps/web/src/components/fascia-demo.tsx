import { CalendarCheck, Sparkles } from "lucide-react";

import { InvitoContatto } from "@/components/invito-contatto";
import { Button } from "@/components/ui/button";

/**
 * La fascia che chiude il giro: chi sta provando la demo deve poter chiedere un
 * appuntamento senza cercare come.
 *
 * Sta in fondo e resta ferma mentre si scorre, perche' la decisione di
 * contattarci non arriva all'inizio della visita ma dopo aver guardato: una
 * barra in cima verrebbe letta come pubblicita' e ignorata.
 *
 * Il tono e' quello di PRODUCT.md, «calma operativa»: un filo di bordo, il
 * fondo appena staccato, nessun gradiente e nessun bagliore. Sta sopra i
 * contenuti di uno strumento di lavoro, non sopra una landing.
 *
 * Le due destinazioni portano al modulo della landing con il motivo GIA'
 * scelto: `?motivo=appuntamento` e `?motivo=acquisto` sono i valori che quel
 * modulo riconosce (`apps/landing/src/lib/modulo.ts`), e `#richiesta` e'
 * l'ancora della sua sezione. Le parole sono le sue, non nostre: se la landing
 * dice «Attivare FinBeacon per lo studio», qui non si inventa un sinonimo.
 */
export function FasciaDemo({ urlLanding }: { urlLanding: string }) {
  const verso = (motivo: string) => `${urlLanding}/?motivo=${motivo}#richiesta`;

  return (
    <div
      role="complementary"
      aria-label="Stai provando la versione dimostrativa"
      className="sticky bottom-0 z-30 border-t border-hairline bg-card/95 backdrop-blur-sm"
    >
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-3 px-5 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-8">
        <div className="min-w-0">
          <p className="text-sm text-foreground/80">
            <span className="font-semibold text-foreground">Stai provando FinBeacon.</span> I dati
            sono di due aziende di esempio e non si possono modificare.
          </p>
          {/* Chi riceve due cookie su questo dominio deve avere dove leggere
              cosa sono: le pagine legali vivono sulla vetrina, non qui. */}
          <p className="mt-0.5 text-xs text-muted-foreground">
            <a href={`${urlLanding}/privacy`} className="underline underline-offset-2">
              Privacy
            </a>
            {" · "}
            <a href={`${urlLanding}/cookie`} className="underline underline-offset-2">
              Cookie
            </a>
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          {/* Compare solo dopo che il visitatore ha aperto il simulatore. */}
          <InvitoContatto />
          <Button asChild variant="outline" size="sm">
            <a href={verso("appuntamento")}>
              <CalendarCheck className="size-4" aria-hidden />
              Fissa un appuntamento
            </a>
          </Button>
          <Button asChild size="sm">
            <a href={verso("acquisto")}>
              <Sparkles className="size-4" aria-hidden />
              Attivalo per il tuo studio
            </a>
          </Button>
        </div>
      </div>
    </div>
  );
}
