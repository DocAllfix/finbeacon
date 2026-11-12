import {
  avvisiDaAnalisi,
  avvisiDiTempo,
  type Analisi,
  type AvvisoCalcolato,
  type EsitoAvvisi,
} from "@finbeacon/engine";
import { and, desc, eq, inArray, isNotNull, isNull, sql } from "drizzle-orm";

import { member, user } from "@/lib/auth-schema";
import { type Esecutore } from "@/lib/db";
import { accoda } from "@/lib/email/outbox";
import { avvisoCritico } from "@/lib/email/template";
import { analisi, avvisi, clienti, esercizi, preferenzeAvvisi } from "@/lib/schema-dominio";

/**
 * Dove le regole del motore diventano righe: aprire, chiudere, avvisare per
 * email. Usato dalle azioni sugli esercizi (avvisi di passaggio, nella stessa
 * transazione del salvataggio) e dal servizio della posta (avvisi di tempo).
 */

/** L'analisi più recente del cliente: esercizio con l'anno più alto, ultima versione. */
export async function analisiPiuRecente(
  esecutore: Esecutore,
  clienteId: string,
): Promise<Analisi | null> {
  const [riga] = await esecutore
    .select({ output: analisi.output })
    .from(analisi)
    .innerJoin(esercizi, eq(esercizi.id, analisi.esercizioId))
    .where(eq(analisi.clienteId, clienteId))
    .orderBy(desc(esercizi.anno), desc(analisi.versione))
    .limit(1);
  return (riga?.output as Analisi | undefined) ?? null;
}

/**
 * Applica l'esito delle regole. Restituisce gli avvisi DAVVERO aperti ora
 * (quelli già aperti non si ripetono): i critici fra questi meritano un'email.
 */
export async function applicaEsito(
  esecutore: Esecutore,
  organizationId: string,
  clienteId: string,
  esito: EsitoAvvisi,
): Promise<AvvisoCalcolato[]> {
  if (esito.chiudi.length > 0) {
    await esecutore
      .update(avvisi)
      .set({ chiusoAt: new Date() })
      .where(
        and(
          eq(avvisi.clienteId, clienteId),
          inArray(avvisi.tipo, esito.chiudi),
          isNull(avvisi.chiusoAt),
        ),
      );
  }
  const nuovi: AvvisoCalcolato[] = [];
  for (const a of esito.apri) {
    // L'indice unico parziale fa da arbitro: se è già aperto, non si duplica.
    const inseriti = await esecutore
      .insert(avvisi)
      .values({ organizationId, clienteId, ...a })
      .onConflictDoNothing()
      .returning({ id: avvisi.id });
    if (inseriti.length > 0) nuovi.push(a);
  }
  return nuovi;
}

/** Indirizzi dei membri dello studio che vogliono l'email immediata dei critici. */
async function destinatariCritici(esecutore: Esecutore, organizationId: string) {
  const righe = await esecutore
    .select({ email: user.email, vuole: preferenzeAvvisi.emailCritici })
    .from(member)
    .innerJoin(user, eq(user.id, member.userId))
    .leftJoin(preferenzeAvvisi, eq(preferenzeAvvisi.userId, member.userId))
    .where(eq(member.organizationId, organizationId));
  return righe.filter((r) => r.vuole !== false).map((r) => r.email);
}

/**
 * Email per i critici appena aperti, nella stessa transazione: se il
 * salvataggio non va, la mail non parte. CONTENT-FREE (regola di template.ts):
 * né cliente né importi, solo l'invito ad aprire l'applicazione.
 */
export async function avvisaPerEmail(
  esecutore: Esecutore,
  organizationId: string,
  nuoviCritici: number,
): Promise<void> {
  if (nuoviCritici === 0) return;
  const base = process.env.BETTER_AUTH_URL ?? "http://localhost:3000";
  for (const email of await destinatariCritici(esecutore, organizationId)) {
    await accoda(email, avvisoCritico(nuoviCritici, `${base}/app/avvisi`), {
      organizationId,
      esecutore,
    });
  }
  await esecutore
    .update(avvisi)
    .set({ emailInviataAt: new Date() })
    .where(
      and(
        eq(avvisi.organizationId, organizationId),
        eq(avvisi.gravita, "critico"),
        isNull(avvisi.chiusoAt),
        isNull(avvisi.emailInviataAt),
      ),
    );
}

/**
 * Dopo una scrittura sugli esercizi di un cliente: confronta l'analisi più
 * recente PRIMA (passata dal chiamante) con quella DOPO, e aggiorna gli avvisi.
 * Senza più esercizi, gli avvisi di passaggio del cliente si chiudono.
 */
export async function aggiornaAvvisiDopoSalvataggio(
  esecutore: Esecutore,
  organizationId: string,
  clienteId: string,
  prima: Analisi | null,
): Promise<void> {
  const dopo = await analisiPiuRecente(esecutore, clienteId);
  if (!dopo) {
    await esecutore
      .update(avvisi)
      .set({ chiusoAt: new Date() })
      .where(
        and(
          eq(avvisi.clienteId, clienteId),
          isNull(avvisi.chiusoAt),
          sql`${avvisi.tipo} not in ('previsionale-scaduto','bilancio-mancante')`,
        ),
      );
    return;
  }
  const nuovi = await applicaEsito(
    esecutore,
    organizationId,
    clienteId,
    avvisiDaAnalisi(prima, dopo),
  );
  await avvisaPerEmail(
    esecutore,
    organizationId,
    nuovi.filter((a) => a.gravita === "critico").length,
  );
}

/** Giorno di oggi a Roma, AAAA-MM-GG: lo studio ragiona in ora italiana. */
export function oggiARoma(adesso = new Date()): string {
  return new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Rome" }).format(adesso);
}

/**
 * Controllo giornaliero degli avvisi di tempo, per tutti i clienti attivi
 * dell'istanza (un'istanza serve uno studio, ma il codice non lo presume).
 */
export async function controlloAvvisiDiTempo(esecutore: Esecutore, oggi: string): Promise<number> {
  const attivi = await esecutore
    .select({ id: clienti.id, organizationId: clienti.organizationId })
    .from(clienti)
    .where(isNull(clienti.archiviatoAt));
  let aperti = 0;
  for (const c of attivi) {
    const [ultimo] = await esecutore
      .select({ anno: esercizi.anno })
      .from(esercizi)
      .where(eq(esercizi.clienteId, c.id))
      .orderBy(desc(esercizi.anno))
      .limit(1);
    // la previsione a 6 mesi più recente: l'ultimo esercizio che la contiene
    const [prev] = await esecutore
      .select({ del: esercizi.updatedAt })
      .from(esercizi)
      .where(and(eq(esercizi.clienteId, c.id), isNotNull(esercizi.liquiditaIniziale)))
      .orderBy(desc(esercizi.anno))
      .limit(1);
    const esito = avvisiDiTempo({
      oggi,
      ultimoAnno: ultimo?.anno ?? null,
      previsionaleDel: prev ? oggiARoma(prev.del) : null,
    });
    aperti += (await applicaEsito(esecutore, c.organizationId, c.id, esito)).length;
  }
  return aperti;
}
