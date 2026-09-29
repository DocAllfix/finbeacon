import { readFile } from "node:fs/promises";
import { join } from "node:path";

/**
 * Il necessario per comporre le immagini di anteprima (home e guide) con il
 * renderer di `next/og` (Satori), che non legge `oklch`, le variabili CSS né i
 * `woff2`. Colori in esadecimale, convertiti dai token di DESIGN.md e
 * verificati; font TrueType, gli stessi del report.
 */
export const COLORI = {
  carta: "#f8fafd",
  inchiostro: "#161b20",
  attenuato: "#50565c",
  filetto: "#e3e8ee",
  ottanio: "#00717f",
  notte: "#0b1015",
  superficieNotte: "#151a20",
  inchiostroChiaro: "#ebeff2",
  attenuatoNotte: "#a5acb2",
  bordoNotte: "#2d343b",
  ottanioLuce: "#47c5d2",
  criticoTesto: "#ffa199",
  criticoFondo: "#481b19",
  criticoSegno: "#fa6863",
};

/** Il simbolo del marchio, su una griglia 64×64. */
export const SIMBOLO =
  "M16 4H48A12 12 0 0 1 50.39 4.24L24.32 37.61A6.2 6.2 0 1 0 25.87 39.4L60 19.69V48A12 12 0 0 1 48 60H16A12 12 0 0 1 4 48V16A12 12 0 0 1 16 4Z";

export function svgDati(svg: string): string {
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
}

export function simboloSvg(colore = COLORI.ottanio): string {
  return svgDati(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64"><path fill="${colore}" fill-rule="evenodd" d="${SIMBOLO}"/></svg>`,
  );
}

async function font(nome: string) {
  return readFile(join(process.cwd(), "src/assets/fonts", nome));
}

/** I tre tagli usati dalle anteprime, pronti per l'opzione `fonts` di ImageResponse. */
export async function fontAnteprima() {
  const [sans, sansForte, mono] = await Promise.all([
    font("IBMPlexSans-Regular.ttf"),
    font("IBMPlexSans-SemiBold.ttf"),
    font("IBMPlexMono-SemiBold.ttf"),
  ]);
  return [
    { name: "Plex", data: sans, weight: 400 as const, style: "normal" as const },
    { name: "Plex", data: sansForte, weight: 600 as const, style: "normal" as const },
    { name: "PlexMono", data: mono, weight: 600 as const, style: "normal" as const },
  ];
}
