import "server-only";

import { and, asc, desc, eq, isNotNull, isNull, sql } from "drizzle-orm";

import { requireStudio } from "@/lib/auth-helpers";
import { db } from "@/lib/db";
import { avvisi, clienti, preferenzeAvvisi } from "@/lib/schema-dominio";

export type AvvisoLista = {
  id: string;
  tipo: string;
  gravita: "critico" | "attenzione";
  titolo: string;
  testo: string;
  letto: boolean;
  aperto: boolean;
  creatoIl: Date;
  chiusoIl: Date | null;
  clienteId: string;
  cliente: string;
};

// Critici prima, poi i più recenti. Gli avvisi dei clienti archiviati non si
// mostrano: lo studio ha già deciso che quel cliente non va seguito.
const ordineGravita = sql`case when ${avvisi.gravita} = 'critico' then 0 else 1 end`;

function selezione() {
  return db
    .select({
      id: avvisi.id,
      tipo: avvisi.tipo,
      gravita: avvisi.gravita,
      titolo: avvisi.titolo,
      testo: avvisi.testo,
      lettoAt: avvisi.lettoAt,
      chiusoAt: avvisi.chiusoAt,
      createdAt: avvisi.createdAt,
      clienteId: avvisi.clienteId,
      cliente: clienti.ragioneSociale,
    })
    .from(avvisi)
    .innerJoin(clienti, eq(clienti.id, avvisi.clienteId));
}

type Riga = {
  id: string;
  tipo: string;
  gravita: string;
  titolo: string;
  testo: string;
  lettoAt: Date | null;
  chiusoAt: Date | null;
  createdAt: Date;
  clienteId: string;
  cliente: string;
};

function inLista(r: Riga): AvvisoLista {
  return {
    id: r.id,
    tipo: r.tipo,
    gravita: r.gravita === "critico" ? "critico" : "attenzione",
    titolo: r.titolo,
    testo: r.testo,
    letto: r.lettoAt !== null,
    aperto: r.chiusoAt === null,
    creatoIl: r.createdAt,
    chiusoIl: r.chiusoAt,
    clienteId: r.clienteId,
    cliente: r.cliente,
  };
}

/** Avvisi dello studio: aperti (tutti) o chiusi (gli ultimi 100). */
export async function listAvvisi(stato: "aperti" | "chiusi"): Promise<AvvisoLista[]> {
  const { organizationId } = await requireStudio();
  const base = and(eq(avvisi.organizationId, organizationId), isNull(clienti.archiviatoAt));
  const righe =
    stato === "aperti"
      ? await selezione()
          .where(and(base, isNull(avvisi.chiusoAt)))
          .orderBy(ordineGravita, desc(avvisi.createdAt))
      : await selezione()
          .where(and(base, isNotNull(avvisi.chiusoAt)))
          .orderBy(desc(avvisi.chiusoAt))
          .limit(100);
  return righe.map(inLista);
}

/** Avvisi aperti di un cliente dello studio, per la scheda. */
export async function avvisiApertiCliente(clienteId: string): Promise<AvvisoLista[]> {
  const { organizationId } = await requireStudio();
  const righe = await selezione()
    .where(
      and(
        eq(avvisi.organizationId, organizationId),
        eq(avvisi.clienteId, clienteId),
        isNull(avvisi.chiusoAt),
      ),
    )
    .orderBy(ordineGravita, asc(avvisi.createdAt));
  return righe.map(inLista);
}

/** Per la campanella: aperti e non ancora letti, e quanti di questi critici. */
export async function contaAvvisiNonLetti(): Promise<{ nonLetti: number; critici: number }> {
  const { organizationId } = await requireStudio();
  const [r] = await db
    .select({
      nonLetti: sql<number>`count(*)::int`,
      critici: sql<number>`(count(*) filter (where ${avvisi.gravita} = 'critico'))::int`,
    })
    .from(avvisi)
    .innerJoin(clienti, eq(clienti.id, avvisi.clienteId))
    .where(
      and(
        eq(avvisi.organizationId, organizationId),
        isNull(clienti.archiviatoAt),
        isNull(avvisi.chiusoAt),
        isNull(avvisi.lettoAt),
      ),
    );
  return { nonLetti: r?.nonLetti ?? 0, critici: r?.critici ?? 0 };
}

export type PreferenzeAvvisi = { emailCritici: boolean; riepilogoSettimanale: boolean };

/** Preferenze dell'utente corrente: senza riga, valgono i predefiniti (entrambe attive). */
export async function preferenzeAvvisiUtente(): Promise<PreferenzeAvvisi> {
  const { userId } = await requireStudio();
  const [p] = await db
    .select({
      emailCritici: preferenzeAvvisi.emailCritici,
      riepilogoSettimanale: preferenzeAvvisi.riepilogoSettimanale,
    })
    .from(preferenzeAvvisi)
    .where(eq(preferenzeAvvisi.userId, userId))
    .limit(1);
  return p ?? { emailCritici: true, riepilogoSettimanale: true };
}
