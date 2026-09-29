import type { MetadataRoute } from "next";

import { dataModifica, guidePubblicate } from "@/lib/guide";
import { indirizzo } from "@/lib/indirizzo";
import { REVISIONI } from "@/lib/revisioni";

/**
 * `lastModified` solo dove la data è VERA: le pagine legali hanno una data di
 * revisione dichiarata. La home no, e dichiarare la data del build a ogni
 * deploy direbbe ai motori che cambia ogni giorno anche quando non cambia.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  // Le guide entrano con la loro data VERA (ultimo aggiornamento o uscita), e
  // l'indice solo quando ne esiste almeno una: un indice vuoto è noindex.
  const guide = guidePubblicate();
  const vociGuide: MetadataRoute.Sitemap =
    guide.length === 0
      ? []
      : [
          {
            url: indirizzo("/guide"),
            lastModified: guide.map(dataModifica).sort().at(-1),
            changeFrequency: "weekly",
            priority: 0.7,
          },
          ...guide.map((g) => ({
            url: indirizzo(`/guide/${g.slug}`),
            lastModified: dataModifica(g),
            changeFrequency: "monthly" as const,
            priority: 0.6,
          })),
        ];
  return [
    { url: indirizzo("/"), changeFrequency: "monthly", priority: 1 },
    {
      url: indirizzo("/strumenti/calcolo-dscr-prospettico"),
      lastModified: REVISIONI.calcoloDscr,
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: indirizzo("/privacy"),
      lastModified: REVISIONI.privacy,
      changeFrequency: "yearly",
      priority: 0.2,
    },
    {
      url: indirizzo("/note-legali"),
      lastModified: REVISIONI.noteLegali,
      changeFrequency: "yearly",
      priority: 0.2,
    },
    {
      url: indirizzo("/cookie"),
      lastModified: REVISIONI.cookie,
      changeFrequency: "yearly",
      priority: 0.2,
    },
    ...vociGuide,
  ];
}
