import type { Metadata } from "next";
import Link from "next/link";

import { PaginaTesto } from "@/components/pagina-testo";
import { URL_DEMO_PUBBLICA } from "@/lib/configurazione";
import { dataEstesa, REVISIONI } from "@/lib/revisioni";

export const metadata: Metadata = {
  title: "Cookie e memoria del browser",
  description:
    "Questo sito non usa cookie né analitiche. La demo usa due cookie tecnici e tre preferenze locali: qui sono elencati uno per uno.",
  alternates: { canonical: "/cookie" },
};

/**
 * Cookie policy scritta sul comportamento REALE, non copiata da un generatore.
 *
 * Il contenuto è corto perché la verità è corta: la vetrina non imposta niente
 * e non contatta nessuno. Per scriverla è stato contato nel codice cosa finisce
 * nel browser — due cookie di sessione e tre preferenze, tutti nella demo,
 * nessuno qui.
 *
 * Nessun banner, e la pagina spiega perché: il consenso riguarda i cookie non
 * necessari, e non ne esiste nessuno. Un banner che chiede il permesso per
 * qualcosa che non si fa è un adempimento finto.
 *
 * ELENCO E NON TABELLA, di proposito: una tabella a quattro colonne su uno
 * schermo da 375 px fa scorrere la pagina in orizzontale, e il test delle
 * pagine legali lo vieta.
 *
 * Se un giorno entra un'analitica o un servizio di terzi, questa pagina diventa
 * FALSA: va cambiata prima, non dopo.
 */
export default function Cookie() {
  return (
    <PaginaTesto titolo="Cookie e memoria del browser" aggiornamento={dataEstesa(REVISIONI.cookie)}>
      <p>
        Questo sito non usa cookie. Non è una formula: non ne imposta nessuno, non usa analitiche e
        non carica niente da server di altri — i caratteri tipografici sono ospitati qui, le
        immagini sono qui, non c&apos;è nessun riquadro incorporato. Non abbiamo modo di sapere chi
        sei, né di seguirti da una pagina all&apos;altra.
      </p>

      <h2>Perché non vedi un banner</h2>
      <p>
        Il consenso serve per i cookie <em>non necessari</em>: quelli che profilano e quelli che
        appartengono a terzi. Non ne usiamo nessuno, quindi non c&apos;è niente da consentire. Un
        banner che chiede il permesso per qualcosa che non facciamo sarebbe un adempimento finto, e
        abituerebbe a cliccare «accetto» senza leggere.
      </p>

      <h2>La demo, che è un&apos;altra cosa</h2>
      <p>
        {URL_DEMO_PUBBLICA ? "Se entri nella demo" : "Chi entra nella demo"}, quella è
        un&apos;applicazione: per farti restare dentro deve ricordare qualcosa. Ecco tutto, uno per
        uno.
      </p>
      <ul>
        <li>
          <code>__Secure-better-auth.session_token</code> — cookie, otto ore. Ti tiene dentro:
          senza, a ogni pagina dovresti rientrare.
        </li>
        <li>
          <code>__Secure-better-auth.session_data</code> — cookie, cinque minuti. Una copia della
          sessione, per non interrogare il database a ogni pagina.
        </li>
        <li>
          <code>theme</code> — memoria locale. Il tema chiaro o scuro che hai scelto.
        </li>
        <li>
          <code>sidebar-ridotta</code> — memoria locale. Se hai stretto la barra laterale.
        </li>
        <li>
          <code>finbeacon:tour:…</code> — memoria locale. Quali passi della guida hai già visto, per
          non riproporteli.
        </li>
      </ul>
      <p>
        Sono tutti tecnici, o preferenze che hai provocato tu entrando. Nessuno serve a profilare,
        nessuno viene condiviso con altri, nessuno esce dal tuo browser tranne i due cookie di
        sessione, che tornano a noi perché servono a riconoscere la tua sessione e a
        nient&apos;altro.
      </p>

      <h2>Come li togli</h2>
      <p>
        I due cookie scadono da sé: dopo otto ore la sessione della demo finisce. Le tre preferenze
        restano nel tuo browser finché non le cancelli, e si cancellano dalle impostazioni del
        browser alla voce dei dati dei siti, scegliendo <code>demo.finbeacon.eu</code>. Cancellarle
        non rompe niente: la demo riparte col tema predefinito e la guida ricomincia.
      </p>

      <h2>Se un giorno cambia</h2>
      <p>
        Se aggiungeremo un&apos;analitica o un servizio di terzi, questa pagina cambierà{" "}
        <strong>prima</strong> — e in quel caso vedrai una richiesta di consenso, perché allora
        servirà davvero.
      </p>

      <p>
        Per i dati che ci mandi con il modulo, e per i tuoi diritti, c&apos;è{" "}
        <Link href="/privacy">l&apos;informativa sulla privacy</Link>.
      </p>
    </PaginaTesto>
  );
}
