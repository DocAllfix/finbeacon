import { and, eq, isNull, sql } from "drizzle-orm";

import { member, user } from "@/lib/auth-schema";
import { db, type Esecutore } from "@/lib/db";
import { accoda } from "@/lib/email/outbox";
import { riepilogoAvvisi } from "@/lib/email/template";
import { avvisi, clienti, lavoriPeriodici, preferenzeAvvisi } from "@/lib/schema-dominio";

import { controlloAvvisiDiTempo, oggiARoma } from "./servizio";

/**
 * Lavori a cadenza fissa, fatti girare dal servizio della posta a ogni giro.
 *
 * Ogni lavoro prenota la riga (nome, giorno) e lavora NELLA STESSA transazione:
 * se fallisce, la prenotazione si annulla e il giro dopo riprova; se riesce,
 * nessun riavvio del container lo ripete nello stesso giorno. Un secondo worker
 * concorrente resta in attesa sulla chiave e poi trova il lavoro già fatto.
 */

/** Ora e giorno della settimana a Roma (1 = lunedì). */
function oraARoma(adesso: Date): { ora: number; lunedi: boolean } {
  const parti = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Rome",
    hour: "numeric",
    hourCycle: "h23",
    weekday: "short",
  }).formatToParts(adesso);
  const ora = Number(parti.find((p) => p.type === "hour")?.value ?? 0);
  const giorno = parti.find((p) => p.type === "weekday")?.value;
  return { ora, lunedi: giorno === "Mon" };
}

/** Dalle 7 in poi: niente mail o avvisi nuovi nel cuore della notte. */
const ORA_INIZIO = 7;

async function unaVoltaAlGiorno(
  nome: string,
  giorno: string,
  lavoro: (tx: Esecutore) => Promise<void>,
): Promise<boolean> {
  return db.transaction(async (tx) => {
    const prenotato = await tx
      .insert(lavoriPeriodici)
      .values({ nome, giorno })
      .onConflictDoNothing()
      .returning({ nome: lavoriPeriodici.nome });
    if (prenotato.length === 0) return false;
    await lavoro(tx);
    return true;
  });
}

/** Riepilogo del lunedì: un'email per membro che lo vuole, solo se c'è qualcosa di aperto. */
export async function inviaRiepiloghi(esecutore: Esecutore): Promise<number> {
  const conteggi = await esecutore
    .select({
      organizationId: avvisi.organizationId,
      aperti: sql<number>`count(*)::int`,
      critici: sql<number>`(count(*) filter (where ${avvisi.gravita} = 'critico'))::int`,
    })
    .from(avvisi)
    .innerJoin(clienti, eq(clienti.id, avvisi.clienteId))
    .where(and(isNull(avvisi.chiusoAt), isNull(clienti.archiviatoAt)))
    .groupBy(avvisi.organizationId);

  const base = process.env.BETTER_AUTH_URL ?? "http://localhost:3000";
  let inviati = 0;
  for (const c of conteggi) {
    const membri = await esecutore
      .select({ email: user.email, vuole: preferenzeAvvisi.riepilogoSettimanale })
      .from(member)
      .innerJoin(user, eq(user.id, member.userId))
      .leftJoin(preferenzeAvvisi, eq(preferenzeAvvisi.userId, member.userId))
      .where(eq(member.organizationId, c.organizationId));
    for (const m of membri) {
      if (m.vuole === false) continue;
      await accoda(m.email, riepilogoAvvisi(c.aperti, c.critici, `${base}/app/avvisi`), {
        organizationId: c.organizationId,
        esecutore,
      });
      inviati += 1;
    }
  }
  return inviati;
}

/** Un giro dei lavori periodici. Restituisce cosa ha fatto, per il log. */
export async function eseguiLavoriPeriodici(adesso = new Date()): Promise<string[]> {
  const { ora, lunedi } = oraARoma(adesso);
  if (ora < ORA_INIZIO) return [];
  const giorno = oggiARoma(adesso);
  const fatti: string[] = [];

  await unaVoltaAlGiorno("avvisi-di-tempo", giorno, async (tx) => {
    const n = await controlloAvvisiDiTempo(tx, giorno);
    fatti.push(`controllo avvisi di tempo: ${n} aperti`);
  });

  if (lunedi) {
    await unaVoltaAlGiorno("riepilogo-avvisi", giorno, async (tx) => {
      const n = await inviaRiepiloghi(tx);
      fatti.push(`riepilogo del lunedì: ${n} email in coda`);
    });
  }
  return fatti;
}
