/**
 * Prima del build di PRODUZIONE: se il modulo raccoglie dati, il contatto del
 * titolare deve esserci. Altrimenti il build si ferma.
 *
 * COS'E' CAMBIATO, E PERCHE'. La prima versione pretendeva tutti e cinque i
 * valori in produzione, quindi il sito **non poteva esistere** finche' non
 * esisteva il modulo funzionante: per due giorni ogni deploy di produzione e'
 * fallito e su finbeacon.eu e' rimasta la pagina di parcheggio di Hostinger.
 * Il cancello aveva ragione sul principio e sbagliava il confine.
 *
 * L'obbligo dell'art. 13 GDPR scatta quando si RACCOLGONO dati personali, non
 * quando si pubblica una pagina. Quindi il confine giusto e' questo:
 *
 *   modulo ATTIVO  -> serve tutto: contatto del titolare, relay, destinatario.
 *                     Un'informativa senza contatto del titolare, accanto a un
 *                     modulo che raccoglie nome ed email, e' un obbligo di
 *                     legge disatteso.
 *   modulo SPENTO  -> il sito si pubblica. Il modulo resta visibile ma non
 *                     spedisce e lo DICHIARA («l'invio e' disattivato: nessuna
 *                     richiesta e' stata spedita»), l'azione lato server esce
 *                     prima di inviare e non conserva niente. Le pagine legali
 *                     mostrano segnaposto visibili: sono incompiute e si
 *                     vedono tali, che e' diverso dal dichiarare un contatto
 *                     che non esiste.
 *
 * Quello che questo cancello NON deve mai permettere e' la combinazione
 * pericolosa: modulo che raccoglie + informativa senza titolare.
 *
 * Fuori produzione (VERCEL_ENV diverso da "production") non controlla niente.
 */
const produzione = process.env.VERCEL_ENV === "production";

if (!produzione) {
  console.log("[verifica-lancio] non è un build di produzione: controlli saltati.");
  process.exit(0);
}

const moduloAttivo = process.env.DEMO_ATTIVO === "true";

if (!moduloAttivo) {
  console.log(
    "[verifica-lancio] modulo di contatto SPENTO: build permesso.\n" +
      "  Il sito va online, il modulo non spedisce e lo dichiara, le pagine legali\n" +
      "  mostrano segnaposto. Per accendere il modulo servono, tutte insieme:\n" +
      "    LEGALE_EMAIL_PRIVACY, SMTP_HOST, SMTP_FROM, DEMO_DESTINATARIO,\n" +
      '    e DEMO_ATTIVO="true".',
  );
  process.exit(0);
}

/** Con il modulo attivo si raccolgono dati personali: qui non si transige. */
const richieste = {
  // Ragione sociale e P.IVA non richieste (decisione dell'utente, 24/09).
  // Il contatto del titolare sì: l'art. 13 GDPR lo vuole nell'informativa.
  LEGALE_EMAIL_PRIVACY: "indirizzo per le richieste privacy",
  // Anche il NOME, dal 28/09. Senza, l'informativa dice «Il titolare di
  // FinBeacon» — cioè non identifica nessuno, e un'informativa che non dice
  // CHI tratta i dati è incompleta quanto una che non dice come contattarlo.
  // Resta facoltativa fuori produzione e con il modulo spento.
  LEGALE_NOME: "nome del titolare del trattamento",
  SMTP_HOST: "relay SMTP",
  SMTP_FROM: "mittente delle richieste",
  DEMO_DESTINATARIO: "casella che riceve le richieste",
};

const mancanti = Object.entries(richieste).filter(([nome]) => !process.env[nome]);

if (mancanti.length > 0) {
  console.error(
    "[verifica-lancio] build di produzione FERMATO: il modulo è attivo e raccoglie\n" +
      "dati personali, ma manca quello che l'art. 13 GDPR pretende accanto.\n" +
      'Spegnere il modulo (DEMO_ATTIVO diverso da "true") è un\'alternativa\n' +
      "legittima; pubblicarlo senza queste voci non lo è. Mancano:",
  );
  for (const [nome, cosa] of mancanti) console.error(`  - ${nome}: ${cosa}`);
  process.exit(1);
}

console.log("[verifica-lancio] OK: modulo attivo, contatto del titolare e relay presenti.");
