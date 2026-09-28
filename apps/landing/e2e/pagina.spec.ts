import { analizza, formatNumero } from "@finbeacon/engine";
import { expect, test, type Page } from "@playwright/test";

import { BILANCIO_ESEMPIO, PREVISIONALE_ESEMPIO } from "../src/lib/esempio";
import { PORTA_HTTP, type Messaggio } from "./smtp-finto";

/**
 * Raccoglie dalla console ogni errore o avviso: violazioni CSP, mancate
 * corrispondenze di idratazione (anche minificate, «Minified React error»),
 * eccezioni. Stessa impostazione di apps/web/e2e/aiuto.ts: si raccoglie tutto,
 * perché elencare solo ciò che si prevede rende ciechi sul resto (GUASTI G-33).
 */
function osservaConsole(page: Page) {
  const problemi: string[] = [];
  page.on("console", (m) => {
    if (m.type() === "error" || m.type() === "warning") problemi.push(`[${m.type()}] ${m.text()}`);
  });
  page.on("pageerror", (e) => problemi.push(`[eccezione] ${e.message}`));
  return {
    verifica(dove: string) {
      expect(problemi, `${dove}: ${problemi.join(" | ")}`).toHaveLength(0);
    },
  };
}

async function posta(): Promise<Messaggio[]> {
  const r = await fetch(`http://127.0.0.1:${PORTA_HTTP}/`);
  return (await r.json()) as Messaggio[];
}
async function svuotaPosta() {
  await fetch(`http://127.0.0.1:${PORTA_HTTP}/`, { method: "DELETE" });
}

test("i numeri sono già nell'HTML servito, senza JavaScript", async ({ request }) => {
  // Crawler, motori generativi e anteprime dei link non eseguono JavaScript:
  // se un numero nasce dal client, leggono uno zero (il difetto dei contatori
  // di evalisdeck). Qui si legge l'HTML grezzo.
  const html = await (await request.get("/")).text();
  const a = analizza(BILANCIO_ESEMPIO, PREVISIONALE_ESEMPIO);
  expect(html).toContain("Vedi la crisi arrivare, cliente per cliente.");
  expect(html).toContain(formatNumero(a.indicatori.dscrProspettico!, 2));
  expect(html).toContain(`>${a.score}<`);
});

test("la home si idrata pulita, alle tre larghezze, senza scorrimento orizzontale", async ({
  page,
}) => {
  const spia = osservaConsole(page);
  for (const larghezza of [1440, 768, 375]) {
    await page.setViewportSize({ width: larghezza, height: 900 });
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      "Vedi la crisi arrivare, cliente per cliente.",
    );
    const largo = await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth,
    );
    expect(largo, `scorrimento orizzontale a ${larghezza}px`).toBe(false);
  }
  spia.verifica("home");
});

test("nessuna immagine raster sopra la piega: l'elemento più grande è testo", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");
  const raster = await page.locator("section[aria-labelledby=titolo-principale] img").count();
  expect(raster).toBe(0);
});

test("l'anteprima calcola con il motore vero, e torna ai valori di partenza", async ({ page }) => {
  const spia = osservaConsole(page);
  await page.goto("/#anteprima");
  const leva = page.getByRole("slider", { name: "Liquidità iniziale" });
  await leva.focus();
  // 30 passi da 1.000 € in su, da tastiera
  for (let i = 0; i < 30; i++) await page.keyboard.press("ArrowRight");

  const attesa = analizza(BILANCIO_ESEMPIO, {
    ...PREVISIONALE_ESEMPIO,
    liquiditaIniziale: PREVISIONALE_ESEMPIO.liquiditaIniziale + 30_000,
  });
  const riquadro = page.locator("#anteprima [aria-live=polite]");
  await expect(riquadro).toContainText(formatNumero(attesa.indicatori.dscrProspettico!, 2));
  await expect(riquadro).toContainText(String(attesa.score));

  await page.getByRole("button", { name: "Torna ai valori di partenza" }).click();
  const partenza = analizza(BILANCIO_ESEMPIO, PREVISIONALE_ESEMPIO);
  await expect(riquadro).toContainText(formatNumero(partenza.indicatori.dscrProspettico!, 2));
  spia.verifica("anteprima");
});

