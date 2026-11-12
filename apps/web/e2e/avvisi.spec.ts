import { expect, test, type Page } from "@playwright/test";

import { attendiMail, creaStudio, osservaConsole } from "./aiuto";
import { conDatabase, creaClienteConEsercizio, idStudio } from "./dati";

/**
 * Avvisi automatici: si aprono al PASSAGGIO di soglia, avvisano per email
 * senza contenuti, si leggono, si chiudono da soli quando la condizione rientra.
 * Gli avvisi di tempo li apre il servizio della posta, una volta al giorno.
 */

// Il cliente d'esempio dei test del motore (packages/engine/test/avvisi.test.ts)
const SANO = {
  valProd: 4_200_000,
  fatturato: 4_100_000,
  ro: 210_000,
  ebitda: 480_000,
  utileNetto: 60_000,
  capInvest: 3_600_000,
  patrNetto: 900_000,
  pfn: 1_900_000,
  servizioDebito: 420_000,
  flussoCassa: 470_000,
};
// Indebitamento e DSCR dell'esercizio critici
const CRITICO = {
  ...SANO,
  ebitda: 100_000,
  flussoCassa: 200_000,
  ro: -50_000,
  utileNetto: -120_000,
};

async function compila(page: Page, valori: Record<string, number>) {
  for (const [campo, v] of Object.entries(valori)) await page.locator(`#${campo}`).fill(String(v));
}

