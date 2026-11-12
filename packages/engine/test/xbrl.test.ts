import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { analizza } from "../src/analizza";
import {
  ErroreXbrl,
  estraiAteco,
  leggiBilancioXbrl,
  leggiIstanzaXbrl,
  mappaBilancioDaXbrl,
  testoIstanzaDaFile,
} from "../src/xbrl";
import { istanzaXbrl, ROEMAR } from "./xbrl/istanza";

const bytes = (s: string) => new TextEncoder().encode(s);
const fixture = (nome: string) =>
  new Uint8Array(readFileSync(fileURLToPath(new URL(`./xbrl/${nome}`, import.meta.url))));

describe("XBRL: un abbreviato vero (Roemar 2023, con rendiconto e nota integrativa)", () => {
  const b = leggiBilancioXbrl(bytes(istanzaXbrl(ROEMAR)));
  const [a2023, a2022] = b.anni;

  it("legge versione, anagrafica e i due anni, dal più recente", () => {
    expect(b.versione).toBe("2018-11-04");
    expect(b.denominazione).toBe("RO. E MAR. S.R.L.");
    expect(b.ateco).toBe("87.10.00");
    expect(b.anni.map((a) => a.anno)).toEqual([2023, 2022]);
    expect(a2023!.chiusura).toBe("2023-12-31");
  });

  it("riporta le cifre del bilancio depositato, senza arrotondare", () => {
    expect(a2023!.dati).toEqual({
      valProd: 5037283,
      fatturato: 5017499,
      ro: 253178,
      capInvest: 10113863,
      patrNetto: 4901814,
      utileNetto: 648863,
      ebitda: 253178 + 372777, // A − B + B10
      pfn: 2287227 - 259190, // soci per finanziamenti − liquidità
      flussoCassa: 214134,
    });
    expect(a2023!.interessi).toBe(101594);
  });

  it("l'anno precedente usa i valori di inizio esercizio della stessa tabella", () => {
    expect(a2022!.dati.pfn).toBe(2236531 - 199415);
    expect(a2022!.dati.ebitda).toBe(458121 + 259908);
    expect(a2022!.dati.flussoCassa).toBe(903945);
  });

  it("il servizio del debito non si inventa: è sempre da completare", () => {
    expect(a2023!.dati.servizioDebito).toBeUndefined();
    expect(a2023!.mancanti).toEqual([{ campo: "servizioDebito", motivo: "assente-nel-bilancio" }]);
  });

  it("completato a mano, il motore lo analizza", () => {
    const dati = { ...a2023!.dati, servizioDebito: 300000 } as Parameters<typeof analizza>[0];
    const r = analizza(dati);
    expect(r.indicatori.gi).toBeCloseTo((2287227 - 259190) / (253178 + 372777), 6);
    expect(r.score).toBeGreaterThanOrEqual(0);
  });
});

describe("XBRL: micro e abbreviato senza allegati", () => {
  const micro = leggiBilancioXbrl(
    bytes(
      istanzaXbrl({
        anni: [
          {
            anno: 2024,
            flussi: {
              TotaleValoreProduzione: 410000,
              ValoreProduzioneRicaviVenditePrestazioni: 405000,
              DifferenzaValoreCostiProduzione: -12000,
              CostiProduzioneAmmortamentiSvalutazioniTotaleAmmortamentiSvalutazioni: 18000,
              UtilePerditaEsercizio: -21000,
            },
            saldi: {
              TotaleAttivo: 380000,
              TotalePatrimonioNetto: 35000,
              TotaleDisponibilitaLiquide: 12000,
              TotaleDebiti: 290000,
            },
          },
        ],
      }),
    ),
  );
  const a = micro.anni[0]!;

  it("RO e utile negativi passano col segno", () => {
    expect(a.dati.ro).toBe(-12000);
    expect(a.dati.utileNetto).toBe(-21000);
    expect(a.dati.ebitda).toBe(6000);
  });

  it("senza debiti per natura la PFN manca, senza rendiconto manca il flusso", () => {
    expect(a.dati.pfn).toBeUndefined();
    expect(a.dati.flussoCassa).toBeUndefined();
    expect(a.mancanti.map((m) => `${m.campo}:${m.motivo}`).sort()).toEqual([
      "flussoCassa:senza-rendiconto",
      "pfn:debiti-non-dettagliati",
      "servizioDebito:assente-nel-bilancio",
    ]);
  });

  it("senza alcun debito la PFN è la sola cassa, col segno meno", () => {
    const b = leggiBilancioXbrl(
      bytes(
        istanzaXbrl({
          anni: [
            {
              anno: 2024,
              flussi: { TotaleValoreProduzione: 100, DifferenzaValoreCostiProduzione: 10 },
              saldi: { TotaleDebiti: 0, TotaleDisponibilitaLiquide: 40 },
            },
          ],
        }),
      ),
    );
    expect(b.anni[0]!.dati.pfn).toBe(-40);
  });

  it("ordinario con banche, altri finanziatori e obbligazioni", () => {
    const b = leggiBilancioXbrl(
      bytes(
        istanzaXbrl({
          anni: [
            {
              anno: 2024,
              flussi: { TotaleValoreProduzione: 1000, DifferenzaValoreCostiProduzione: 50 },
              saldi: {
                TotaleDebiti: 900,
                DebitiDebitiVersoBancheTotaleDebitiVersoBanche: 500,
                DebitiDebitiVersoAltriFinanziatoriTotaleDebitiVersoAltriFinanziatori: 100,
                DebitiObbligazioniTotaleObbligazioni: 200,
                DebitiDebitiVersoFornitoriTotaleDebitiVersoFornitori: 100,
                TotaleDisponibilitaLiquide: 150,
              },
            },
          ],
        }),
      ),
    );
    expect(b.anni[0]!.dati.pfn).toBe(500 + 100 + 200 - 150);
  });
});

