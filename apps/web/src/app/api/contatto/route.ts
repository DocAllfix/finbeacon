import { NextResponse } from "next/server";
import { z } from "zod";

import { requireStudio } from "@/lib/auth-helpers";
import { inviaSubito, smtpConfigurato } from "@/lib/email/mailer";

/**
 * «Ti interessa? Scrivici» dalla demo.
 *
 * SPEDISCE SUBITO, e non accoda. L'app normalmente mette le email in
 * `mail_outbox` e le spedisce un worker separato, perche' un relay lento non
 * deve far fallire un login. Qui vale il contrario: l'invio e' DELIBERATO e la
 * persona sta guardando l'esito, quindi attendere il relay e' corretto — e
 * dirle «inviata» quando non e' partito niente sarebbe una bugia. In piu', sul
 * runtime che ospita la demo quel worker non gira affatto: la coda si
 * riempirebbe e non partirebbe mai niente, senza un errore da nessuna parte.
 *
 * SOLO IN DEMO. Il controllo e' sul contrassegno dello studio letto dalla
 * SESSIONE, mai su un valore che arriva dal client: su un'istanza di uno studio
 * vero questa rotta risponde 404 e non esiste.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Sotto questo tempo di compilazione il modulo l'ha riempito una macchina. */
const TEMPO_MINIMO_MS = 3_000;

/**
 * Freno in memoria di processo, con gli stessi limiti dichiarati in `/demo`:
 * su un runtime serverless ogni istanza ha il suo contatore e si azzera a ogni
 * avvio a freddo. E' un dosso, non un muro. Serve a impedire che un singolo
 * client in raffica usi questa rotta per inondare la casella.
 */
const FINESTRA_MS = 10 * 60_000;
const MAX_PER_FINESTRA = 3;
const invii = new Map<string, { da: number; quanti: number }>();

function troppiInvii(chiave: string): boolean {
  const ora = Date.now();
  const v = invii.get(chiave);
  if (!v || ora - v.da > FINESTRA_MS) {
    invii.set(chiave, { da: ora, quanti: 1 });
    if (invii.size > 5_000) {
      for (const [k, x] of invii) if (ora - x.da > FINESTRA_MS) invii.delete(k);
    }
    return false;
  }
  v.quanti += 1;
  return v.quanti > MAX_PER_FINESTRA;
}

const richiesta = z.object({
  nome: z.string().trim().min(2, "Scrivi il tuo nome.").max(120),
  email: z.string().trim().max(200).pipe(z.email("Questo indirizzo non sembra valido.")),
  messaggio: z.string().trim().max(2_000).optional().or(z.literal("")),
  /** Campo trappola: un essere umano non lo vede e non lo compila. */
  sito: z.string().optional(),
  /** Quando il modulo e' comparso, per misurare il tempo di compilazione. */
  t: z.number().optional(),
});

export async function POST(req: Request) {
  const studio = await requireStudio();

  // Su un'istanza vera questa rotta non deve nemmeno esistere.
  if (!studio.demo) {
    return new NextResponse("Non trovato.", { status: 404 });
  }

  const destinatario = process.env.DEMO_DESTINATARIO;
  if (!destinatario || !smtpConfigurato()) {
    // Meglio dirlo che fingere un invio: chi ha scritto merita di saperlo.
    return NextResponse.json(
      { stato: "inattivo", messaggio: "Il contatto dalla demo non e' ancora attivo." },
      { status: 503 },
    );
  }

  let corpo: unknown;
  try {
    corpo = await req.json();
  } catch {
    return NextResponse.json({ stato: "non-valida" }, { status: 400 });
  }

  const verifica = richiesta.safeParse(corpo);
  if (!verifica.success) {
    return NextResponse.json(
      { stato: "non-valida", errore: verifica.error.issues[0]?.message ?? "Dati non validi." },
      { status: 400 },
    );
  }
  const d = verifica.data;

  /*
   * Trappola e tempo minimo: si risponde come se fosse andata bene, per non
   * insegnare al programma che e' stato scoperto. E' la stessa scelta del
   * modulo della vetrina.
   */
  if (d.sito) return NextResponse.json({ stato: "inviata" });
  if (d.t && Date.now() - d.t < TEMPO_MINIMO_MS) return NextResponse.json({ stato: "inviata" });

  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "sconosciuto";
  if (troppiInvii(ip)) {
    return NextResponse.json(
      { stato: "troppi-invii", messaggio: "Hai gia' scritto da poco. Riprova fra qualche minuto." },
      { status: 429 },
    );
  }

  const righe = [
    `Nome: ${d.nome}`,
    `Email: ${d.email}`,
    "",
    d.messaggio || "(nessun messaggio)",
    "",
    "Inviata dalla DEMO pubblica di FinBeacon.",
  ];

  try {
    await inviaSubito({
      // Il destinatario lo decide il server, sempre. Prenderlo dalla richiesta
      // trasformerebbe questa rotta in un ponte per spedire posta a nome
      // nostro, che e' il modo piu' rapido di finire in una lista nera.
      a: destinatario,
      rispondiA: d.email,
      oggetto: `Richiesta dalla demo FinBeacon — ${d.nome}`,
      testo: righe.join("\n"),
    });
  } catch (errore) {
    // Nei log l'esito, mai i dati di chi ha scritto.
    console.error("[contatto-demo] invio fallito:", (errore as Error).message);
    return NextResponse.json({ stato: "errore" }, { status: 502 });
  }

  console.info("[contatto-demo] inviata");
  return NextResponse.json({ stato: "inviata" });
}
