import type { Metadata } from "next";

import { PaginaTesto } from "@/components/pagina-testo";
import { IDENTIFICAZIONE, identificazioneMancante, TITOLARE } from "@/lib/configurazione";
import { dataEstesa, REVISIONI } from "@/lib/revisioni";

export const metadata: Metadata = {
  title: "Note legali",
  description: "Chi pubblica questo sito e come contattarlo.",
  alternates: { canonical: "/note-legali" },
};

export default function NoteLegali() {
  const mancanti = identificazioneMancante();
  return (
    <PaginaTesto titolo="Note legali" aggiornamento={dataEstesa(REVISIONI.noteLegali)}>
      <h2>Chi pubblica questo sito</h2>
      {/*
       * Le voci che la legge vuole reperibili sul sito di una ditta
       * individuale: nome, domicilio o sede, posta elettronica, recapito
       * telefonico e partita IVA (artt. 2199 e 2250 c.c., art. 7 D.Lgs.
       * 70/2003, DPR 633/1972). REA solo se iscritta, codice fiscale solo se
       * il titolare lo vuole.
       */}
      <p>
        {IDENTIFICAZIONE.nome ?? "FinBeacon"}
        {IDENTIFICAZIONE.indirizzo && (
          <>
            <br />
            {IDENTIFICAZIONE.indirizzo}
          </>
        )}
        {IDENTIFICAZIONE.email && (
          <>
            <br />
            <a href={`mailto:${IDENTIFICAZIONE.email}`}>{IDENTIFICAZIONE.email}</a>
          </>
        )}
        {IDENTIFICAZIONE.telefono && (
          <>
            <br />
            <a href={`tel:${IDENTIFICAZIONE.telefono.replace(/\s+/g, "")}`}>
              {IDENTIFICAZIONE.telefono}
            </a>
          </>
        )}
        {IDENTIFICAZIONE.partitaIva && (
          <>
            <br />
            Partita IVA {IDENTIFICAZIONE.partitaIva}
          </>
        )}
        {IDENTIFICAZIONE.codiceFiscale && (
          <>
            <br />
            Codice fiscale {IDENTIFICAZIONE.codiceFiscale}
          </>
        )}
        {IDENTIFICAZIONE.rea && (
          <>
            <br />
            REA {IDENTIFICAZIONE.rea}
          </>
        )}
      </p>
      {mancanti.length > 0 && (
        <p className="da-completare">
          Da completare prima della pubblicazione: {mancanti.join(", ")}.
        </p>
      )}
      {TITOLARE && (
        <p>
          Per le richieste sui dati personali:{" "}
          <a href={`mailto:${TITOLARE.emailPrivacy}`}>{TITOLARE.emailPrivacy}</a>.
        </p>
      )}

      <h2>I dati mostrati in queste pagine</h2>
      <p>
        Lo studio, il cliente e le cifre che compaiono negli esempi sono inventati. Sono calcolati
        dal motore di FinBeacon per mostrare come lavora, e non si riferiscono a persone o imprese
        reali.
      </p>

      <h2>Marchi</h2>
      <p>FinBeacon e il suo marchio appartengono al titolare del sito.</p>
    </PaginaTesto>
  );
}
