"use server";

import { revalidatePath } from "next/cache";
import { and, eq, isNull } from "drizzle-orm";
import { z } from "zod";

import { requireStudio, vietatoInDemo } from "@/lib/auth-helpers";
import { db } from "@/lib/db";
import { eUuid } from "@/lib/id";
import { avvisi, preferenzeAvvisi } from "@/lib/schema-dominio";

export type RisultatoAvvisi = { ok: true } | { ok: false; errore: string };

/**
 * «Letto» vale per lo studio, non per la persona: chi lo apre per primo lo
 * toglie dalla campanella di tutti. Uno studio piccolo lavora sugli stessi
 * clienti; due stati di lettura separati sarebbero rumore.
 */
export async function segnaAvvisoLetto(id: string): Promise<RisultatoAvvisi> {
  if (!eUuid(id)) return { ok: false, errore: "Avviso non trovato." };
  const studio = await requireStudio();
  const bloccato = vietatoInDemo(studio);
  if (bloccato) return bloccato;
  const aggiornati = await db
    .update(avvisi)
    .set({ lettoAt: new Date() })
    .where(and(eq(avvisi.id, id), eq(avvisi.organizationId, studio.organizationId)))
    .returning({ clienteId: avvisi.clienteId });
  if (aggiornati.length === 0) return { ok: false, errore: "Avviso non trovato." };
  revalidatePath("/app", "layout");
  return { ok: true };
}

export async function segnaTuttiLetti(): Promise<RisultatoAvvisi> {
  const studio = await requireStudio();
  const bloccato = vietatoInDemo(studio);
  if (bloccato) return bloccato;
  await db
    .update(avvisi)
    .set({ lettoAt: new Date() })
    .where(
      and(
        eq(avvisi.organizationId, studio.organizationId),
        isNull(avvisi.chiusoAt),
        isNull(avvisi.lettoAt),
      ),
    );
  revalidatePath("/app", "layout");
  return { ok: true };
}

const preferenzeSchema = z.object({
  emailCritici: z.boolean(),
  riepilogoSettimanale: z.boolean(),
});

/** Preferenze dell'utente corrente: valgono solo per chi le imposta. */
export async function salvaPreferenzeAvvisi(input: unknown): Promise<RisultatoAvvisi> {
  const studio = await requireStudio();
  const bloccato = vietatoInDemo(studio);
  if (bloccato) return bloccato;
  const parsed = preferenzeSchema.safeParse(input);
  if (!parsed.success) return { ok: false, errore: "Preferenze non valide." };
  await db
    .insert(preferenzeAvvisi)
    .values({ userId: studio.userId, ...parsed.data })
    .onConflictDoUpdate({ target: preferenzeAvvisi.userId, set: parsed.data });
  revalidatePath("/app/impostazioni");
  return { ok: true };
}
