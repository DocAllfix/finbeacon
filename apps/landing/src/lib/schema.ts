import { AUTORI } from "./autori";
import { IDENTIFICAZIONE, PROFILI_ESTERNI } from "./configurazione";
import { DOMANDE, FUNZIONI, HERO } from "./contenuti";
import { ARGOMENTI, dataModifica, type Guida } from "./guide";
import { indirizzo, NOME, SITO } from "./indirizzo";

/**
 * I dati strutturati della home. Scelte, con il motivo:
 *
 * - `SoftwareApplication` SENZA `offers`: la landing non mostra prezzi, e
 *   inventarne uno per ottenere lo snippet sarebbe falso. Senza `offers` niente
 *   risultato arricchito, ma lo schema resta valido e dice ai motori cos'è.
 * - Niente `Product`: senza offerte, recensioni o valutazioni genera avvisi.
 * - `FAQPage` dallo STESSO array della sezione in pagina: non possono divergere.
 *   Google oggi mostra quasi solo ai siti istituzionali lo snippet FAQ; serve ai
 *   motori e ai modelli linguistici, non a uno snippet.
 */
export function schemaHome(): Record<string, unknown> {
  /*
   * L'identificazione dell'impresa finisce anche qui, non solo nel piede e
   * nelle note legali: e' la stessa informazione detta ai motori nella forma
   * che capiscono. Le voci assenti NON si scrivono — un campo vuoto in un dato
   * strutturato e' peggio di un campo mancante, perche' dichiara di sapere e
   * non dice niente.
   */
  const organizzazione = {
    "@type": "Organization",
    "@id": `${SITO}/#organizzazione`,
    name: NOME,
    url: SITO,
    logo: indirizzo("/icon-512.png"),
    ...(IDENTIFICAZIONE.nome ? { founder: IDENTIFICAZIONE.nome } : {}),
    ...(IDENTIFICAZIONE.partitaIva ? { vatID: IDENTIFICAZIONE.partitaIva } : {}),
    ...(IDENTIFICAZIONE.codiceFiscale ? { taxID: IDENTIFICAZIONE.codiceFiscale } : {}),
    ...(IDENTIFICAZIONE.telefono ? { telephone: IDENTIFICAZIONE.telefono } : {}),
    ...(IDENTIFICAZIONE.email ? { email: IDENTIFICAZIONE.email } : {}),
    ...(PROFILI_ESTERNI.length > 0 ? { sameAs: PROFILI_ESTERNI } : {}),
    ...(IDENTIFICAZIONE.indirizzo
      ? {
          address: {
            "@type": "PostalAddress",
            streetAddress: IDENTIFICAZIONE.indirizzo,
            addressCountry: "IT",
          },
        }
      : {}),
  };
  return {
    "@context": "https://schema.org",
    "@graph": [
      organizzazione,
      {
        "@type": "WebSite",
        "@id": `${SITO}/#sito`,
        name: NOME,
        url: SITO,
        inLanguage: "it-IT",
        publisher: { "@id": organizzazione["@id"] },
      },
      {
        "@type": "SoftwareApplication",
        name: NOME,
        url: SITO,
        applicationCategory: "BusinessApplication",
        applicationSubCategory: "Analisi di bilancio e allerta crisi",
        operatingSystem: "Web",
        inLanguage: "it-IT",
        description: `${HERO.titolo} ${HERO.sottotitolo}`,
        featureList: FUNZIONI.map((f) => f.titolo),
        audience: { "@type": "BusinessAudience", audienceType: "Studi commercialisti" },
        provider: { "@id": organizzazione["@id"] },
      },
      {
        "@type": "FAQPage",
        mainEntity: DOMANDE.map((d) => ({
          "@type": "Question",
          name: d.domanda,
          acceptedAnswer: { "@type": "Answer", text: d.risposta },
        })),
      },
    ],
  };
}

/**
 * Una guida: `BlogPosting` con l'autore come PERSONA (su temi di legge e
 * finanza Google pesa chi scrive) e l'editore che rimanda all'Organization
 * della home per `@id`, così i motori capiscono che è la stessa entità invece
 * di vederne due. Le fonti vanno in `citation`: dicono da dove viene quello
 * che l'articolo afferma.
 */
export function schemaGuida(g: Guida): Record<string, unknown> {
  const url = indirizzo(`/guide/${g.slug}`);
  const autore = AUTORI[g.autore];
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "BlogPosting",
        "@id": `${url}#guida`,
        mainEntityOfPage: url,
        headline: g.titolo,
        description: g.descrizione,
        inLanguage: "it-IT",
        datePublished: g.data,
        dateModified: dataModifica(g),
        author: { "@type": "Person", name: autore.nome, jobTitle: autore.ruolo },
        publisher: { "@id": `${SITO}/#organizzazione` },
        image: indirizzo(`/guide/${g.slug}/opengraph-image`),
        keywords: g.parolaChiave,
        articleSection: ARGOMENTI[g.argomento],
        citation: g.fonti.map((f) => ({ "@type": "CreativeWork", name: f.titolo, url: f.url })),
      },
      // Lo stesso nodo della home, ridotto: un `@id` che rimanda a un'altra
      // pagina non è detto che i motori lo risolvano, un nodo nel grafo sì.
      {
        "@type": "Organization",
        "@id": `${SITO}/#organizzazione`,
        name: NOME,
        url: SITO,
        logo: indirizzo("/icon-512.png"),
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: NOME, item: SITO },
          { "@type": "ListItem", position: 2, name: "Guide", item: indirizzo("/guide") },
          { "@type": "ListItem", position: 3, name: g.titolo, item: url },
        ],
      },
    ],
  };
}
