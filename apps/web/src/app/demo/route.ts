import { and, asc, eq, isNull } from "drizzle-orm";
import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { db, schema } from "@/lib/db";

/**
 * Ingresso nella demo con un clic, senza digitare credenziali.
 *
 * COME FUNZIONA. Si autentica lato server lo studio dimostrativo e si inoltrano
 * al browser i cookie che Better Auth ha emesso, poi si reindirizza. Niente
 * meccanismi nuovi: `asResponse: true` restituisce una `Response` vera, con i
 * suoi `Set-Cookie`, e li si ricopia sulla risposta di reindirizzamento.
 *
 * DEVE ESSERE UN COLLEGAMENTO, NON UNA CHIAMATA JAVASCRIPT. I cookie di
 * sessione sono `sameSite: "lax"` e senza `domain` (vedi `advanced` in
 * auth.ts), e la landing vive su un'altra origine. Una navigazione di primo
 * livello — un `<a href>` — li fa impostare correttamente; una `fetch` dalla
 * landing no, e l'ingresso sembrerebbe funzionare per poi scaricare l'utente
 * sul login.
 *
 * IDEMPOTENTE. Non crea utenti, studi od organizzazioni: l'identita' e' una
 * sola, seminata da `seed-demo.ts`. Ogni visitatore ottiene una SESSIONE
 * propria sulla stessa identita', quindi i visitatori vedono gli stessi dati.
 * Va bene perche' lo studio dimostrativo e' in sola lettura: `vietatoInDemo()`
 * blocca ogni scrittura di dominio e le mutazioni dello studio sono fermate
 * dall'hook in auth.ts. Nessuno puo' cambiare cio' che un altro sta guardando,
 * quindi non serve nessun ripristino notturno.
 *
 * DOVE ATTERRA. Non sul cruscotto: sulla pagina di analisi del cliente con il
 * punteggio piu' basso, che e' quella che mostra soglie, giudizi e consigli con
 * qualcosa da dire. Chi arriva da una vetrina ha trenta secondi di attenzione,
 * e un cruscotto glieli fa spendere a cercare dove guardare.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Freno d'emergenza in memoria di processo.
 *
 * Non e' un limitatore serio e non va spacciato per tale: su un runtime
 * serverless ogni istanza ha il suo contatore, quindi il tetto vero e' questo
 * numero moltiplicato per le istanze attive. Serve a impedire che un singolo
 * client in raffica apra centinaia di sessioni nello stesso processo; un
 * limite vero, se servira', va messo davanti all'applicazione.
 *
 * Il limitatore di Better Auth non copre questa rotta: vale per `/api/auth/*`.
 */
const FINESTRA_MS = 60_000;
const MAX_PER_FINESTRA = 10;
const visite = new Map<string, { da: number; quante: number }>();

function troppeVolte(chiave: string): boolean {
  const ora = Date.now();
  const v = visite.get(chiave);
  if (!v || ora - v.da > FINESTRA_MS) {
    visite.set(chiave, { da: ora, quante: 1 });
    // La mappa non cresce all'infinito: si potano le finestre scadute.
    if (visite.size > 5_000) {
      for (const [k, x] of visite) if (ora - x.da > FINESTRA_MS) visite.delete(k);
    }
    return false;
  }
  v.quante += 1;
  return v.quante > MAX_PER_FINESTRA;
}

/** Il cliente su cui far atterrare: quello con il punteggio piu' basso. */
async function destinazione(organizationId: string): Promise<string> {
  const righe = await db
    .select({ clienteId: schema.analisi.clienteId, score: schema.analisi.score })
    .from(schema.analisi)
    .innerJoin(schema.clienti, eq(schema.clienti.id, schema.analisi.clienteId))
    .where(
      and(eq(schema.clienti.organizationId, organizationId), isNull(schema.clienti.archiviatoAt)),
    )
    .orderBy(asc(schema.analisi.score))
    .limit(1);
  const cliente = righe[0]?.clienteId;
  return cliente ? `/app/clienti/${cliente}/analisi` : "/app";
}

export async function GET(richiesta: Request) {
  const email = process.env.DEMO_EMAIL;
  const password = process.env.DEMO_PASSWORD;
  if (!email || !password) {
    // Senza credenziali configurate la demo non esiste: meglio 404 che una
    // pagina che promette e non mantiene.
    return new NextResponse("Demo non disponibile.", { status: 404 });
  }

  const ip =
    richiesta.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    richiesta.headers.get("x-real-ip") ||
    "sconosciuto";
  if (troppeVolte(ip)) {
    return new NextResponse("Troppi ingressi in poco tempo. Riprova fra un minuto.", {
      status: 429,
    });
  }

  const accesso = await auth.api.signInEmail({
    body: { email, password },
    asResponse: true,
  });
  if (!accesso.ok) {
    // Credenziali dimostrative sbagliate o studio non seminato: e' un difetto
    // nostro, non del visitatore.
    return new NextResponse("Demo non disponibile.", { status: 503 });
  }

  const origine = new URL(richiesta.url).origin;
  let percorso = "/app";
  try {
    const utenti = await db
      .select({ id: schema.user.id })
      .from(schema.user)
      .where(eq(schema.user.email, email))
      .limit(1);
    const membri = utenti[0]
      ? await db
          .select({ organizationId: schema.member.organizationId })
          .from(schema.member)
          .where(eq(schema.member.userId, utenti[0].id))
          .limit(1)
      : [];
    const org = membri[0]?.organizationId;
    if (org) percorso = await destinazione(org);
  } catch {
    // Se la ricerca del cliente non riesce, si entra comunque: meglio il
    // cruscotto che una porta chiusa.
  }

  const risposta = NextResponse.redirect(new URL(percorso, origine), 303);
  for (const cookie of accesso.headers.getSetCookie()) {
    risposta.headers.append("set-cookie", cookie);
  }
  return risposta;
}
