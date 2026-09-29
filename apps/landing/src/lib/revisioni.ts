/**
 * Date di revisione VERE delle pagine legali: si aggiornano a mano quando il
 * testo cambia. La sitemap dichiara `lastModified` solo dove la data è vera.
 */
export const REVISIONI = {
  privacy: "2026-09-29",
  noteLegali: "2026-09-24",
  cookie: "2026-09-28",
} as const;

export function dataEstesa(iso: string): string {
  return new Intl.DateTimeFormat("it-IT", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(`${iso}T12:00:00Z`));
}
