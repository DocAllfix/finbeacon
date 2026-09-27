import { expect, test, type APIRequestContext } from "@playwright/test";

import { intestazioni, osservaConsole } from "./aiuto";
import { conDatabase, creaClienteConEsercizio, inCoda, rendiDimostrativo } from "./dati";

/**
 * La demo pubblica: si entra con un clic e non si puo' rompere niente.
 *
 * Tre cose vengono provate qui, e le ultime due contano piu' della prima:
 *
 *  1. l'ingresso senza credenziali funziona e porta dentro un cliente;
 *  2. una POST diretta alle rotte di Better Auth che modificano lo studio
 *     viene RIFIUTATA. Il pannello impostazioni disabilita quei bottoni, ma un
 *     bottone disabilitato non e' un blocco: con la demo aperta al pubblico la
 *     difesa deve stare sul server;
 *  3. il recupero password sull'indirizzo dimostrativo non spedisce niente.
 *     Quell'indirizzo e' noto a chiunque abbia guardato la demo: senza questo,
 *     bastava chiederne il ripristino per prendersi l'account.
 *
 * Le credenziali sono le stesse che `playwright.config.ts` passa al server come
 * DEMO_EMAIL e DEMO_PASSWORD: se qui si cambiano, va cambiato anche la'.
 */
const EMAIL = "demo-e2e@finbeacon.test";
const PASSWORD = "DemoPubblicaE2E-2026";

/**
 * Prepara lo studio dimostrativo: account, studio, un cliente con un esercizio,
 * e il contrassegno `demo`.
 *
 * Idempotente di proposito: cancella prima un eventuale residuo, cosi' la suite
 * si puo' rilanciare sullo stesso database senza inciampare nell'indirizzo
 * unico. E' la stessa scelta di `seed-demo.ts`.
 */
async function preparaStudioDimostrativo(
  request: APIRequestContext,
  base: string,
): Promise<string> {
  await conDatabase(async (c) => {
    await c.query(`delete from "user" where email = $1`, [EMAIL]);
  });

  const reg = await request.post("/api/auth/sign-up/email", {
    headers: intestazioni(base),
    data: { name: "Titolare Dimostrativo", email: EMAIL, password: PASSWORD },
  });
  expect(reg.ok(), `registrazione demo: ${reg.status()} ${await reg.text()}`).toBeTruthy();

  const org = await request.post("/api/auth/organization/create", {
    headers: intestazioni(base),
    data: { name: "Studio Dimostrativo E2E", slug: `demo-e2e-${Date.now().toString(36)}` },
  });
  expect(org.ok(), `creazione studio: ${org.status()}`).toBeTruthy();
  const { id: orgId } = (await org.json()) as { id: string };

  await creaClienteConEsercizio(orgId, "Vetrina Spa");
  await rendiDimostrativo(orgId);
  return orgId;
}

test("dalla landing si entra nella demo senza credenziali e si atterra su un cliente", async ({
  page,
  context,
  baseURL,
}) => {
  await preparaStudioDimostrativo(context.request, baseURL!);

  const spia = osservaConsole(page);

  /*
   * Nessun accesso prima: il contesto e' pulito e non porta cookie. E' la
   * situazione di chi arriva dalla landing, che e' l'unica che interessa
   * provare — con una sessione gia' in corso non si starebbe misurando
   * l'ingresso.
   */
  await page.goto("/demo");

  // Non sul cruscotto: dentro un cliente, come Legisboard.
  await expect(page).toHaveURL(/\/app\/clienti\/[0-9a-f-]+\/analisi/);
  await expect(page.locator("body")).toContainText(/ROS|DSCR/);

  /*
   * Il testo non basta come prova di vita: e' reso dal server e si legge anche
   * se React non si aggancia mai. Stessa sonda di `interfaccia.spec.ts`.
   */
  await page
    .waitForFunction(
      () => Object.keys(document.body).some((k) => k.startsWith("__reactFiber")),
      undefined,
      { timeout: 15_000 },
    )
    .catch(() => {
      throw new Error("la demo e' arrivata ma e' inerte: React non si e' agganciato");
    });

  // La fascia con gli inviti c'e', e porta al modulo col motivo giA' scelto.
  const appuntamento = page.getByRole("link", { name: /Fissa un appuntamento/i });
  await expect(appuntamento).toBeVisible();
  await expect(appuntamento).toHaveAttribute("href", /motivo=appuntamento/);

  spia.verifica("demo pubblica");
});

