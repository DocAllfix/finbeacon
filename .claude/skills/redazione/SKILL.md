---
name: redazione
description: >
  Scrive, verifica e propone una guida di FinBeacon (apps/landing/content/guide/*.mdx)
  scegliendo il tema dal piano editoriale, oppure aggiorna una guida esistente. Usala
  quando la routine della redazione parte, o quando qualcuno chiede «scrivi la prossima
  guida», «aggiorna una guida», «rivedi il piano editoriale».
---

# Redazione delle guide di FinBeacon

Prima di tutto leggi **`apps/landing/content/REDAZIONE.md`**: sono le regole. Questa skill è la
procedura. Se una regola e un passo della procedura sembrano in conflitto, vince la regola e ti
fermi.

Le guide si pubblicano **senza rilettura garantita** (silenzio-assenso di 48 ore sulla PR). Se
un passo non si può fare bene (una fonte non si apre, un dato non si verifica), **quella guida
non esce**: un'uscita sbagliata firmata da una persona vera è peggio di nessuna uscita.

Ma **una voce bloccata non deve fermare la settimana** (11/10: la guida pilastro sul DSCR è
rimasta ferma per settimane perché una fonte non era raggiungibile dall'ambiente). Se la voce
scelta non si può fare bene, segnala nel piano `stato: sospesa` e `motivo: "<cosa manca e cosa
la sblocca>"`, e passa alla voce successiva. Al massimo tre tentativi per giro; se falliscono
tutti, apri comunque la PR con le sole modifiche al piano (voci sospese e voci nuove) e il
motivo nel corpo: così il problema si vede, invece di sparire in un registro.

## 0. Manutenzione, prima di scrivere

1. **PR «articolo» aperte.** Elencale (`gh pr list --label articolo`). Per ciascuna con
   l'etichetta `da-riallineare` o in conflitto con `main`: porta il ramo su `main`
   (`git rebase origin/main`), risolvi i conflitti di `piano-editoriale.yml` tenendo le modifiche
   di tutte e due le parti, rilancia le verifiche del passo 6, `git push --force-with-lease`,
   togli l'etichetta. Il riallineamento fa ripartire le 48 ore: scrivilo in un commento.
2. **Stati coerenti.** Ogni voce `in-pr` la cui PR è stata unita diventa `pubblicata`; se la
   PR è stata chiusa senza unirla, torna `da-fare` con una `note` sul perché. Questa correzione
   va nella PR di oggi.
3. **Arretrato.** Se ci sono già **tre o più** PR «articolo» aperte da più di 48 ore, oggi
   non scrivere: leggi il registro di «Pubblica le guide» per capire perché non si uniscono,
   correggi ciò che è nel perimetro dei contenuti, e descrivi il resto nel resoconto finale.
   La sentinella (`cura-redazione.yml`) apre comunque una issue «redazione-ferma».

## 1. Tieni vivo il piano

Conta le voci `stato: da-fare` che **non** hanno `solo-codice: true`. Se sono **meno di sei**:

1. Prendi le ricerche vere: prima prova `node apps/landing/scripts/suggerimenti.mjs "<radice>"
--alfabeto` per ciascuna voce di `radici:`. Se l'autocompletamento non risponde (l'ambiente
   cloud lo blocca), leggi quelle raccolte la domenica da GitHub:
   `git fetch origin dati/suggerimenti && git show origin/dati/suggerimenti:suggerimenti.md`.
   Se mancano anche quelle, usa la ricerca web sulle radici e annota in `evidenze` che le query
   non vengono dall'autocompletamento.
2. Scarta il rumore: nomi propri, località, prodotti di altri, query già coperte da una guida o
   da una voce (stessa `query` o quasi, stessa `parolaChiave`), temi fuori dal prodotto.
3. Aggiungi da **4 a 6 voci** nuove, ciascuna con `id`, `titolo` di lavoro, `query`,
   `evidenze` (le query vere che la sostengono), `intento`, `argomento`, `formato`, `priorita`
   (3 di partenza; 2 se si collega a guide già pubblicate) e `stato: da-fare`. Preferisci i
   temi che allungano un gruppo esistente (crisi, indicatori, strumenti) alle pagine isolate.
4. Se dalle ricerche emerge una radice nuova e utile, aggiungila a `radici:`.
5. Quando ci saranno i dati di Search Console (o un export del Keyword Planner nel repo),
   usali per la priorità: impressioni e posizione battono l'intuito.

Le voci nuove vanno nella **stessa PR** della guida di oggi: niente PR a parte.

## 2. Scegli cosa scrivere

1. Leggi `apps/landing/content/piano-editoriale.yml`.
2. Conta le guide pubblicate (`apps/landing/content/guide/*.mdx` senza `bozza: true`). Se il
   numero di uscite dall'ultimo aggiornamento è 3 o più e esiste una guida con più di 90 giorni
   dall'ultima revisione, questa volta **aggiorni** quella (vai al passo 7).
3. Altrimenti, **prima il calendario**: tra le voci `stato: da-fare` che hanno `uscita`, prendi
   quella con l'`uscita` più vicina (anche se è già passata: un'uscita saltata si recupera per
   prima). Il calendario viene dalla keyword research del 14/10/2026 e ha già deciso ordine e
   accorpamenti: non riordinarlo.
4. Se nessuna voce del calendario è `da-fare`, prendi la voce `stato: da-fare` con `priorita`
   più alta (1 = massima); a pari priorità, quella che ha già guide collegate pubblicate (i
   gruppi di guide collegate valgono più delle pagine isolate).
5. In entrambi i casi salta le voci `solo-codice: true` e quelle `sospesa`; riprova una voce
   `sospesa` solo se il suo `motivo` dice che il blocco è stato tolto.
6. Controlla che non esista già una guida con la stessa `parolaChiave` o su un tema quasi
   uguale. Se esiste, trasforma il lavoro in un aggiornamento.

### Se la voce ha il brief (calendario)

Le voci del calendario portano già la ricerca delle parole chiave. Usala così, senza rifarla da
capo:

- `query` diventa la `parolaChiave` del frontmatter, e la prima frase della guida le risponde;
- `secondarie` sono le varianti da coprire nei titoli `##`/`###` e nel testo, con naturalezza:
  non un elenco di parole infilate;
- `domande` sono le domande vere della gente: ciascuna diventa un titolo `##` a forma di
  domanda, oppure una voce della sezione finale «Domande frequenti»;
- `link_interni` sono **obbligatori** quando la guida collegata esiste già (cerca lo slug in
  `apps/landing/content/guide/`, o il campo `slug` della voce); per quelle non ancora uscite,
  niente link: lo aggiungerà l'aggiornamento successivo;
- `cta`: `demo` chiude con l'invito alla demo, `calcolatore` con
  `/strumenti/calcolo-dscr-prospettico`;
- `dati` spiega da dove viene la priorità: riportalo nel corpo della PR.

## 3. Ricerca

1. **Cosa cercano davvero**: esegui `node apps/landing/scripts/suggerimenti.mjs "<query
principale>"` e usa le query restituite per le domande da coprire (titoli `##`).
2. **Cosa c'è già**: leggi le prime 5 pagine dei risultati per la query principale. Annota cosa
   manca o è sbagliato: la guida deve dire qualcosa in più o in modo più preciso, non riassumerle.
3. **Fonti primarie**: apri e leggi davvero il testo (Normattiva, CNDCEC, Gazzetta Ufficiale).
   Per ogni affermazione normativa annota articolo, comma e, per i documenti CNDCEC, la pagina.
   Se una fonte non si apre, quella affermazione non entra nella guida.

## 4. Scrivi

File: `apps/landing/content/guide/<slug>.mdx`, slug minuscolo-con-trattini, corto, con la query
principale (es. `dscr-prospettico-6-mesi`).

Frontmatter (validato al build, un errore ferma tutto):

```yaml
titolo: "…" # 30–65 caratteri
descrizione: "…" # 110–160 caratteri
data: AAAA-MM-GG # giorno di uscita: oggi + 2 (dopo le 48 ore)
autore: alessandro-di-lonardo
argomento: crisi # crisi | indicatori | strumenti
parolaChiave: "…" # unica fra tutte le guide
fonti:
  - titolo: "…"
    url: "https://…" # almeno due, https, primarie prima
correlati: [slug-di-un-altra-guida] # solo guide esistenti
```

Corpo, in quest'ordine:

1. **La risposta in apertura**: 2–3 frasi (40–60 parole) che rispondono alla query da sole,
   senza bisogno del resto. È il passaggio che Google e i motori generativi citano.
2. **Sezioni `##`** (almeno tre) con titoli a forma di domanda o affermazione precisa. Ogni
   sezione apre con la risposta nella prima frase; paragrafi di 2–4 frasi.
3. **Numeri solo dai componenti**: `<Formula chiave="ros|turnover|roi|roe|gi|dscr|dscr6m" />`,
   `<EsempioDscr />`, `<Nota>…</Nota>` (una per guida al massimo). Per ciò che il motore non
   calcola (EBITDA, cash flow, margini, liquidità, CCN, giorni di incasso) scrivi solo gli
   importi di partenza, inventati e tondi, e lascia il conto ai componenti:
   - `<Conto totale="EBITDA" righe={[["Valore della produzione", 4200000], ["Costi operativi", -3720000]]} />`
     somma le righe (i costi in negativo);
   - `<Rapporto nome="EBITDA margin" num={["EBITDA", 480000]} den={["Ricavi", 4200000]} formato="%" />`
     con `formato` `%`, `x` (quozienti) o `giorni` (num/den × 365).

   Un esempio d'uso è in `content/guide/esempio-di-formato.mdx`. Mai un valore calcolato
   digitato a mano, neanche nel testo: se serve citarlo, rimanda al riquadro.

4. **Tabelle** per i confronti (soglie, differenze fra indicatori), **elenchi numerati** per le
   procedure.
5. **Collegamenti**: almeno uno interno (altra guida, `/#metodo`, `/#anteprima`), e ogni norma
   citata linkata alla fonte primaria nel testo o nell'elenco delle fonti.
6. **Chiusura operativa**: cosa verificare e in che ordine.

Stile: `REDAZIONE.md`, sezione «La voce». Rileggi ogni frase che contiene «fondamentale»,
«cruciale», «è importante notare», «in conclusione»: quasi sempre va tolta.

## 5. Rileggi come un revisore che vuole trovare l'errore

Rispondi per iscritto, nel corpo della PR, a ciascuna domanda (il passo 6 rimanda qui):

- Ogni affermazione normativa ha articolo/comma o pagina, e la fonte l'ho **letta**?
- Ho attribuito al CNDCEC o alla legge qualcosa che la fonte non dice? (In particolare le soglie.)
- C'è un numero calcolato scritto a mano invece che da un componente?
- C'è un dato reale, un nome di cliente, un caso vero?
- C'è una promessa (vedi le parole vietate in `REDAZIONE.md`)?
- La prima frase risponde alla query principale?
- Un commercialista esperto imparerebbe qualcosa che le prime 5 pagine dei risultati non dicono?

Se una risposta è quella sbagliata, correggi; se non si può correggere, la guida non esce: segna la
voce `sospesa` con il `motivo` e torna al passo 2 con la voce successiva.

## 6. Verifica tecnica e PR

Dalla radice del repo:

```bash
pnpm --filter landing exec vitest run
pnpm --filter landing build
pnpm --filter landing verifica:statica
node apps/landing/scripts/verifica-guide.mjs
```

Tutto verde, poi:

1. aggiorna la voce in `piano-editoriale.yml`: `stato: in-pr`, `slug`, `data` (più le correzioni
   del passo 0 e le voci nuove del passo 1);
2. ramo `articolo/<slug>`, un commit con messaggio `guida: <titolo>`;
3. PR verso `main` con **etichetta `articolo`**. Corpo: query principale e secondarie; perché
   questo tema adesso; fonti primarie con articolo/pagina; le risposte del passo 4; e la riga
   «Si pubblica da sola il <data + 2 giorni> se nessuno aggiunge l'etichetta `fermo`.» Se hai
   aggiunto voci al piano o ne hai sospese, elencale con il perché.

La PR può toccare **solo** `apps/landing/content/**` e `apps/landing/public/guide/**`: un
controllo della CI la blocca se tocca altro. Se per scrivere la guida serve un componente o una
modifica al codice, non farla: annotala nel corpo della PR come richiesta.

## 7. Aggiornare una guida esistente

Riapri le fonti (norme cambiate? correttivi?), aggiorna testo ed esempi, imposta
`aggiornato: <oggi>` e aggiungi in testa al corpo una riga: «Aggiornata il <data>: <cosa è
cambiato>.» Stessa verifica e stessa PR, titolo `guida (aggiornamento): <titolo>`.
