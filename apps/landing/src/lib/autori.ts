/**
 * Chi firma le guide. Su temi fiscali e legali Google pesa chi scrive
 * (E-E-A-T), quindi qui vanno SOLO fatti veri: ruolo e biografia li fornisce il
 * titolare, non si scrivono a intuito. Una biografia gonfiata è peggio di una
 * breve.
 *
 * Il nome è già pubblico (piede, note legali, dati strutturati): non è un dato
 * nuovo esposto dal blog.
 */
export interface Autore {
  nome: string;
  ruolo: string;
  biografia: string;
}

export const AUTORI = {
  "alessandro-di-lonardo": {
    nome: "Alessandro Di Lonardo",
    ruolo: "Fondatore di FinBeacon",
    biografia:
      "Ha fondato FinBeacon, il software di analisi di bilancio e allerta crisi per gli studi commercialisti.",
  },
} as const satisfies Record<string, Autore>;

export type ChiaveAutore = keyof typeof AUTORI;
