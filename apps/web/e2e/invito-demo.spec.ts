import { expect, test, type APIRequestContext } from "@playwright/test";

import { attendiMail, creaStudio, intestazioni, MAILPIT, osservaConsole } from "./aiuto";
import { creaClienteConEsercizio, idStudio, rendiDimostrativo } from "./dati";

/**
 * L'invito a contattarci dentro la demo: quando compare, e cosa rifiuta.
 *
 * Le due cose che contano qui sono negative, e sono quelle che un test scritto
 * di fretta non proverebbe:
 *
 *  1. l'invito NON compare a chi apre la demo e non prova niente. Un invito che
 *     appare subito a tutti e' pubblicita', e il pulsante tornerebbe a essere
 *     rumore invece di una domanda pertinente;
 *  2. la rotta NON spedisce a un destinatario che arriva dalla richiesta. Se lo
 *     accettasse sarebbe un ponte per mandare posta a nome nostro, e il dominio
 *     finirebbe in una lista nera nel giro di un pomeriggio.
 */
async function studioDimostrativo(request: APIRequestContext, base: string): Promise<string> {
  await creaStudio(request, base, "invito");
  const org = await idStudio(request);
  const cliente = await creaClienteConEsercizio(org, "Invito Spa");
  await rendiDimostrativo(org);
  return cliente;
}

test("l'invito non compare a chi non ha provato niente, e compare dopo il simulatore", async ({
  page,
  context,
  baseURL,
}) => {
  const cliente = await studioDimostrativo(context.request, baseURL!);
  const spia = osservaConsole(page);

  await page.goto("/demo");
  await expect(page).toHaveURL(/\/app\/clienti\/[0-9a-f-]+\/analisi/);

  const invito = page.getByRole("button", { name: /Ti interessa\? Scrivici/i });

  /*
   * Prima del simulatore: assente. `toBeHidden` e non `not.toBeVisible`, perche'
   * il componente non rende NIENTE — e un asserto che passa anche quando
   * l'elemento non esiste affatto proverebbe meno di quanto sembra.
   */
  await expect(invito, "l'invito e' comparso a chi non ha ancora provato niente").toBeHidden();

  // La fascia c'e' comunque, coi collegamenti legali.
  await expect(page.getByRole("link", { name: "Cookie" })).toBeVisible();

  await page.goto(`/app/clienti/${cliente}/analisi`);
  await page.locator('[data-tour="simula"]').click();
  await page.locator('[data-tour="ripristina"]').waitFor({ timeout: 20_000 });

  // Da qui in poi la domanda ha senso, e l'invito compare.
  await expect(invito, "dopo il simulatore l'invito doveva comparire").toBeVisible({
    timeout: 15_000,
  });

  spia.verifica("invito demo");
});

test("la rotta del contatto non e' un ponte per spedire, e si difende", async ({
  context,
  baseURL,
}) => {
  const request = context.request;
  const base = baseURL!;
  await studioDimostrativo(request, base);
  await request.get("/demo");

  /*
   * Destinatario iniettato nella richiesta: deve essere IGNORATO.
   *
   * La prova non puo' essere «non c'e' traccia», perche' questa rotta non passa
   * dalla coda e un'assenza li' sarebbe sempre vera anche con la rotta rotta
   * (GUASTI G-32). La prova e' positiva: la mail ARRIVA, e arriva al
   * destinatario deciso dal server.
   */
  const dirottata = await request.post("/api/contatto", {
    headers: intestazioni(base),
    data: {
      nome: "Prova Dirottamento",
      email: "visitatore@esempio.test",
      messaggio: "prova",
      a: "vittima@altrove.test",
      destinatario: "vittima@altrove.test",
      t: Date.now() - 5_000,
    },
  });
  expect(dirottata.status(), await dirottata.text()).toBe(200);

  const arrivata = await attendiMail(
    request,
    "contatti-e2e@finbeacon.test",
    "Richiesta dalla demo",
  );
  expect(arrivata.testo, "il messaggio non porta l'indirizzo di chi ha scritto").toContain(
    "visitatore@esempio.test",
  );

  // E alla vittima non e' arrivato niente.
  const tutte = await request.get(`${MAILPIT}/api/v1/messages?limit=200`);
  const elenco = (await tutte.json()) as { messages?: { To: { Address: string }[] }[] };
  const allaVittima = (elenco.messages ?? []).filter((m) =>
    m.To.some((t) => t.Address.toLowerCase().endsWith("altrove.test")),
  );
  expect(allaVittima, "la rotta ha accettato un destinatario dalla richiesta").toHaveLength(0);

  // Il campo trappola: risposta identica a un successo, ma niente parte.
  const conTrappola = await request.post("/api/contatto", {
    headers: intestazioni(base),
    data: { nome: "Programma", email: "bot@esempio.test", sito: "riempito", t: Date.now() - 9_000 },
  });
  expect(conTrappola.status(), "la trappola deve rispondere come un successo").toBe(200);

  // Un invio troppo rapido: stessa cosa.
  const tropoRapido = await request.post("/api/contatto", {
    headers: intestazioni(base),
    data: { nome: "Veloce", email: "veloce@esempio.test", t: Date.now() },
  });
  expect(tropoRapido.status()).toBe(200);

  // Dati non validi: rifiutati con un messaggio, non con un finto successo.
  const nonValida = await request.post("/api/contatto", {
    headers: intestazioni(base),
    data: { nome: "x", email: "non-una-email", t: Date.now() - 9_000 },
  });
  expect(nonValida.status()).toBe(400);
});

test("fuori dalla demo la rotta del contatto non esiste", async ({ context, baseURL }) => {
  const request = context.request;
  const base = baseURL!;
  // Studio NORMALE, senza il contrassegno dimostrativo.
  await creaStudio(request, base, "non-demo");

  const r = await request.post("/api/contatto", {
    headers: intestazioni(base),
    data: { nome: "Chiunque", email: "chiunque@esempio.test", t: Date.now() - 9_000 },
  });
  expect(r.status(), "su uno studio vero la rotta deve essere 404").toBe(404);
});
