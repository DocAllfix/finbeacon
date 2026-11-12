import { formatNumero } from "@finbeacon/engine";
import Link from "next/link";

import { JudgmentBadge, type JudgmentTone } from "@/components/ui/judgment-badge";
import { MicroEtichetta } from "@/components/ui/micro-etichetta";
import type { EsitoSettore } from "@/lib/analisi/settore";

const POSIZIONE: Record<"sopra" | "in-linea" | "sotto", { label: string; tone: JudgmentTone }> = {
  sopra: { label: "Sopra il settore", tone: "buono" },
  "in-linea": { label: "In linea", tone: "nd" },
  sotto: { label: "Sotto il settore", tone: "attenzione" },
};

const pct = (n: number) => `${formatNumero(n, 1)}%`;

/** Barra orizzontale su scala comune; un margine negativo resta a zero, col valore scritto. */
function Barra({
  etichetta,
  valore,
  massimo,
  accento,
}: {
  etichetta: string;
  valore: number;
  massimo: number;
  accento: boolean;
}) {
  const larghezza = Math.max(0, Math.min(100, (valore / massimo) * 100));
  return (
    <div className="grid grid-cols-[minmax(0,9rem)_1fr_auto] items-center gap-3 text-sm sm:grid-cols-[11rem_1fr_auto]">
      <span className="truncate text-muted-foreground">{etichetta}</span>
      <span className="h-2 overflow-hidden rounded-full bg-muted" aria-hidden>
        <span
          className={
            accento
              ? "block h-full rounded-full bg-primary"
              : "block h-full rounded-full bg-muted-foreground/60"
          }
          style={{ width: `${larghezza}%` }}
        />
      </span>
      <span className="nums w-14 text-right font-medium">{pct(valore)}</span>
    </div>
  );
}

export function ConfrontoSettoreBlocco({ esito }: { esito: EsitoSettore }) {
  return (
    <section aria-labelledby="confronto-settore">
      <MicroEtichetta come="h2" id="confronto-settore">
        Confronto di settore
      </MicroEtichetta>
      <div className="mt-2 border-t border-hairline pt-4">
        {esito.stato === "ok" ? (
          <ContenutoConfronto esito={esito} />
        ) : (
          <p className="max-w-[68ch] text-sm text-muted-foreground">
            {esito.stato === "senza-ateco" && (
              <>
                Il cliente non ha un codice ATECO: impostalo dal{" "}
                <Link
                  href="/app/clienti"
                  className="font-medium text-foreground underline underline-offset-4"
                >
                  portafoglio clienti
                </Link>{" "}
                (Modifica), oppure importa il bilancio XBRL, che lo contiene.
              </>
            )}
            {esito.stato === "senza-riferimento" &&
              `Per il codice ATECO ${esito.ateco} l'ISTAT non pubblica dati confrontabili.`}
            {esito.stato === "senza-fatturato" &&
              "Senza fatturato il margine EBITDA non si calcola, e il confronto non ha senso."}
          </p>
        )}
      </div>
    </section>
  );
}

function ContenutoConfronto({ esito }: { esito: Extract<EsitoSettore, { stato: "ok" }> }) {
  const { confronto, portafoglio, divisione } = esito;
  const { riferimento } = confronto;
  const massimo = Math.max(confronto.margineCliente, riferimento.margine, 1) * 1.15;
  const posizione = POSIZIONE[confronto.posizione];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
        <p className="text-sm font-medium">Margine EBITDA sul fatturato</p>
        <JudgmentBadge tone={posizione.tone}>{posizione.label}</JudgmentBadge>
      </div>

      <div className="flex max-w-xl flex-col gap-2.5">
        <Barra
          etichetta="Questo cliente"
          valore={confronto.margineCliente}
          massimo={massimo}
          accento
        />
        <Barra
          etichetta={`Settore ${riferimento.codice}`}
          valore={riferimento.margine}
          massimo={massimo}
          accento={false}
        />
      </div>

      <p className="max-w-[68ch] text-sm text-foreground/85">{confronto.testo}</p>

      {portafoglio && (
        <p className="max-w-[68ch] text-sm text-foreground/85">
          Nel tuo studio: fra i {portafoglio.quanti} clienti della divisione ATECO {divisione},{" "}
          {portafoglio.sotto === 0
            ? "nessuno ha un margine più basso"
            : portafoglio.sotto === 1
              ? "uno ha un margine più basso"
              : `${portafoglio.sotto} hanno un margine più basso`}
          .
        </p>
      )}

      <p className="max-w-[68ch] text-xs text-muted-foreground">
        Settore usato: {riferimento.codice} {riferimento.nome}. ISTAT, {riferimento.anno} ·
        indicativo: il MOL dell&apos;ISTAT è valore aggiunto meno costo del lavoro, simile ma non
        identico all&apos;EBITDA di bilancio, e il codice è ATECO 2007.
      </p>
    </div>
  );
}