test.describe("modulo di richiesta", () => {
  test.beforeEach(svuotaPosta);

  test("una richiesta valida arriva davvero alla casella commerciale", async ({ page }) => {
    const spia = osservaConsole(page);
    await page.goto("/#richiesta");
    await page.getByLabel("Nome e cognome", { exact: true }).fill("Giulia Verdi");
    await page.getByLabel("Studio", { exact: true }).fill("Studio Verdi di prova");
    await page.getByLabel("Email", { exact: true }).fill("giulia@esempio.test");
    await page.getByLabel("Cosa ti interessa", { exact: true }).selectOption("appuntamento");
    // La trappola del tempo scarta chi invia in meno di tre secondi.
    await page.waitForTimeout(3_200);
    await page.getByRole("button", { name: "Invia la richiesta" }).click();

    await expect(page.getByText("Richiesta ricevuta.")).toBeVisible();
    const arrivati = await posta();
    expect(arrivati).toHaveLength(1);
    expect(arrivati[0]!.a.join()).toContain("commerciale@finbeacon.test");
    expect(arrivati[0]!.grezzo).toContain("Studio Verdi di prova");
    expect(arrivati[0]!.grezzo).toContain("Fissare un appuntamento");
    spia.verifica("modulo");
  });

  test("un errore di validazione non svuota il modulo", async ({ page }) => {
    await page.goto("/#richiesta");
    await page.getByLabel("Nome e cognome", { exact: true }).fill("Giulia Verdi");
    await page.getByLabel("Studio", { exact: true }).fill("Studio Verdi di prova");
    await page.getByLabel("Email", { exact: true }).fill("non-una-email");
    await page.waitForTimeout(3_200);
    await page.getByRole("button", { name: "Invia la richiesta" }).click();

    await expect(page.getByText("Questo indirizzo email non sembra valido.")).toBeVisible();
    await expect(page.getByLabel("Nome e cognome", { exact: true })).toHaveValue("Giulia Verdi");
    await expect(page.getByLabel("Studio", { exact: true })).toHaveValue("Studio Verdi di prova");
    expect(await posta()).toHaveLength(0);
  });

  test("un invio troppo rapido si scarta in silenzio", async ({ page }) => {
    await page.goto("/#richiesta");
    await page.getByLabel("Nome e cognome", { exact: true }).fill("Programma Veloce");
    await page.getByLabel("Studio", { exact: true }).fill("Nessuno");
    await page.getByLabel("Email", { exact: true }).fill("bot@esempio.test");
    await page.getByRole("button", { name: "Invia la richiesta" }).click();
    // Risponde come a un umano, per non istruire il programma, ma non spedisce.
    await expect(page.getByText("Richiesta ricevuta.")).toBeVisible();
    expect(await posta()).toHaveLength(0);
  });

  test("?motivo= preseleziona il motivo", async ({ page }) => {
    await page.goto("/?motivo=acquisto#richiesta");
    await expect(page.getByLabel("Cosa ti interessa", { exact: true })).toHaveValue("acquisto");
  });

  /*
   * Il limite per indirizzo, provato facendolo SCATTARE.
   *
   * Il campo trappola e i tre secondi fermano i programmi banali; chi tiene
   * premuto invio, prima di questo limite, riempiva la casella senza incontrare
   * niente. Un limite che non si e' mai visto rifiutare non si sa se rifiuti.
   *
   * Il test invia finche' non viene fermato, invece di contare fino a un numero
   * fisso: il contatore e' per processo e vive quanto il server, quindi gli
   * invii riusciti degli altri test hanno gia' consumato parte del credito.
   * Legare l'asserto al numero esatto lo renderebbe fragile all'ordine dei
   * test — che e' il tipo di rossore che poi si archivia come «capita».
   */
  test("troppi invii dallo stesso indirizzo vengono fermati, e lo dicono", async ({ page }) => {
    /*
     * Tempo più lungo del solito, e non è pigrizia: ogni giro deve aspettare i
     * tre secondi del tempo minimo, altrimenti verrebbe scartato da QUELLA
     * difesa e non misureremmo il limite per indirizzo.
     */
    test.setTimeout(90_000);

    const fermato = page.getByText("questa non è stata spedita", { exact: false });
    let tentativi = 0;

    for (let i = 0; i < 4; i++) {
      /*
       * URL diverso a ogni giro, e serve: navigare allo STESSO indirizzo
       * cambiando solo l'ancora non ricarica il documento. Dal secondo giro il
       * modulo sarebbe ancora sostituito dal messaggio «Richiesta ricevuta.» e
       * i campi non esisterebbero — il test aspettava un campo che non poteva
       * comparire, e falliva per timeout invece che per il limite.
       */
      await page.goto(`/?giro=${i}#richiesta`);
      await page.getByLabel("Nome e cognome", { exact: true }).fill(`Prova Limite ${i}`);
      await page.getByLabel("Studio", { exact: true }).fill("Studio del limite");
      await page.getByLabel("Email", { exact: true }).fill(`limite${i}@esempio.test`);
      await page.waitForTimeout(3_200);
      await page.getByRole("button", { name: "Invia la richiesta" }).click();
      tentativi++;
      if (await fermato.isVisible().catch(() => false)) break;
      await expect(page.getByText("Richiesta ricevuta.")).toBeVisible();
    }

    await expect(fermato, "il limite per indirizzo non ha mai fermato niente").toBeVisible();
    // Non e' un muro invalicabile, ma non deve nemmeno lasciar passare tutto.
    expect(tentativi, "il limite ha fermato al tentativo").toBeLessThanOrEqual(4);
  });
});

