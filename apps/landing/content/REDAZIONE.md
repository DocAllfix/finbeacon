# Linea editoriale delle guide di FinBeacon

Questo file vale per chiunque scriva una guida: una persona o la routine automatica. La
procedura passo per passo è in `.claude/skills/redazione/SKILL.md`; qui ci sono le regole.

Le guide escono **da sole**: la routine apre una PR, e se in 48 ore nessuno aggiunge
l'etichetta `fermo` la PR si unisce e la guida va online con la firma di una persona vera. Quindi
ogni regola qui sotto vale come se nessuno la rileggesse.

## Per chi scriviamo

Commercialisti e studi professionali italiani, esperti di bilancio. Cercano una risposta da
**riusare davanti al cliente o alla banca**: una formula, una soglia, un obbligo, un passaggio
operativo. Non vanno spiegate le basi della partita doppia; vanno date le cose precise.

## La voce

La stessa del prodotto (`PRODUCT.md`): autorevole, precisa, calma. Italiano corretto e tecnico
dove serve, frasi corte, niente gergo inglese gratuito. Mai «nel mondo di oggi», «è
fondamentale», «in conclusione possiamo dire». Si apre con la risposta, non con il contesto.

## Regole che non si discutono

1. **Ogni affermazione normativa ha la sua fonte primaria**, linkata: Normattiva per le leggi,
   il sito del CNDCEC per i documenti del Consiglio, la Gazzetta Ufficiale, la giurisprudenza
   citata per estremi. Un articolo di giornale o di un altro blog non è una fonte primaria:
   si può citare in più, mai al posto.
2. **Nessuna fonte, nessuna frase.** Se una cosa non si trova in una fonte leggibile, non si
   scrive. Meglio una guida più corta.
3. **Nessun numero calcolato scritto a mano.** Formule ed esempi passano dai componenti
   (`<Formula chiave="..." />`, `<EsempioDscr />`), che leggono il motore. Le soglie di legge si
   citano con la fonte; le soglie di FinBeacon si prendono dal motore.
4. **La soglia del DSCR prospettico a sei mesi si scrive in due parti, sempre**: il segnale che
   indica il CNDCEC (con citazione del documento e della pagina, dopo averlo letto) e il fatto che
   FinBeacon avvisa già dal valore del motore, come margine prudenziale. Mai attribuire al CNDCEC
   una soglia che il documento non contiene.
5. **Mai dati reali.** Nessun bilancio dell'archivio, nessun cliente vero, nessun numero preso da
   un caso reale anche se reso anonimo. Gli esempi usano il cliente inventato del motore.
6. **Nessuna promessa.** Vietati: «garantito», «elimina il rischio», «evita la crisi», «a norma
   di legge» detto del software, percentuali di successo. FinBeacon aiuta a vedere e documentare,
   non sostituisce il giudizio del professionista.
7. **Niente consulenza personalizzata.** Si spiega la norma e come si legge un dato; non si
   dice a un lettore cosa fare nel suo caso.
8. **Date e versioni.** Se una norma è stata modificata (correttivi), si dice quale versione si
   commenta e da quando vale. Una guida che invecchia si aggiorna: `aggiornato` nel frontmatter e
   una riga in testa che dice cosa è cambiato.

## Com'è fatta una guida

- **Titolo** (30–65 caratteri): la domanda o il tema come lo cercherebbe il commercialista.
  Niente clickbait, niente anno se non serve.
- **Descrizione** (110–160): cosa trova il lettore, detto in chiaro.
- **Apertura**: la risposta in due o tre frasi, citabile da sola (è il paragrafo che i motori
  generativi riprendono).
- **Sezioni `##`** con titoli che sono domande o affermazioni precise; almeno tre, così il
  sommario laterale compare.
- **Almeno un esempio del motore** e **almeno un collegamento interno** (un'altra guida, la
  home, lo strumento di calcolo quando esiste).
- **Chiusura operativa**: cosa verificare, in che ordine. Niente riassunti di quanto già detto.
- Lunghezza: quella che serve. Una guida pilastro 1.500–2.500 parole, una guida su un
  indicatore 800–1.500.

## Cosa si pubblica e quando

Il calendario è `content/piano-editoriale.yml`. Si prende la voce `da-fare` con priorità più
alta; un'uscita su quattro è un **aggiornamento** di una guida esistente (fonti riverificate,
esempi, correttivi normativi), non un pezzo nuovo. Due guide con la stessa `parolaChiave` non
possono esistere: il build fallisce.

## Chi firma

Alessandro Di Lonardo (`autore: alessandro-di-lonardo`). La biografia in `src/lib/autori.ts`
contiene solo fatti veri; non si aggiungono titoli, qualifiche o esperienze.