test("dal salvataggio critico all'email, alla lettura, alla chiusura", async ({
  page,
  baseURL,
}) => {
  const spia = osservaConsole(page);
  const request = page.context().request;
  const studio = await creaStudio(request, baseURL!, "avvisi");
  const org = await idStudio(request);
  const RAGIONE = "Cliente Avvisi di prova Srl";
  const clienteId = await conDatabase(async (c) => {
    const r = await c.query(
      `insert into clienti (organization_id, ragione_sociale) values ($1, $2) returning id`,
      [org, RAGIONE],
    );
    return r.rows[0].id as string;
  });

  // Nessun avviso ancora
  await page.goto("/app/avvisi");
  await expect(page.getByRole("link", { name: "Avvisi, nessuno da leggere" })).toBeVisible();
  await expect(page.getByText("Nessun avviso aperto")).toBeVisible();

  // Primo esercizio già critico: due avvisi critici
  await page.goto(`/app/clienti/${clienteId}/esercizi/nuovo`);
  await page.locator("#anno").fill("2025");
  await compila(page, CRITICO);
  await page.getByRole("button", { name: "Salva esercizio" }).click();
  await expect(page).toHaveURL(new RegExp(`/app/clienti/${clienteId}$`));

  await expect(page.getByRole("link", { name: "Avvisi, 2 da leggere, 2 critici" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "2 avvisi aperti" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Indebitamento critico" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "DSCR dell'esercizio critico" })).toBeVisible();

  // L'email arriva, e non dice né chi né quanto
  const mail = await attendiMail(request, studio.email, "avvisi critici");
  expect(mail.testo).toContain("/app/avvisi");
  expect(mail.testo).not.toContain(RAGIONE);
  expect(mail.testo).not.toMatch(/\d{1,3}(\.\d{3})+/); // nessun importo
  expect(mail.testo).not.toMatch(/DSCR|indebitamento/i);

  // Pagina Avvisi: con il cliente, e la lettura toglie il numero dalla campanella
  await page.goto("/app/avvisi");
  await expect(page.getByRole("link", { name: RAGIONE })).toHaveCount(2);
  await page.getByRole("button", { name: "Segna tutti come letti" }).click();
  await expect(page.getByRole("link", { name: "Avvisi, nessuno da leggere" })).toBeVisible();
  await expect(page.getByText("Da leggere")).toHaveCount(0);

  // Restare critici non riapre nulla; rientrare chiude
  const esercizioId = await conDatabase(async (c) => {
    const r = await c.query(`select id from esercizi where cliente_id = $1`, [clienteId]);
    return r.rows[0].id as string;
  });
  await page.goto(`/app/clienti/${clienteId}/esercizi/${esercizioId}/modifica`);
  await compila(page, SANO);
  await page.getByRole("button", { name: "Salva modifiche" }).click();
  await expect(page).toHaveURL(new RegExp(`/app/clienti/${clienteId}$`));
  await expect(page.getByRole("heading", { name: /avvis[oi] apert[oi]/ })).toHaveCount(0);

  await page.goto("/app/avvisi?stato=chiusi");
  await expect(page.getByRole("heading", { name: "Indebitamento critico" })).toBeVisible();
  await expect(page.getByText(/chiuso il/)).toHaveCount(2);

  const righe = await conDatabase(async (c) => {
    const r = await c.query(
      `select tipo, chiuso_at is not null chiuso, email_inviata_at is not null email
         from avvisi where cliente_id = $1 order by tipo`,
      [clienteId],
    );
    return r.rows;
  });
  expect(righe).toEqual([
    { tipo: "dscr-critico", chiuso: true, email: true },
    { tipo: "gi-critico", chiuso: true, email: true },
  ]);

  // Un altro studio non vede nulla
  await creaStudio(request, baseURL!, "avvisi-altro");
  await page.goto("/app/avvisi?stato=chiusi");
  await expect(page.getByText("Nessun avviso chiuso")).toBeVisible();
  spia.verifica("avvisi");
});

test("le preferenze spengono l'email dei critici", async ({ page, baseURL }) => {
  const request = page.context().request;
  const studio = await creaStudio(request, baseURL!, "avvisi-pref");
  const org = await idStudio(request);
  await page.goto("/app/impostazioni");
  const casella = page.getByRole("checkbox", { name: /Email immediata per i critici/ });
  await expect(casella).toBeChecked();
  await casella.uncheck();
  await expect(page.getByText("Preferenze degli avvisi salvate.")).toBeVisible();
  await page.reload();
  await expect(casella).not.toBeChecked();
  await expect(page.getByRole("checkbox", { name: /Riepilogo del lunedì/ })).toBeChecked();

  const clienteId = await conDatabase(async (c) => {
    const r = await c.query(
      `insert into clienti (organization_id, ragione_sociale) values ($1, 'Senza email Srl') returning id`,
      [org],
    );
    return r.rows[0].id as string;
  });
  await page.goto(`/app/clienti/${clienteId}/esercizi/nuovo`);
  await page.locator("#anno").fill("2025");
  await compila(page, CRITICO);
  await page.getByRole("button", { name: "Salva esercizio" }).click();
  await expect(page.getByRole("heading", { name: "2 avvisi aperti" })).toBeVisible();
  const accodate = await conDatabase(async (c) => {
    const r = await c.query(
      `select count(*)::int n from mail_outbox where destinatario = $1 and oggetto ilike '%critic%'`,
      [studio.email],
    );
    return r.rows[0].n as number;
  });
  expect(accodate).toBe(0);
});

test("il controllo giornaliero del servizio di posta apre il bilancio mancante", async ({
  page,
  baseURL,
}) => {
  const oraRoma = Number(
    new Intl.DateTimeFormat("en-GB", {
      timeZone: "Europe/Rome",
      hour: "numeric",
      hourCycle: "h23",
    }).format(new Date()),
  );
  test.skip(oraRoma < 7, "il controllo giornaliero parte dalle 7, ora di Roma");

  const request = page.context().request;
  await creaStudio(request, baseURL!, "avvisi-tempo");
  const org = await idStudio(request);
  const clienteId = await creaClienteConEsercizio(org, "Bilancio vecchio Srl", 2022);

  // Si libera la prenotazione di oggi: il worker, al giro dopo, rifà il controllo
  const oggi = new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Rome" }).format(new Date());
  await conDatabase((c) =>
    c.query(`delete from lavori_periodici where nome = 'avvisi-di-tempo' and giorno = $1`, [oggi]),
  );
  await expect
    .poll(
      () =>
        conDatabase(async (c) => {
          const r = await c.query(
            `select titolo from avvisi where cliente_id = $1 and tipo = 'bilancio-mancante' and chiuso_at is null`,
            [clienteId],
          );
          return r.rows[0]?.titolo ?? null;
        }),
      { timeout: 30_000 },
    )
    .toMatch(/^Manca il bilancio 20\d\d$/);

  await page.goto(`/app/clienti/${clienteId}`);
  await expect(page.getByRole("heading", { name: /^Manca il bilancio/ })).toBeVisible();
  await expect(page.getByText("Attenzione", { exact: true })).toBeVisible();
});