test("SEO: robots, sitemap, llms.txt, manifest e immagine di anteprima rispondono", async ({
  request,
}) => {
  for (const percorso of [
    "/robots.txt",
    "/sitemap.xml",
    "/llms.txt",
    "/manifest.webmanifest",
    "/opengraph-image",
  ]) {
    const r = await request.get(percorso);
    expect(r.status(), percorso).toBe(200);
  }
  const og = await request.get("/opengraph-image");
  expect(og.headers()["content-type"]).toContain("image/png");
});

test("fuori produzione la pagina non è indicizzabile, e le intestazioni di sicurezza ci sono", async ({
  request,
}) => {
  const r = await request.get("/");
  const h = r.headers();
  expect(h["x-robots-tag"]).toContain("noindex");
  expect(h["content-security-policy"]).toContain("frame-ancestors 'none'");
  expect(h["x-content-type-options"]).toBe("nosniff");
  expect(await (await request.get("/robots.txt")).text()).toContain("Disallow: /");
});

test("i dati strutturati sono JSON valido e la FAQ coincide con la pagina", async ({ page }) => {
  await page.goto("/");
  const json = await page.locator('script[type="application/ld+json"]').first().textContent();
  const dati = JSON.parse(json!) as { "@graph": { "@type": string; mainEntity?: unknown[] }[] };
  const faq = dati["@graph"].find((n) => n["@type"] === "FAQPage");
  expect(faq?.mainEntity?.length).toBe(await page.locator("#domande details").count());
});

test("il giro guidato apre una voce alla volta e mostra il pezzo di prodotto giusto", async ({
  page,
}) => {
  const spia = osservaConsole(page);
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/#cosa-fa");
  const voci = page.locator("#cosa-fa ol > li > button");
  await expect(voci.first()).toHaveAttribute("aria-expanded", "true");

  await voci.nth(3).click();
  await expect(voci.nth(3)).toHaveAttribute("aria-expanded", "true");
  await expect(voci.first()).toHaveAttribute("aria-expanded", "false");

  const dopo = analizza(BILANCIO_ESEMPIO, {
    ...PREVISIONALE_ESEMPIO,
    liquiditaIniziale: PREVISIONALE_ESEMPIO.liquiditaIniziale + 40_000,
  });
  const pannello = page.locator("#cosa-fa .pannello-giro").filter({ visible: true }).first();
  await expect(pannello).toContainText("Simulatore");
  await expect(pannello).toContainText(formatNumero(dopo.indicatori.dscrProspettico!, 2));
  spia.verifica("giro guidato");
});

/**
 * Le due pagine legali, raggiunte come le raggiunge chi le apre davvero: dal
 * collegamento sotto il modulo e da quello del piede. L'informativa dell'art. 13
 * deve essere leggibile nel momento in cui si lasciano i dati; una pagina che
 * risponde 200 ma nessuno ha mai aperto non è una pagina provata (G-28).
 */
