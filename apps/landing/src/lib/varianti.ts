/**
 * Le aperture in prova (11/10): tutte sulla composizione A, cambia il pannello. Il committente sceglie sull'anteprima di
 * Vercel con il selettore in basso; poi resta solo quella scelta e questo file
 * se ne va.
 *
 * Fuori dall'anteprima (produzione, CI, sviluppo senza flag) la pagina ne
 * rende UNA sola, la predefinita: niente selettore, niente sezioni nascoste.
 */
export const APERTURE = [
  { id: "a", nome: "Fermo" },
  { id: "h", nome: "Avviso" },
  { id: "i", nome: "Prova" },
  { id: "l", nome: "Portafoglio" },
] as const;

export type Apertura = (typeof APERTURE)[number]["id"];

export const APERTURA_PREDEFINITA: Apertura = "a";

/**
 * Le palette in prova (11/10), indipendenti dall'apertura. «0» è quella di
 * DESIGN.md; le altre sono solo sostituzioni dei ruoli in `globals.css`, sotto
 * `html[data-colore]`, e i token di DESIGN.md restano intatti.
 */
export const COLORI = [
  { id: "0", nome: "Attuale" },
  { id: "1", nome: "Dettaglio" },
  { id: "2", nome: "Grafite" },
  { id: "3", nome: "Velina" },
  { id: "4", nome: "Evidenziatore" },
] as const;

export type Colore = (typeof COLORI)[number]["id"];

export const VARIANTI_IN_PROVA =
  process.env.VERCEL_ENV === "preview" || process.env.NEXT_PUBLIC_VARIANTI === "1";
