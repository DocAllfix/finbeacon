/**
 * Ciò che dipende da decisioni ancora aperte o da servizi esterni. Ogni voce è
 * facoltativa: se manca, la pagina NON mostra il pulsante o il blocco che ne
 * dipende, invece di mostrare un pulsante che porta a un muro.
 */

/** Calendario per «Prenota una chiamata» (Cal.com o equivalente). Link esterno, mai incorporato. */
export const URL_PRENOTAZIONE: string | null = process.env.NEXT_PUBLIC_URL_PRENOTAZIONE || null;

/**
 * Istanza dimostrativa pubblica (lavoro della sessione che cura l'app).
 * Finché non esiste, «Entra nella demo» non compare.
 */
export const URL_DEMO_PUBBLICA: string | null = process.env.NEXT_PUBLIC_URL_DEMO || null;

/**
 * I profili di FinBeacon fuori dal sito (LinkedIn e simili), per il `sameAs`
 * dell'Organization: dicono a Google che quelle pagine e questo sito sono la
 * stessa entità. Da variabile d'ambiente, separati da virgola; solo https.
 * Nessun profilo = campo non scritto, mai un segnaposto.
 */
export const PROFILI_ESTERNI: string[] = (process.env.PROFILI_ESTERNI ?? "")
  .split(",")
  .map((u) => u.trim())
  .filter((u) => u.startsWith("https://"));

/** Indirizzo di ripiego mostrato se l'invio del modulo fallisce. */
export const EMAIL_CONTATTO: string | null = process.env.NEXT_PUBLIC_EMAIL_CONTATTO || null;

/**
 * Per quanto si conservano le richieste di demo. In assenza di una scelta del
 * titolare vale un CRITERIO (art. 13 GDPR ammette i criteri al posto di una
 * durata), non un numero inventato.
 */
export const CONSERVAZIONE_RICHIESTE: string =
  process.env.PRIVACY_CONSERVAZIONE ||
  "Per il tempo necessario a dare seguito alla richiesta. Se non ne nasce un rapporto, i dati vengono cancellati.";

/**
 * L'identificazione di chi pubblica il sito.
 *
 * SOSTITUISCE la decisione del 24/09 («ragione sociale e partita IVA non
 * richieste»), che era sbagliata. Per una ditta individuale che esercita
 * attività d'impresa la legge vuole che sul sito siano reperibili nome e
 * cognome, domicilio o sede, indirizzo di posta elettronica, un recapito
 * telefonico e la partita IVA — art. 2199 e 2250 del codice civile, art. 7 del
 * D.Lgs. 70/2003 sul commercio elettronico, DPR 633/1972. Il numero REA solo
 * se l'impresa è iscritta. La PEC non è obbligatoria.
 *
 * Il codice fiscale è FACOLTATIVO: nessuna di quelle norme lo pretende
 * espressamente, e per una persona fisica è un dato in più esposto al pubblico
 * senza che serva. Si mette solo se il titolare lo vuole.
 *
 * Tutto da variabili d'ambiente: sono dati personali del titolare e non vanno
 * nel repository, dove resterebbero nella storia anche dopo averli tolti.
 */
export type Identificazione = {
  nome: string | null;
  indirizzo: string | null;
  email: string | null;
  telefono: string | null;
  partitaIva: string | null;
  codiceFiscale: string | null;
  rea: string | null;
};

export const IDENTIFICAZIONE: Identificazione = {
  nome: process.env.LEGALE_NOME || null,
  indirizzo: process.env.LEGALE_INDIRIZZO || null,
  // L'indirizzo d'impresa è quello generale, non quello delle richieste privacy.
  email: process.env.NEXT_PUBLIC_EMAIL_CONTATTO || process.env.LEGALE_EMAIL_PRIVACY || null,
  telefono: process.env.LEGALE_TELEFONO || null,
  partitaIva: process.env.LEGALE_PIVA || null,
  codiceFiscale: process.env.LEGALE_CF || null,
  rea: process.env.LEGALE_REA || null,
};

/**
 * Le voci obbligatorie che mancano, con il nome leggibile.
 *
 * Serve in due posti che devono restare d'accordo: la pagina, che mostra un
 * segnaposto visibile invece di fingere completezza, e `verifica-lancio.mjs`,
 * che decide se il build può passare. Una sola definizione, così non divergono.
 */
export const VOCI_OBBLIGATORIE: { chiave: keyof Identificazione; nome: string }[] = [
  { chiave: "nome", nome: "nome e cognome" },
  { chiave: "indirizzo", nome: "domicilio o sede" },
  { chiave: "email", nome: "indirizzo di posta elettronica" },
  { chiave: "partitaIva", nome: "partita IVA" },
];

/*
 * Il TELEFONO non e' fra le obbligatorie, ed e' una scelta motivata.
 *
 * L'art. 7 del D.Lgs. 70/2003 chiede «gli estremi che permettono di contattare
 * rapidamente il prestatore e di comunicare direttamente ed efficacemente con
 * esso, IVI COMPRESO l'indirizzo di posta elettronica»: la posta elettronica e'
 * nominata espressamente come mezzo idoneo, il telefono no. Con un indirizzo
 * presidiato l'obbligo e' soddisfatto.
 *
 * Resta supportato: se un giorno si vuole pubblicare un numero, basta
 * valorizzare LEGALE_TELEFONO e compare ovunque. Ma non si tiene un segnaposto
 * perenne per una voce che la legge non pretende — un avviso che non si puo'
 * mai spegnere smette di essere letto.
 */

export function identificazioneMancante(dati: Identificazione = IDENTIFICAZIONE): string[] {
  return VOCI_OBBLIGATORIE.filter((v) => !dati[v.chiave]).map((v) => v.nome);
}

/**
 * Il titolare dell'informativa. L'art. 13 GDPR vuole un CONTATTO del titolare,
 * quindi l'indirizzo privacy è obbligatorio per la produzione
 * (`scripts/verifica-lancio.mjs`). Il nome è facoltativo qui, ma obbligatorio
 * quando il modulo raccoglie dati.
 */
export const TITOLARE: { nome: string | null; emailPrivacy: string } | null = process.env
  .LEGALE_EMAIL_PRIVACY
  ? { nome: process.env.LEGALE_NOME || null, emailPrivacy: process.env.LEGALE_EMAIL_PRIVACY }
  : null;