test("in demo le mutazioni dello studio sono rifiutate DAL SERVER, non solo dal bottone", async ({
  context,
  baseURL,
}) => {
  const request = context.request;
  const base = baseURL!;
  await preparaStudioDimostrativo(request, base);

  // Sessione dimostrativa vera, ottenuta come la ottiene un visitatore.
  const ingresso = await request.get("/demo");
  expect(ingresso.ok()).toBeTruthy();

  /*
   * Queste quattro chiamate sono esattamente quelle che il pannello
   * impostazioni disabilita nel browser. Qui si saltano i bottoni e si parla
   * direttamente con l'API: e' cio' che farebbe chiunque avesse voglia di
   * provarci, e prima di questo lavoro riuscivano tutte.
   */
  const tentativi: [string, Record<string, unknown>][] = [
    ["/api/auth/organization/invite-member", { email: "estraneo@example.invalid", role: "member" }],
    ["/api/auth/organization/update", { data: { name: "Studio Dirottato" } }],
  ];

  for (const [percorso, dati] of tentativi) {
    const r = await request.post(percorso, { headers: intestazioni(base), data: dati });
    expect(
      r.ok(),
      `${percorso} ha risposto ${r.status()}: in demo doveva essere rifiutata`,
    ).toBeFalsy();
    expect(r.status(), `${percorso}`).toBe(403);
  }

  // Controprova: lo studio si chiama ancora come prima.
  const nome = await conDatabase(async (c) => {
    const r = await c.query(`select name from organization where name = 'Studio Dirottato'`);
    return r.rowCount ?? 0;
  });
  expect(nome, "lo studio e' stato rinominato: il blocco non ha tenuto").toBe(0);
});

test("il recupero password non consegna l'account dimostrativo a chi lo chiede", async ({
  context,
  baseURL,
}) => {
  const request = context.request;
  const base = baseURL!;
  await preparaStudioDimostrativo(request, base);

  /*
   * Si svuota la coda PRIMA di chiedere il recupero, e senza questo il test
   * misurava la cosa sbagliata: la registrazione accoda gia' un messaggio di
   * verifica dell'indirizzo (`sendOnSignUp: true`), e `inCoda()` conta
   * QUALUNQUE messaggio non ancora spedito per quel destinatario. Il primo
   * tentativo in CI ha infatti trovato 1 — che era la verifica, non il
   * recupero. Il codice era giusto, il metro no.
   */
  await conDatabase(async (c) => {
    await c.query(`delete from mail_outbox where destinatario = $1`, [EMAIL]);
  });

  const r = await request.post("/api/auth/request-password-reset", {
    headers: intestazioni(base),
    data: { email: EMAIL, redirectTo: "/reimposta-password" },
  });

  /*
   * La risposta deve restare quella generica: se rispondessimo con un errore,
   * diremmo a chi chiede che quell'indirizzo e' speciale. Si blocca il
   * messaggio, non la risposta.
   */
  expect(r.status(), "la risposta deve essere indistinguibile da quella normale").toBe(200);
  expect(await inCoda(EMAIL), "e' stata accodata una email di recupero per la demo").toBe(0);

  /*
   * Secondo tempo, senza il quale il primo non prova niente: su un indirizzo
   * NON dimostrativo la stessa chiamata deve accodare davvero. Altrimenti
   * «zero in coda» potrebbe voler dire che il recupero e' rotto per tutti, e
   * staremmo misurando un guasto invece di una difesa (GUASTI G-32).
   */
  const altro = `controprova-${Date.now()}@finbeacon.test`;
  const reg = await request.post("/api/auth/sign-up/email", {
    headers: intestazioni(base),
    data: { name: "Controprova", email: altro, password: "Controprova-2026-Lunga" },
  });
  expect(reg.ok()).toBeTruthy();
  // Stessa pulizia, per la stessa ragione: qui si conta il recupero, non la verifica.
  await conDatabase(async (c) => {
    await c.query(`delete from mail_outbox where destinatario = $1`, [altro]);
  });
  await request.post("/api/auth/request-password-reset", {
    headers: intestazioni(base),
    data: { email: altro, redirectTo: "/reimposta-password" },
  });
  expect(
    await inCoda(altro),
    "il recupero password non accoda nulla per nessuno: metro rotto",
  ).toBeGreaterThan(0);
});
