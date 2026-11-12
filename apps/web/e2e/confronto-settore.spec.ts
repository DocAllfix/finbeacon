import { expect, test } from "@playwright/test";

import { creaStudio, osservaConsole } from "./aiuto";
import { conDatabase, creaClienteConEsercizio, idStudio } from "./dati";

/**
 * Confronto di settore nell'analisi: margine EBITDA del cliente contro il MOL
 * ISTAT del suo codice ATECO e della sua classe di addetti, e la posizione nel
 * portafoglio dello studio solo da 5 clienti della stessa divisione in su.
 */

const conAteco = (clienteId: string, ateco: string | null) =>
  conDatabase((c) =>
    c.query(`update clienti set codice_ateco = $2 where id = $1`, [clienteId, ateco]),
  );

test("riferimento ISTAT dichiarato e posizione nel portafoglio da 5 clienti", async ({
  page,
  baseURL,
}) => {
  const spia = osservaConsole(page);
  const request = page.context().request;

  // Un altro studio con un cliente dello stesso settore: non deve contare
  await creaStudio(request, baseURL!, "settore-altro");
  const altroStudio = await idStudio(request);
  await conAteco(await creaClienteConEsercizio(altroStudio, "Estraneo Srl"), "25.11.00");

  await creaStudio(request, baseURL!, "settore");
  const org = await idStudio(request);
  const clienteId = await creaClienteConEsercizio(org, "Officina di prova Srl");
  await conAteco(clienteId, "25.62.00");

  const blocco = page.getByRole("region", { name: "Confronto di settore" });

  // Con 4 clienti nella divisione 25 (questo compreso): niente posizione
  for (const n of [1, 2, 3]) {
    await conAteco(await creaClienteConEsercizio(org, `Metalli ${n} Srl`), `25.${n}0.00`);
  }
  await page.goto(`/app/clienti/${clienteId}/analisi`);
  await expect(blocco).toContainText("Margine EBITDA 15,4%");
  await expect(blocco).toContainText("Settore 25.62");
  await expect(blocco).toContainText(/da 50 a 249 addetti|di ogni dimensione/);
  await expect(blocco).toContainText(/ISTAT, 20\d\d · indicativo/);
  await expect(blocco).toContainText(/meccanica/i);
  await expect(blocco).not.toContainText("Nel tuo studio");

  // Il quinto: la posizione compare, e l'estraneo dell'altro studio non è contato
  await conAteco(await creaClienteConEsercizio(org, "Metalli 4 Srl"), "25.99.00");
  await page.reload();
  await expect(blocco).toContainText("fra i 5 clienti della divisione ATECO 25");
  spia.verifica("confronto di settore");
});

test("senza ATECO, l'invito a impostarlo", async ({ page, baseURL }) => {
  const request = page.context().request;
  await creaStudio(request, baseURL!, "settore-senza");
  const org = await idStudio(request);
  const clienteId = await creaClienteConEsercizio(org, "Senza codice Srl");
  await page.goto(`/app/clienti/${clienteId}/analisi`);
  const blocco = page.getByRole("region", { name: "Confronto di settore" });
  await expect(blocco).toContainText("Il cliente non ha un codice ATECO");
  await expect(blocco.getByRole("link", { name: "portafoglio clienti" })).toHaveAttribute(
    "href",
    "/app/clienti",
  );
});
