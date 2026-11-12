import { fileURLToPath } from "node:url";

import { expect, test } from "@playwright/test";

import { creaStudio, osservaConsole } from "./aiuto";
import { conDatabase, idStudio } from "./dati";

/**
 * Import del bilancio depositato (XBRL), dal file firmato al salvataggio.
 *
 * Il file è quello che lo studio ha davvero in mano dopo il deposito: firmato
 * .p7m, qui in streaming BER (la variante più scomoda). I valori sono quelli di
 * un abbreviato vero pubblicato (Roemar 2023): la fixture è condivisa con i test
 * del motore (packages/engine/test/xbrl).
 */
const P7M = fileURLToPath(
  new URL("../../../packages/engine/test/xbrl/roemar-ber.xbrl.p7m", import.meta.url),
);

test("dal .p7m depositato all'esercizio salvato, con ATECO e voci da completare", async ({
  page,
  baseURL,
}) => {
  const spia = osservaConsole(page);
  const request = page.context().request;
  await creaStudio(request, baseURL!, "xbrl");
  const org = await idStudio(request);
  const clienteId = await conDatabase(async (c) => {
    const r = await c.query(
      `insert into clienti (organization_id, ragione_sociale) values ($1, $2) returning id`,
      [org, "Roemar di prova Srl"],
    );
    return r.rows[0].id as string;
  });

  await page.goto(`/app/clienti/${clienteId}/esercizi/nuovo`);
  await page.getByLabel("Importa bilancio depositato (XBRL)").setInputFiles(P7M);

  const pannello = page.getByRole("region", { name: "Revisione del bilancio importato" });
  await expect(pannello).toContainText("RO. E MAR. S.R.L.");
  await expect(pannello).toContainText("ATECO 87.10.00");
  await expect(pannello).toContainText(/5\.037\.283/);
  // il servizio del debito non si stima: lo dice, con gli interessi C17 come aiuto
  await expect(pannello).toContainText("Da completare");
  await expect(pannello).toContainText(/C17\): 101\.594/);
  await expect(pannello.getByRole("button", { name: "Esercizio 2022" })).toBeVisible();

  // ATECO dal file, solo perché il cliente non ce l'ha
  await pannello.getByRole("button", { name: "Imposta ATECO 87.10.00 per il cliente" }).click();
  await expect(page.getByText("Codice ATECO 87.10.00 impostato per il cliente")).toBeVisible();

  await pannello.getByRole("button", { name: "Usa i valori del 2023" }).click();
  await expect(page.locator("#anno")).toHaveValue("2023");
  await expect(page.locator("#valProd")).toHaveValue("5037283");
  await expect(page.locator("#ebitda")).toHaveValue("625955");
  await expect(page.locator("#pfn")).toHaveValue("2028037");
  // il cursore va sulla prima voce da completare, vuota
  await expect(page.locator("#servizioDebito")).toBeFocused();
  await expect(page.locator("#servizioDebito")).toHaveValue("");

  await page.locator("#servizioDebito").fill("300000");
  await page.getByRole("button", { name: "Salva esercizio" }).click();
  await expect(page).toHaveURL(new RegExp(`/app/clienti/${clienteId}$`));

  const salvato = await conDatabase(async (c) => {
    const e = await c.query(
      `select anno, val_prod, ebitda, pfn, flusso_cassa, servizio_debito from esercizi where cliente_id = $1`,
      [clienteId],
    );
    const cl = await c.query(`select codice_ateco from clienti where id = $1`, [clienteId]);
    return { esercizi: e.rows, ateco: cl.rows[0].codice_ateco as string };
  });
  expect(salvato.ateco).toBe("87.10.00");
  expect(salvato.esercizi).toEqual([
    {
      anno: 2023,
      val_prod: "5037283.00",
      ebitda: "625955.00",
      pfn: "2028037.00",
      flusso_cassa: "214134.00",
      servizio_debito: "300000.00",
    },
  ]);
  spia.verifica("import XBRL");
});

test("un file che non è un bilancio: messaggio chiaro, nessun pannello", async ({
  page,
  baseURL,
}) => {
  const request = page.context().request;
  await creaStudio(request, baseURL!, "xbrl-no");
  const org = await idStudio(request);
  const clienteId = await conDatabase(async (c) => {
    const r = await c.query(
      `insert into clienti (organization_id, ragione_sociale) values ($1, $2) returning id`,
      [org, "Cliente qualsiasi Srl"],
    );
    return r.rows[0].id as string;
  });
  await page.goto(`/app/clienti/${clienteId}/esercizi/nuovo`);
  await page.getByLabel("Importa bilancio depositato (XBRL)").setInputFiles({
    name: "fattura.xml",
    mimeType: "application/xml",
    buffer: Buffer.from("<FatturaElettronica><Importo>10</Importo></FatturaElettronica>"),
  });
  await expect(page.getByText(/non è un'istanza XBRL|non usa la tassonomia/)).toBeVisible();
  await expect(page.getByRole("region", { name: "Revisione del bilancio importato" })).toHaveCount(
    0,
  );
});