describe("XBRL: il file come arriva davvero", () => {
  it("firmato .p7m (DER) e in streaming BER: stesso risultato dell'XML in chiaro", () => {
    const chiaro = leggiBilancioXbrl(bytes(istanzaXbrl(ROEMAR)));
    expect(leggiBilancioXbrl(fixture("roemar.xbrl.p7m"))).toEqual(chiaro);
    expect(leggiBilancioXbrl(fixture("roemar-ber.xbrl.p7m"))).toEqual(chiaro);
  });

  it("p7m in base64 e con BOM davanti all'XML", () => {
    const p7m = fixture("roemar.xbrl.p7m");
    let bin = "";
    for (const c of p7m) bin += String.fromCharCode(c);
    const b64 = bytes(btoa(bin).replace(/(.{64})/g, "$1\n"));
    expect(leggiBilancioXbrl(b64).anni[0]!.anno).toBe(2023);
    const conBom = new Uint8Array([0xef, 0xbb, 0xbf, ...bytes(istanzaXbrl(ROEMAR))]);
    expect(testoIstanzaDaFile(conBom).startsWith("<?xml")).toBe(true);
  });

  it("prefisso diverso da itcc-ci: conta il namespace, non il nome", () => {
    const b = leggiBilancioXbrl(bytes(istanzaXbrl({ ...ROEMAR, prefisso: "ns3" })));
    expect(b.anni[0]!.dati.valProd).toBe(5037283);
  });

  it("i commenti non diventano fatti", () => {
    const ist = leggiIstanzaXbrl(istanzaXbrl(ROEMAR));
    expect(ist.fatti.filter((f) => f.nome === "TotaleAttivo").map((f) => f.valore)).toEqual([
      "10113863",
      "9737279",
    ]);
  });
});

describe("XBRL: cosa si rifiuta, e con quale messaggio", () => {
  it("tassonomia futura: rifiutata, mai letta a metà", () => {
    expect(() =>
      leggiBilancioXbrl(bytes(istanzaXbrl({ ...ROEMAR, versione: "2027-03-01" }))),
    ).toThrow(/Tassonomia 2027-03-01 non ancora supportata/);
  });

  it("un file che non è un bilancio italiano", () => {
    expect(() => leggiBilancioXbrl(bytes("<html><body>ciao</body></html>"))).toThrow(ErroreXbrl);
    expect(() =>
      leggiBilancioXbrl(
        bytes(
          '<xbrli:xbrl xmlns:xbrli="http://www.xbrl.org/2003/instance" xmlns:us="http://fasb.org/us-gaap/2024"/>',
        ),
      ),
    ).toThrow(/itcc-ci/);
    expect(() => leggiBilancioXbrl(new Uint8Array([1, 2, 3, 4]))).toThrow(ErroreXbrl);
  });

  it("DTD e entità esterne non passano (XXE)", () => {
    const xxe = `<?xml version="1.0"?><!DOCTYPE x [<!ENTITY e SYSTEM "file:///etc/passwd">]>${istanzaXbrl(ROEMAR).replace(/^<\?xml[^>]*>/, "")}`;
    expect(() => leggiBilancioXbrl(bytes(xxe))).toThrow(/DTD/);
  });

  it("importi in valuta diversa dall'euro", () => {
    const usd = istanzaXbrl(ROEMAR).replace("iso4217:EUR", "iso4217:USD");
    expect(() => leggiBilancioXbrl(bytes(usd))).toThrow(/valuta/);
  });

  it("senza valore della produzione non è un bilancio d'esercizio", () => {
    expect(() => mappaBilancioDaXbrl({ versione: "2018-11-04", fatti: [] })).toThrow(
      /valore della produzione/,
    );
  });

  it("p7m troncato: errore chiaro, nessun ciclo infinito", () => {
    const p7m = fixture("roemar-ber.xbrl.p7m");
    expect(() => leggiBilancioXbrl(p7m.subarray(0, 300))).toThrow(ErroreXbrl);
  });
});

describe("estraiAteco", () => {
  it("dal testo dei dati anagrafici", () => {
    expect(estraiAteco("Commercio al dettaglio (47.11.10)")).toBe("47.11.10");
    expect(estraiAteco("62.01")).toBe("62.01");
    expect(estraiAteco("471110")).toBe("47.11.10");
    expect(estraiAteco("")).toBeNull();
    expect(estraiAteco(null)).toBeNull();
  });
});

describe("nomi degli elementi", () => {
  it("ogni elemento usato dall'import esiste nello schema ufficiale itcc-ci 2018-11-04", () => {
    const rif = JSON.parse(
      readFileSync(
        fileURLToPath(new URL("./xbrl/nomi-pci-2018-11-04.json", import.meta.url)),
        "utf8",
      ),
    ) as { elementi: Record<string, unknown> };
    const sorgente = readFileSync(
      fileURLToPath(new URL("../src/xbrl.ts", import.meta.url)),
      "utf8",
    );
    const usati = [
      ...sorgente.matchAll(
        /"((?:Totale|Debiti|Costi|Proventi|Valore|Differenza|Utile|Flusso|DatiAnagrafici)[A-Za-z]+)"/g,
      ),
    ].map((m) => m[1]!);
    expect(usati.length).toBeGreaterThan(15);
    expect(usati.filter((n) => !(n in rif.elementi))).toEqual([]);
  });
});
