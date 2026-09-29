import { AUTORI } from "@/lib/autori";
import { dataModifica, guidePubblicate } from "@/lib/guide";
import { indirizzo, NOME } from "@/lib/indirizzo";

/** Il feed RSS delle guide: statico, rigenerato a ogni build. */
export const dynamic = "force-static";

const xml = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const rfc822 = (iso: string) => new Date(`${iso}T06:00:00Z`).toUTCString();

export function GET() {
  const guide = guidePubblicate();
  const voci = guide
    .map((g) => {
      const url = indirizzo(`/guide/${g.slug}`);
      return `    <item>
      <title>${xml(g.titolo)}</title>
      <link>${url}</link>
      <guid isPermaLink="true">${url}</guid>
      <description>${xml(g.descrizione)}</description>
      <pubDate>${rfc822(g.data)}</pubDate>
      <dc:creator>${xml(AUTORI[g.autore].nome)}</dc:creator>
    </item>`;
    })
    .join("\n");
  const ultimo = guide.length > 0 ? rfc822(guide.map(dataModifica).sort().at(-1)!) : null;
  const corpo = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:dc="http://purl.org/dc/elements/1.1/">
  <channel>
    <title>${NOME} · Guide</title>
    <link>${indirizzo("/guide")}</link>
    <atom:link href="${indirizzo("/guide/feed.xml")}" rel="self" type="application/rss+xml"/>
    <description>Guide per commercialisti su indicatori di bilancio e Codice della crisi.</description>
    <language>it-IT</language>${ultimo ? `\n    <lastBuildDate>${ultimo}</lastBuildDate>` : ""}
${voci}
  </channel>
</rss>
`;
  return new Response(corpo, {
    headers: { "Content-Type": "application/rss+xml; charset=utf-8" },
  });
}
