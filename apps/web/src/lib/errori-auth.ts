/**
 * Messaggi d'errore di Better Auth in italiano.
 *
 * Better Auth risponde con un `code` stabile e un `message` in inglese
 * («Invalid token», «Failed to create user»). Il messaggio grezzo non deve mai
 * arrivare a chi usa lo studio: si traduce il codice, e per un codice non
 * previsto si mostra il messaggio di riserva del punto in cui è successo.
 */
const MESSAGGI: Record<string, string> = {
  INVALID_EMAIL_OR_PASSWORD: "Email o password non corretti.",
  USER_ALREADY_EXISTS: "Esiste già un account con questa email. Accedi.",
  USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL: "Esiste già un account con questa email. Accedi.",
  FAILED_TO_CREATE_USER:
    "Non è stato possibile creare l'account: l'invito non è valido, è stato revocato o è scaduto. Chiedi allo studio un nuovo invito.",
  INVALID_TOKEN: "Il link non è più valido: è scaduto o è già stato usato. Richiedine uno nuovo.",
  PASSWORD_TOO_SHORT: "La password deve avere almeno 10 caratteri.",
  PASSWORD_TOO_LONG: "La password è troppo lunga.",
  INVALID_EMAIL: "L'indirizzo email non è valido.",
  USER_IS_ALREADY_A_MEMBER_OF_THIS_ORGANIZATION: "Questa persona fa già parte dello studio.",
  USER_IS_ALREADY_INVITED_TO_THIS_ORGANIZATION:
    "Questa persona ha già un invito in attesa: puoi copiarne il link qui sotto.",
  INVITATION_NOT_FOUND:
    "Invito non valido, revocato o scaduto. Chiedi allo studio un nuovo invito.",
  YOU_ARE_NOT_THE_RECIPIENT_OF_THE_INVITATION:
    "Questo invito è per un'altra email: accedi con l'indirizzo a cui è stato inviato.",
  YOU_ARE_NOT_ALLOWED_TO_INVITE_USERS_TO_THIS_ORGANIZATION:
    "Solo il titolare o un amministratore possono invitare.",
  YOU_ARE_NOT_ALLOWED_TO_UPDATE_THIS_ORGANIZATION:
    "Solo il titolare o un amministratore possono rinominare lo studio.",
  YOU_ARE_NOT_ALLOWED_TO_DELETE_THIS_MEMBER:
    "Solo il titolare o un amministratore possono rimuovere una persona.",
  YOU_ARE_NOT_ALLOWED_TO_CANCEL_THIS_INVITATION:
    "Solo il titolare o un amministratore possono revocare un invito.",
  ORGANIZATION_SLUG_ALREADY_TAKEN: "Esiste già uno studio con questo nome.",
};

export function messaggioErrore(
  errore: { code?: string; status?: number } | null | undefined,
  riserva: string,
): string {
  if (!errore) return riserva;
  if (errore.status === 429) return "Troppi tentativi in poco tempo. Attendi un minuto e riprova.";
  return (errore.code && MESSAGGI[errore.code]) || riserva;
}
