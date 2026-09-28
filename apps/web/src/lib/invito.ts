/**
 * Memoria dell'invito a contattarci dentro la demo: se il visitatore ha
 * davvero provato qualcosa, e se ha gia' chiuso l'invito.
 *
 * PERCHE' NON UN TIMER. Un invito che compare dopo trenta secondi a chiunque
 * apra la pagina e' pubblicita': la vede anche chi e' entrato per sbaglio e
 * sta gia' chiudendo. Il segnale che conta, su questo prodotto, e' l'uso del
 * SIMULATORE — chi muove le leve e guarda il punteggio cambiare ha capito a
 * cosa serve. Da li' in poi la domanda «ti interessa?» e' pertinente.
 *
 * PREFISSO `finbeacon:invito:`, NON `finbeacon:tour:`. Il menu «Rivedi la
 * guida» chiama `azzeraTuttiITour()`, che cancella OGNI chiave con il prefisso
 * dei tour: una chiave nostra la' sotto sparirebbe insieme a loro, e l'invito
 * ricomparirebbe a chi l'aveva chiuso.
 *
 * Sta nel browser e non sul database di proposito: le credenziali della demo
 * sono condivise fra tutti i visitatori, quindi sul database il primo
 * consumerebbe l'invito per tutti. E' la stessa scelta, e la stessa ragione,
 * della memoria dei tour.
 */

const PROVATO = "finbeacon:invito:provato";
const CHIUSO = "finbeacon:invito:chiuso";

/** Lettura difensiva: in incognito lo storage puo' lanciare invece di rispondere. */
function leggi(chiave: string): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(chiave) === "1";
  } catch {
    return false;
  }
}

function scrivi(chiave: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(chiave, "1");
    // Chi ascolta nella stessa scheda non riceve l'evento `storage` del
    // browser, che vale solo fra schede diverse: lo emettiamo noi.
    window.dispatchEvent(new Event("finbeacon:invito"));
  } catch {
    /* storage negato: l'invito semplicemente non comparira' */
  }
}

/** Il visitatore ha aperto il simulatore: da qui l'invito ha senso. */
export function segnaProvato(): void {
  scrivi(PROVATO);
}

/** Ha chiuso l'invito: non si ripropone. */
export function segnaChiuso(): void {
  scrivi(CHIUSO);
}

export function invitoDaMostrare(): boolean {
  return leggi(PROVATO) && !leggi(CHIUSO);
}

/**
 * Sottoscrizione per `useSyncExternalStore`: e' il modo con cui questo progetto
 * legge lo storage senza far divergere il primo disegno del server da quello
 * del client (vedi `preferenza-sidebar.ts` e `app-shell/guida.tsx`).
 */
export function ascolta(callback: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  window.addEventListener("finbeacon:invito", callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener("finbeacon:invito", callback);
    window.removeEventListener("storage", callback);
  };
}
