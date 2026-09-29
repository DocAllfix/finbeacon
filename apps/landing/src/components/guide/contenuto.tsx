import { evaluate } from "@mdx-js/mdx";
import * as runtime from "react/jsx-runtime";
import rehypeAutolinkHeadings from "rehype-autolink-headings";
import rehypeSlug from "rehype-slug";
import remarkGfm from "remark-gfm";

import { COMPONENTI_GUIDA } from "./componenti";

/**
 * Il corpo di una guida, compilato AL BUILD nel componente server. Nessun
 * plugin di bundler: `evaluate` lavora sul testo, quindi funziona con
 * Turbopack e la pagina resta statica. Il JavaScript dell'MDX non arriva mai
 * al browser: esce HTML.
 *
 * Gli id dei titoli li mette rehype-slug (github-slugger), gli stessi che
 * `sezioniDi` in `lib/guide.ts` usa per il sommario.
 */
export async function ContenutoGuida({ corpo }: { corpo: string }) {
  const { default: Corpo } = await evaluate(corpo, {
    ...runtime,
    remarkPlugins: [remarkGfm],
    rehypePlugins: [
      rehypeSlug,
      [rehypeAutolinkHeadings, { behavior: "wrap", properties: { className: ["ancora"] } }],
    ],
  });
  return <Corpo components={COMPONENTI_GUIDA} />;
}