test("privacy e note legali si aprono dai loro collegamenti, complete e pulite", async ({
  page,
}) => {
  const spia = osservaConsole(page);
  for (const larghezza of [1440, 375]) {
    await page.setViewportSize({ width: larghezza, height: 900 });

    await page.goto("/#richiesta");
    await page.getByRole("link", { name: "informativa sulla privacy" }).click();
    await expect(page).toHaveURL(/\/privacy$/);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Informativa sulla privacy");
    for (const sezione of [
      "Titolare del trattamento",
      "Quali dati trattiamo",
      "Indirizzi IP e registri tecnici",
      "Perché, e su quale base",
      "Chi li tratta",
      "Se i dati escono dall'Unione europea",
      "La demo",
      "Per quanto tempo",
      "I tuoi diritti",
      "Se non ci dai i dati",
    ]) {
      await expect(page.getByRole("heading", { level: 2, name: sezione })).toBeVisible();
    }
    // Il contatto del titolare c'è, oppure la pagina dice che manca: mai tutti e due, mai nessuno.
    const contatti = await page.locator('main a[href^="mailto:"], main .da-completare').count();
    expect(contatti, "contatto del titolare nell'informativa").toBe(1);

    /*
     * I responsabili vanno NOMINATI. «Fornitori terzi» non permette a nessuno di
     * sapere dove finiscono i suoi dati, e un refactoring che riscrive la pagina
     * in astratto non deve passare inosservato.
     */
    for (const fornitore of ["Vercel", "Hostinger", "Supabase"]) {
      await expect(page.getByRole("main"), `l'informativa non nomina ${fornitore}`).toContainText(
        fornitore,
      );
    }
    await expect(
      page.getByRole("main"),
      "manca la base del trasferimento fuori dall'Unione",
    ).toContainText(/clausole contrattuali standard/i);
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth),
      `scorrimento orizzontale su /privacy a ${larghezza}px`,
    ).toBe(false);

    await page.getByRole("contentinfo").getByRole("link", { name: "Note legali" }).click();
    await expect(page).toHaveURL(/\/note-legali$/);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Note legali");
    for (const sezione of [
      "Chi pubblica questo sito",
      "I dati mostrati in queste pagine",
      "Marchi",
    ]) {
      await expect(page.getByRole("heading", { level: 2, name: sezione })).toBeVisible();
    }
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth),
      `scorrimento orizzontale su /note-legali a ${larghezza}px`,
    ).toBe(false);

    await page.getByRole("contentinfo").getByRole("link", { name: "Cookie" }).click();
    await expect(page).toHaveURL(/\/cookie$/);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      "Cookie e memoria del browser",
    );
    for (const sezione of [
      "Perché non vedi un banner",
      "La demo, che è un'altra cosa",
      "Come li togli",
      "Se un giorno cambia",
    ]) {
      await expect(page.getByRole("heading", { level: 2, name: sezione })).toBeVisible();
    }

    /*
     * Le cinque chiavi vanno elencate una per una. Una cookie policy che dice
     * «usiamo cookie tecnici» senza nominarli non permette a nessuno di
     * verificare, ed e' proprio il genere di testo che volevamo evitare.
     *
     * Questi nomi sono gli stessi che l'applicazione scrive davvero
     * (`apps/web/src/lib/preferenza-sidebar.ts`, `lib/tour/config.ts`, i cookie
     * di Better Auth): se cambiano la', questo test diventa il promemoria che
     * qui va cambiato anche il testo.
     */
    for (const chiave of [
      "__Secure-better-auth.session_token",
      "__Secure-better-auth.session_data",
      "theme",
      "sidebar-ridotta",
      "finbeacon:tour:",
    ]) {
      await expect(
        page.getByRole("main"),
        `la pagina sui cookie non nomina ${chiave}`,
      ).toContainText(chiave);
    }

    // Una tabella qui farebbe scorrere la pagina a 375px: e' il motivo dell'elenco.
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth),
      `scorrimento orizzontale su /cookie a ${larghezza}px`,
    ).toBe(false);
  }
  spia.verifica("pagine legali");
});
