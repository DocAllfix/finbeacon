import { ImageResponse } from "next/og";

import { AUTORI } from "@/lib/autori";
import { ARGOMENTI, guidaPubblicata, guidePubblicate } from "@/lib/guide";
import { COLORI as C, fontAnteprima, simboloSvg } from "@/lib/immagine";

/**
 * L'anteprima di una guida: solo tipografia, dal titolo. Nessuna foto di
 * repertorio: su LinkedIn, dove i commercialisti la vedranno, un titolo chiaro
 * si legge, una foto di una calcolatrice no.
 */
export const alt = "Guida di FinBeacon";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export function generateStaticParams() {
  return guidePubblicate().map((g) => ({ slug: g.slug }));
}

export default async function ImmagineGuida({ params }: { params: Promise<{ slug: string }> }) {
  const g = guidaPubblicata((await params).slug);
  const fonts = await fontAnteprima();
  const titolo = g?.titolo ?? "Guide di FinBeacon";
  return new ImageResponse(
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        width: "100%",
        height: "100%",
        background: C.carta,
        padding: "64px 72px",
        fontFamily: "Plex",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={simboloSvg()} width={44} height={44} alt="" />
        <span style={{ fontSize: 30, fontWeight: 600, color: C.inchiostro }}>FinBeacon</span>
        <span style={{ fontSize: 24, color: C.attenuato, marginLeft: 12 }}>
          {g ? `Guide · ${ARGOMENTI[g.argomento]}` : "Guide"}
        </span>
      </div>
      <span
        style={{
          fontSize: titolo.length > 48 ? 64 : 76,
          fontWeight: 600,
          lineHeight: 1.06,
          letterSpacing: -2,
          color: C.inchiostro,
          maxWidth: 1000,
        }}
      >
        {titolo}
      </span>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          borderTop: `2px solid ${C.filetto}`,
          paddingTop: 24,
          fontSize: 24,
          color: C.attenuato,
        }}
      >
        <span>{g ? AUTORI[g.autore].nome : ""}</span>
        <span style={{ color: C.ottanio }}>finbeacon.eu</span>
      </div>
    </div>,
    { ...size, fonts },
  );
}
