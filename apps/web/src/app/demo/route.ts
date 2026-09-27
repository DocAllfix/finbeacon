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

/**
 * Il cliente su cui far atterrare: quello con il punteggio piu' basso, perche'
 * e' quello che ha qualcosa da dire su soglie, giudizi e consigli.
 *
 * In due tempi, e il secondo non e' una cortesia: il punteggio vive nella
 * tabella `analisi`, che esiste solo dove un'analisi e' stata calcolata e
 * salvata. Uno studio con clienti ma senza analisi salvate — un dato di prova,
 * un import appena fatto — darebbe zero righe, e con un solo `innerJoin`
 * finiremmo sul cruscotto senza capire perche'. Quindi: se il punteggio c'e' lo
 * si usa, altrimenti si prende il primo cliente e si entra comunque.
 */
async function destinazione(organizationId: string): Promise<string> {
  const conPunteggio = await db
    .select({ clienteId: schema.analisi.clienteId })
    .from(schema.analisi)
    .innerJoin(schema.clienti, eq(schema.clienti.id, schema.analisi.clienteId))
    .where(
      and(eq(schema.clienti.organizationId, organizationId), isNull(schema.clienti.archiviatoAt)),
    )
    .orderBy(asc(schema.analisi.score))
    .limit(1);
  if (conPunteggio[0]) return `/app/clienti/${conPunteggio[0].clienteId}/analisi`;

  const primo = await db
    .select({ id: schema.clienti.id })
    .from(schema.clienti)
    .where(
      and(eq(schema.clienti.organizationId, organizationId), isNull(schema.clienti.archiviatoAt)),
    )
    .orderBy(asc(schema.clienti.createdAt))
    .limit(1);
  return primo[0] ? `/app/clienti/${primo[0].id}/analisi` : "/app";
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

  /*
   * Reindirizzamento RELATIVO, e non e' un dettaglio di stile.
   *
   * Costruirlo assoluto a partire da `richiesta.url` sembra piu' esplicito ed e'
   * una trappola: dietro un proxy o in collaudo il server si vede con un nome
   * diverso da quello che ha digitato il visitatore — `localhost` invece di
   * `127.0.0.1`, o il nome interno del container invece del dominio. Il browser
   * seguirebbe il reindirizzamento su QUELL'origine, e il cookie appena
   * impostato non le appartiene: la sessione esiste e non viene mandata, quindi
   * si finisce sul login dopo essere entrati. Un `Location` relativo resta
   * sull'origine da cui il visitatore e' arrivato, qualunque sia.
   */
  const risposta = new NextResponse(null, { status: 303, headers: { location: percorso } });
  for (const cookie of accesso.headers.getSetCookie()) {
    risposta.headers.append("set-cookie", cookie);
  }
  return risposta;
}
