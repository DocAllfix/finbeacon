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
un passo non si può fare bene (una fonte non si apre, un dato non si verifica), **non aprire la
PR**: scrivi nel resoconto finale cosa è mancato. Nessuna uscita è meglio di un'uscita sbagliata
firmata da una persona vera.

## 1. Scegli cosa scrivere

1. Leggi `apps/landing/content/piano-editoriale.yml`.
2. Conta le guide pubblicate (`apps/landing/content/guide/*.mdx` senza `bozza: true`). Se il
   numero di uscite dall'ultimo aggiornamento è 3 o più e esiste una guida con più di 90 giorni
   dall'ultima revisione, questa volta **aggiorni** quella (vai al passo 6).
3. Altrimenti prendi la voce `stato: da-fare` con `priorita` più alta (1 = massima); a pari
   priorità, quella che ha già guide collegate pubblicate (i gruppi di guide collegate valgono
   più delle pagine isolate).
4. Controlla che non esista già una guida con la stessa `parolaChiave` o su un tema quasi
   uguale. Se esiste, trasforma il lavoro in un aggiornamento.

## 2. Ricerca

1. **Cosa cercano davvero**: esegui `node apps/landing/scripts/suggerimenti.mjs "<query
principale>"` e usa le query restituite per le domande da coprire (titoli `##`).
2. **Cosa c'è già**: leggi le prime 5 pagine dei risultati per la query principale. Annota cosa
   manca o è sbagliato: la guida deve dire qualcosa in più o in modo più preciso, non riassumerle.
3. **Fonti primarie**: apri e leggi davvero il testo (Normattiva, CNDCEC, Gazzetta Ufficiale).
   Per ogni affermazione normativa annota articolo, comma e, per i documenti CNDCEC, la pagina.
   Se una fonte non si apre, quella affermazione non entra nella guida.

## 3. Scrivi

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
   `<EsempioDscr />`, `<Nota>…</Nota>` (una per guida al massimo). Mai un valore calcolato
   digitato a mano.
4. **Tabelle** per i confronti (soglie, differenze fra indicatori), **elenchi numerati** per le
   procedure.
5. **Collegamenti**: almeno uno interno (altra guida, `/#metodo`, `/#anteprima`), e ogni norma
   citata linkata alla fonte primaria nel testo o nell'elenco delle fonti.
6. **Chiusura operativa**: cosa verificare e in che ordine.

Stile: `REDAZIONE.md`, sezione «La voce». Rileggi ogni frase che contiene «fondamentale»,
«cruciale», «è importante notare», «in conclusione»: quasi sempre va tolta.

## 4. Rileggi come un revisore che vuole trovare l'errore

Rispondi per iscritto, nel corpo della PR, a ciascuna domanda:

- Ogni affermazione normativa ha articolo/comma o pagina, e la fonte l'ho **letta**?
- Ho attribuito al CNDCEC o alla legge qualcosa che la fonte non dice? (In particolare le soglie.)
- C'è un numero calcolato scritto a mano invece che da un componente?
- C'è un dato reale, un nome di cliente, un caso vero?
- C'è una promessa (vedi le parole vietate in `REDAZIONE.md`)?
- La prima frase risponde alla query principale?
- Un commercialista esperto imparerebbe qualcosa che le prime 5 pagine dei risultati non dicono?

Se una risposta è quella sbagliata, correggi; se non si può correggere, non aprire la PR.

## 5. Verifica tecnica e PR

Dalla radice del repo:

```bash
pnpm --filter landing exec vitest run
pnpm --filter landing build
pnpm --filter landing verifica:statica
node apps/landing/scripts/verifica-guide.mjs
```

Tutto verde, poi:

1. aggiorna la voce in `piano-editoriale.yml`: `stato: in-pr`, `slug`, `data`;
2. ramo `articolo/<slug>`, un commit con messaggio `guida: <titolo>`;
3. PR verso `main` con **etichetta `articolo`**. Corpo: query principale e secondarie; perché
   questo tema adesso; fonti primarie con articolo/pagina; le risposte del passo 4; e la riga
   «Si pubblica da sola il <data + 2 giorni> se nessuno aggiunge l'etichetta `fermo`.»

La PR può toccare **solo** `apps/landing/content/**` e `apps/landing/public/guide/**`: un
controllo della CI la blocca se tocca altro. Se per scrivere la guida serve un componente o una
modifica al codice, non farla: annotala nel corpo della PR come richiesta.

## 6. Aggiornare una guida esistente

Riapri le fonti (norme cambiate? correttivi?), aggiorna testo ed esempi, imposta
`aggiornato: <oggi>` e aggiungi in testa al corpo una riga: «Aggiornata il <data>: <cosa è
cambiato>.» Stessa verifica e stessa PR, titolo `guida (aggiornamento): <titolo>`.
