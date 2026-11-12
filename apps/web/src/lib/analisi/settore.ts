import "server-only";

import type { DatiBilancio } from "@finbeacon/engine";
import {
  cifreAteco,
  confrontaConSettore,
  margineEbitda,
  posizioneInPortafoglio,
  riferimentoSettore,
  type ConfrontoSettore,
  type DimensioneImpresa,
  type PosizionePortafoglio,
} from "@finbeacon/engine/settori";
import { sql } from "drizzle-orm";

import { requireStudio } from "@/lib/auth-helpers";
import { db } from "@/lib/db";

export type EsitoSettore =
  | { stato: "senza-ateco" }
  | { stato: "senza-riferimento"; ateco: string }
  | { stato: "senza-fatturato" }
  | {
      stato: "ok";
      confronto: ConfrontoSettore;
      /** Divisione ATECO (2 cifre) su cui si misura il portafoglio */
      divisione: string;
      portafoglio: PosizionePortafoglio | null;
    };

const DIMENSIONI = new Set(["micro", "piccola", "media", "grande"]);

/**
 * Margini EBITDA degli ALTRI clienti attivi dello studio nella stessa divisione
 * ATECO, dall'esercizio più recente di ciascuno. Lo studio viene dalla sessione.
 */
async function marginiDelPortafoglio(clienteId: string, divisione: string): Promise<number[]> {
  const { organizationId } = await requireStudio();
  const righe = await db.execute<{ ebitda: string; fatturato: string }>(sql`
    select distinct on (c.id) e.ebitda, e.fatturato
      from clienti c
      join esercizi e on e.cliente_id = c.id
     where c.organization_id = ${organizationId}
       and c.archiviato_at is null
       and c.id <> ${clienteId}
       and left(regexp_replace(coalesce(c.codice_ateco, ''), '[^0-9]', '', 'g'), 2) = ${divisione}
     order by c.id, e.anno desc`);
  return righe.rows
    .map((r) => margineEbitda({ ebitda: Number(r.ebitda), fatturato: Number(r.fatturato) }))
    .filter((m): m is number => m !== null);
}

export async function confrontoSettoreCliente(
  cliente: { id: string; codiceAteco: string | null; dimensione: string | null },
  dati: DatiBilancio,
): Promise<EsitoSettore> {
  const cifre = cifreAteco(cliente.codiceAteco);
  if (!cifre) return { stato: "senza-ateco" };
  const dimensione = DIMENSIONI.has(cliente.dimensione ?? "")
    ? (cliente.dimensione as DimensioneImpresa)
    : null;
  const riferimento = riferimentoSettore(cifre, dimensione);
  if (!riferimento) return { stato: "senza-riferimento", ateco: cliente.codiceAteco! };
  const margine = margineEbitda(dati);
  if (margine === null) return { stato: "senza-fatturato" };

  const divisione = cifre.slice(0, 2);
  const altri = await marginiDelPortafoglio(cliente.id, divisione);
  return {
    stato: "ok",
    confronto: confrontaConSettore(margine, riferimento),
    divisione,
    portafoglio: posizioneInPortafoglio(margine, altri),
  };
}
