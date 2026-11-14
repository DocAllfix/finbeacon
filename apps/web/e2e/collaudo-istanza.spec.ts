import { expect, test } from "@playwright/test";

import { creaStudio } from "./aiuto";
import { creaClienteConEsercizio, idStudio } from "./dati";

/**
 * Difetti trovati nel collaudo dell'istanza dedicata (14/11/2026), fissati
 * perché non tornino. Ognuno era invisibile ai test esistenti e lampante per
 * chi usa il prodotto la prima volta.
 */

test("il filtro «In allerta» non blocca la pagina dei clienti", async ({ page, baseURL }) => {
  const request = page.context().request;
  await creaStudio(request, baseURL!, "allerta");
  const org = await idStudio(request);
  await creaClienteConEsercizio(org, "Cliente in portafoglio Spa");

  await page.goto("/app/clienti");
  const filtri = page.getByRole("group", { name: "Filtra il portafoglio" });
  // Prima della correzione il clic non tornava mai: un array nuovo a ogni
  // render come `data` della tabella la faceva ridisegnare all'infinito.
  await filtri.getByRole("button", { name: /In allerta/ }).click({ timeout: 5_000 });
  await expect(filtri.getByRole("button", { name: /In allerta/ })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await filtri.getByRole("button", { name: /Attivi/ }).click({ timeout: 5_000 });
  await expect(page.getByRole("link", { name: "Cliente in portafoglio Spa" })).toBeVisible();
});

test("la ricerca rapida porta a tutte le sezioni, Scadenze e Avvisi compresi", async ({
  page,
  baseURL,
}) => {
  await creaStudio(page.context().request, baseURL!, "ricerca");
  await page.goto("/app");
  await page.keyboard.press("Control+k");
  const campo = page.getByPlaceholder("Cerca un cliente o una sezione…");
  await campo.fill("scadenze");
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\/app\/scadenze$/);

  await page.keyboard.press("Control+k");
  await campo.fill("avvisi");
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\/app\/avvisi$/);
});

test("un link di reimpostazione non valido risponde in italiano", async ({ page }) => {
  await page.goto("/reimposta-password?token=non-valido");
  await page.getByLabel("Nuova password").fill("UnaPasswordLunga-123");
  await page.getByLabel("Conferma password").fill("UnaPasswordLunga-123");
  await page.getByRole("button", { name: /Salva la nuova password/ }).click();
  await expect(page.getByText(/link non è più valido/)).toBeVisible();
  await expect(page.getByText(/Invalid token/i)).toHaveCount(0);
});
