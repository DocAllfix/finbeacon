import type { Metadata } from "next";
import Link from "next/link";

import { PaginaTesto } from "@/components/pagina-testo";
import { CONSERVAZIONE_RICHIESTE, TITOLARE } from "@/lib/configurazione";
import { dataEstesa, REVISIONI } from "@/lib/revisioni";

export const metadata: Metadata = {
  title: "Informativa sulla privacy",
  description: "Come FinBeacon tratta i dati inviati con il modulo di richiesta demo.",
  alternates: { canonical: "/privacy" },
};

/**
 * BOZZA da far rivedere al titolare prima del lancio. L'unico dato che solo lui
 * può fornire è il contatto: finché manca, la pagina lo segnala e
 * `scripts/verifica-lancio.mjs` blocca il build di produzione.
 */
export default function Privacy() {
  const titolare = TITOLARE;
  return (
    <PaginaTesto titolo="Informativa sulla privacy" aggiornamento={dataEstesa(REVISIONI.privacy)}>
      <p>
        Questa informativa riguarda i dati che invii con il modulo «Richiedi una demo» di questo
        sito, ai sensi dell&apos;art. 13 del Regolamento (UE) 2016/679.
      </p>

      <h2>Titolare del trattamento</h2>
      {titolare ? (
        <p>
          {titolare.nome ? `${titolare.nome}, titolare di FinBeacon.` : "Il titolare di FinBeacon."}{" "}
          Per qualunque richiesta sui tuoi dati puoi scrivere a{" "}
          <a href={`mailto:${titolare.emailPrivacy}`}>{titolare.emailPrivacy}</a>.
        </p>
      ) : (
        <p className="da-completare">
          Contatto del titolare da completare prima della pubblicazione.
        </p>
      )}

      <h2>Quali dati trattiamo</h2>
      <p>
        Quelli che scrivi nel modulo: nome e cognome, studio, indirizzo email e, se li indichi,
        telefono, numero indicativo di clienti seguiti e messaggio. Il sito non usa cookie di
        profilazione né di terze parti, e non ti chiede alcun consenso a riceverne: cosa finisce nel
        tuo browser è elencato nella <Link href="/cookie">pagina sui cookie</Link>.
      </p>

      <h2>Indirizzi IP e registri tecnici</h2>
      <p>
        Oltre a quello che scrivi, un indirizzo IP passa comunque: succede ogni volta che un browser
        chiede una pagina. Chi ospita il sito tiene registri tecnici degli accessi, come qualunque
        servizio di questo tipo, per sicurezza e diagnosi. E quando invii il modulo il tuo indirizzo
        resta per pochi minuti nella memoria del nostro programma, per accorgersi di chi tenta molti
        invii di fila. La base giuridica è il legittimo interesse a tenere in piedi un sito che
        funziona (art. 6, par. 1, lett. f). Non lo usiamo per identificarti, non lo incrociamo con i
        dati del modulo e non lo conserviamo.
      </p>

      <h2>Perché, e su quale base</h2>
      <p>
        Per rispondere alla tua richiesta e organizzare la demo o l&apos;appuntamento che hai
        chiesto. La base giuridica è l&apos;esecuzione di misure precontrattuali adottate su tua
        richiesta (art. 6, par. 1, lett. b del Regolamento). Non usiamo questi dati per inviarti
        comunicazioni commerciali.
      </p>

      <h2>Chi li tratta</h2>
      <p>
        Le persone del titolare che si occupano della tua richiesta, e tre fornitori tecnici,
        nominati responsabili del trattamento. Li elenchiamo per nome, perché «fornitori terzi» non
        ti permette di sapere dove finiscono i tuoi dati:
      </p>
      <ul>
        <li>
          <strong>Vercel</strong> — ospita questo sito e la demo. Le pagine sono servite
          dall&apos;Europa.
        </li>
        <li>
          <strong>Hostinger</strong> — recapita la posta elettronica con cui riceviamo la tua
          richiesta, e gestisce i nomi di dominio.
        </li>
        <li>
          <strong>Supabase</strong> — il database della demo, in Germania. Non contiene dati tuoi:
          dentro la demo ci sono soltanto due aziende inventate.
        </li>
      </ul>

      <h2>Se i dati escono dall&apos;Unione europea</h2>
      <p>
        Vercel e Supabase sono società statunitensi, anche se i dati restano su server europei: una
        parte dell&apos;assistenza tecnica può quindi avvenire dagli Stati Uniti. Il trasferimento è
        retto dalle clausole contrattuali standard approvate dalla Commissione europea, previste
        dall&apos;art. 46 del Regolamento. Hostinger è invece un fornitore europeo.
      </p>

      <h2>La demo</h2>
      <p>
        Nella demo pubblica non ci sono dati di nessuno: i due studi che vedi, le cifre e i nomi
        sono inventati, e nessuno può modificarli. È un solo spazio condiviso da tutti i visitatori,
        in sola lettura. Per farti restare dentro, la demo usa due cookie tecnici e tiene nel tuo
        browser tre preferenze — quali, e per quanto, è scritto nella{" "}
        <Link href="/cookie">pagina sui cookie</Link>. Non chiediamo un account e non sappiamo chi
        sei.
      </p>

      <h2>Per quanto tempo</h2>
      <p>{CONSERVAZIONE_RICHIESTE}</p>

      <h2>I tuoi diritti</h2>
      <p>
        Puoi chiedere l&apos;accesso ai tuoi dati, la rettifica, la cancellazione, la limitazione
        del trattamento e la portabilità, e opporti al trattamento, scrivendo all&apos;indirizzo del
        titolare. Puoi anche proporre reclamo al Garante per la protezione dei dati personali.
      </p>

      <h2>Se non ci dai i dati</h2>
      <p>
        Nome, studio ed email servono per risponderti: senza, non possiamo dar seguito alla
        richiesta. Gli altri campi sono facoltativi.
      </p>
    </PaginaTesto>
  );
}
