import type { DatiBilancio } from "./types";

/**
 * Import del bilancio depositato al Registro Imprese in formato XBRL
 * (tassonomia «Principi Contabili Italiani», itcc-ci).
 *
 * Il file è quello che lo studio produce già per il deposito: l'istanza XML
 * (.xbrl / .xml) o la stessa firmata digitalmente (.xbrl.p7m, CAdES). Nessuna
 * rete, nessuna libreria: un'istanza di deposito è XML piatto (contesti, unità,
 * fatti) e un lettore piccolo è più sicuro di uno generico. Non risolve entità
 * esterne né DTD, quindi niente XXE.
 *
 * Nomi degli elementi verificati sullo schema ufficiale itcc-ci-2018-11-04.xsd
 * (pacchetto PCI-2018-11-04 di XBRL Italia, 2.319 elementi): ordinario,
 * abbreviato e micro usano lo stesso namespace di base.
 *
 * Regola: ciò che il bilancio non contiene NON si stima. Le grandezze mancanti
 * tornano in `mancanti` e lo studio le inserisce a mano.
 */

/** Versioni della tassonomia che l'import sa leggere (le altre sono rifiutate). */
export const TASSONOMIE_XBRL = ["2018-11-04"] as const;
const NS_BASE = "http://www.infocamere.it/itnn/fr/itcc/ci/";

export class ErroreXbrl extends Error {
  constructor(messaggio: string) {
    super(messaggio);
    this.name = "ErroreXbrl";
  }
}

// ---------------------------------------------------------------------------
// 1. Busta firmata (.p7m) → XML
// ---------------------------------------------------------------------------

interface NodoBer {
  classe: number;
  costruito: boolean;
  numero: number;
  inizio: number; // primo byte del contenuto
  fine: number; // primo byte dopo il contenuto
  figli: NodoBer[];
}

function leggiBer(b: Uint8Array, pos: number, profondita = 0): { nodo: NodoBer; dopo: number } {
  if (profondita > 40) throw new ErroreXbrl("File firmato non valido (struttura troppo profonda).");
  if (pos + 2 > b.length) throw new ErroreXbrl("File firmato troncato.");
  const id = b[pos++]!;
  const classe = id >> 6;
  const costruito = (id & 0x20) !== 0;
  let numero = id & 0x1f;
  if (numero === 0x1f) {
    numero = 0;
    let c: number;
    do {
      c = b[pos++]!;
      numero = (numero << 7) | (c & 0x7f);
    } while (c & 0x80);
  }
  const primo = b[pos++]!;
  const figli: NodoBer[] = [];
  if (primo === 0x80) {
    // lunghezza indefinita (BER): figli fino a 00 00
    if (!costruito) throw new ErroreXbrl("File firmato non valido (lunghezza indefinita).");
    const inizio = pos;
    while (!(b[pos] === 0 && b[pos + 1] === 0)) {
      if (pos >= b.length) throw new ErroreXbrl("File firmato troncato.");
      const r = leggiBer(b, pos, profondita + 1);
      figli.push(r.nodo);
      pos = r.dopo;
    }
    return { nodo: { classe, costruito, numero, inizio, fine: pos, figli }, dopo: pos + 2 };
  }
  let lunghezza = primo;
  if (primo & 0x80) {
    const n = primo & 0x7f;
    if (n > 4) throw new ErroreXbrl("File firmato non valido (lunghezza).");
    lunghezza = 0;
    for (let i = 0; i < n; i++) lunghezza = lunghezza * 256 + b[pos++]!;
  }
  const inizio = pos;
  const fine = pos + lunghezza;
  if (fine > b.length) throw new ErroreXbrl("File firmato troncato.");
  if (costruito) {
    let p = inizio;
    while (p < fine) {
      const r = leggiBer(b, p, profondita + 1);
      figli.push(r.nodo);
      p = r.dopo;
    }
  }
  return { nodo: { classe, costruito, numero, inizio, fine, figli }, dopo: fine };
}

/** Contenuto di un OCTET STRING, anche spezzato in frammenti (BER «costruito»). */
function ottetti(b: Uint8Array, n: NodoBer): Uint8Array {
  if (!n.costruito) return b.subarray(n.inizio, n.fine);
  const parti = n.figli.map((f) => ottetti(b, f));
  const tot = new Uint8Array(parti.reduce((s, p) => s + p.length, 0));
  let o = 0;
  for (const p of parti) {
    tot.set(p, o);
    o += p.length;
  }
  return tot;
}

/**
 * ContentInfo { OID signedData, [0] SignedData { versione, algoritmi,
 * EncapsulatedContentInfo { OID, [0] OCTET STRING contenuto }, ... } }
 */
function contenutoP7m(b: Uint8Array): Uint8Array {
  const { nodo: radice } = leggiBer(b, 0);
  const signedData = radice.figli[1]?.figli[0];
  const encap = signedData?.figli[2];
  const esplicito = encap?.figli[1];
  const stringa = esplicito?.figli[0];
  if (!stringa)
    throw new ErroreXbrl("Il file firmato non contiene un documento (firma «detached»?).");
  return ottetti(b, stringa);
}

function sembraBase64(b: Uint8Array): boolean {
  // «MI» = inizio di una SEQUENCE DER codificata in base64
  return b[0] === 0x4d && b[1] === 0x49;
}

function daBase64(b: Uint8Array): Uint8Array {
  const testo = new TextDecoder("ascii").decode(b).replace(/-----[^-]+-----|\s/g, "");
  const bin = atob(testo);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

/**
 * Bytes del file caricato → testo XML dell'istanza. Accetta XML in chiaro,
 * .p7m binario o in base64, anche con più firme annidate.
 */
export function testoIstanzaDaFile(bytes: Uint8Array): string {
  let b = bytes;
  for (let giro = 0; giro < 4; giro++) {
    // salta BOM e spazi iniziali
    let i = 0;
    while (i < b.length && (b[i] === 0xef || b[i] === 0xbb || b[i] === 0xbf || b[i]! <= 0x20)) i++;
    if (b[i] === 0x3c /* < */) return decodificaXml(b.subarray(i));
    if (sembraBase64(b.subarray(i))) b = daBase64(b.subarray(i));
    if (b[0] === 0x30 /* SEQUENCE */) {
      b = contenutoP7m(b);
      continue;
    }
    break;
  }
  throw new ErroreXbrl("Il file non è un bilancio XBRL (né XML né firmato .p7m).");
}

function decodificaXml(b: Uint8Array): string {
  const prologo = new TextDecoder("ascii").decode(b.subarray(0, 200));
  const enc = /encoding=["']([\w-]+)["']/i.exec(prologo)?.[1]?.toLowerCase() ?? "utf-8";
  try {
    return new TextDecoder(enc).decode(b);
  } catch {
    return new TextDecoder("utf-8").decode(b);
  }
}

// ---------------------------------------------------------------------------
// 2. Istanza XML → contesti e fatti
// ---------------------------------------------------------------------------

export interface PeriodoXbrl {
  /** Data di inizio per i flussi (conto economico), null per i saldi */
  inizio: string | null;
  /** Data di fine (flussi) o data del saldo (stato patrimoniale), AAAA-MM-GG */
  fine: string;
}

export interface IstanzaXbrl {
  versione: string;
  /** nome locale → [periodo, valore] */
  fatti: { nome: string; periodo: PeriodoXbrl; valore: string; numerico: boolean }[];
}

const ENTITA: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'" };
function decodificaEntita(s: string): string {
  return s.replace(/&(#x[0-9a-f]+|#\d+|\w+);/gi, (m, e: string) => {
    if (e[0] === "#") {
      const n = e[1] === "x" || e[1] === "X" ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
      return Number.isFinite(n) ? String.fromCodePoint(n) : m;
    }
    return ENTITA[e] ?? m;
  });
}

function attributi(tag: string): Record<string, string> {
  const a: Record<string, string> = {};
  for (const m of tag.matchAll(/([\w:.-]+)\s*=\s*("([^"]*)"|'([^']*)')/g)) {
    a[m[1]!] = decodificaEntita(m[3] ?? m[4] ?? "");
  }
  return a;
}

/** Legge contesti, unità e fatti della tassonomia itcc-ci. */
export function leggiIstanzaXbrl(xml: string): IstanzaXbrl {
  if (/<!DOCTYPE/i.test(xml)) throw new ErroreXbrl("Il file contiene una DTD: non è accettato.");
  // via commenti e sezioni CDATA (testi della nota integrativa): non servono
  const pulito = xml.replace(/<!--[\s\S]*?-->/g, "").replace(/<!\[CDATA\[[\s\S]*?\]\]>/g, "");

  const radice = /<([\w.-]+:)?xbrl\b[^>]*>/.exec(pulito);
  if (!radice) throw new ErroreXbrl("Il file non è un'istanza XBRL.");

  // prefisso → namespace, dalla radice
  const ns = attributi(radice[0]);
  let prefisso: string | null = null;
  let versione: string | null = null;
  for (const [k, v] of Object.entries(ns)) {
    if (!k.startsWith("xmlns:") || !v.startsWith(NS_BASE)) continue;
    const m = /\/ci\/(\d{4}-\d{2}-\d{2})$/.exec(v);
    if (m) {
      prefisso = k.slice(6);
      versione = m[1]!;
    }
  }
  if (!prefisso || !versione) {
    throw new ErroreXbrl(
      "Il file non usa la tassonomia dei bilanci italiani (itcc-ci): non è un bilancio depositato al Registro Imprese.",
    );
  }
  if (!(TASSONOMIE_XBRL as readonly string[]).includes(versione)) {
    throw new ErroreXbrl(
      `Tassonomia ${versione} non ancora supportata (supportate: ${TASSONOMIE_XBRL.join(", ")}). Inserisci i dati a mano o scrivici.`,
    );
  }

  // contesti: id → periodo (si ignorano i contesti con dimensioni: non servono)
  const contesti = new Map<string, PeriodoXbrl>();
  for (const m of pulito.matchAll(/<([\w.-]+:)?context\b([^>]*)>([\s\S]*?)<\/\1?context>/g)) {
    const id = attributi(`<x ${m[2]}>`).id;
    const corpo = m[3]!;
    if (!id || /<([\w.-]+:)?(segment|scenario)\b/.test(corpo)) continue;
    const ist = /<([\w.-]+:)?instant>\s*([\d-]+)\s*</.exec(corpo)?.[2];
    const ini = /<([\w.-]+:)?startDate>\s*([\d-]+)\s*</.exec(corpo)?.[2];
    const fin = /<([\w.-]+:)?endDate>\s*([\d-]+)\s*</.exec(corpo)?.[2];
    if (ist) contesti.set(id, { inizio: null, fine: ist.slice(0, 10) });
    else if (ini && fin) contesti.set(id, { inizio: ini.slice(0, 10), fine: fin.slice(0, 10) });
  }

  // unità in euro
  const unitaEuro = new Set<string>();
  for (const m of pulito.matchAll(/<([\w.-]+:)?unit\b([^>]*)>([\s\S]*?)<\/\1?unit>/g)) {
    const id = attributi(`<x ${m[2]}>`).id;
    if (id && /:EUR\s*</i.test(m[3]!)) unitaEuro.add(id);
  }

  const fatti: IstanzaXbrl["fatti"] = [];
  const p = prefisso.replace(/[.-]/g, "\\$&");
  const reFatto = new RegExp(`<${p}:(\\w+)\\b([^>]*?)(\\/>|>([\\s\\S]*?)<\\/${p}:\\1\\s*>)`, "g");
  for (const m of pulito.matchAll(reFatto)) {
    const a = attributi(`<x ${m[2]}>`);
    const periodo = a.contextRef ? contesti.get(a.contextRef) : undefined;
    if (!periodo) continue;
    if (a["xsi:nil"] === "true" || m[3] === "/>") continue;
    const numerico = a.unitRef !== undefined;
    if (numerico && !unitaEuro.has(a.unitRef!)) {
      throw new ErroreXbrl(`Importi in una valuta diversa dall'euro (unità «${a.unitRef}»).`);
    }
    fatti.push({ nome: m[1]!, periodo, valore: decodificaEntita(m[4] ?? "").trim(), numerico });
  }
  return { versione, fatti };
}

// ---------------------------------------------------------------------------
// 3. Fatti → le 10 grandezze del motore, per anno
// ---------------------------------------------------------------------------

/** Da dove viene ciascun valore: si mostra allo studio prima di salvare. */
export const ORIGINE_XBRL: Record<keyof DatiBilancio, string> = {
  valProd: "Totale valore della produzione (A)",
  fatturato: "Ricavi delle vendite e delle prestazioni (A1)",
  ro: "Differenza tra valore e costi della produzione (A − B)",
  capInvest: "Totale attivo",
  patrNetto: "Totale patrimonio netto",
  utileNetto: "Utile (perdita) dell'esercizio",
  ebitda: "A − B + ammortamenti e svalutazioni (B10)",
  pfn: "Debiti verso banche, altri finanziatori, soci per finanziamenti e obbligazioni − disponibilità liquide",
  servizioDebito: "Non presente nel bilancio: quota capitale dei finanziamenti + interessi",
  flussoCassa: "Flusso finanziario dell'attività operativa (rendiconto finanziario)",
};

/** Perché una grandezza manca, per dirlo allo studio con parole sue. */
export type MotivoMancante =
  | "assente-nel-bilancio" // non c'è in nessuno schema (servizio del debito)
  | "senza-rendiconto" // flusso di cassa: rendiconto non allegato (micro, molti abbreviati)
  | "debiti-non-dettagliati" // PFN: debiti senza ripartizione per natura (micro)
  | "voce-assente"; // la voce obbligatoria non c'è nel file

export interface AnnoXbrl {
  anno: number;
  /** Data di chiusura dell'esercizio, AAAA-MM-GG */
  chiusura: string;
  dati: Partial<DatiBilancio>;
  mancanti: { campo: keyof DatiBilancio; motivo: MotivoMancante }[];
  /** Interessi e altri oneri finanziari (C17): aiuta a stimare a mano il servizio del debito */
  interessi: number | null;
}

export interface BilancioDaXbrl {
  versione: string;
  denominazione: string | null;
  codiceFiscale: string | null;
  /** Codice ATECO dichiarato nei dati anagrafici, es. «87.10.00» */
  ateco: string | null;
  /** Dal più recente */
  anni: AnnoXbrl[];
}

const DEBITI_FINANZIARI = [
  "DebitiObbligazioniTotaleObbligazioni",
  "DebitiObbligazioniConvertibiliTotaleObbligazioniConvertibili",
  "DebitiDebitiVersoSociFinanziamentiTotaleDebitiVersoSociFinanziamenti",
  "DebitiDebitiVersoBancheTotaleDebitiVersoBanche",
  "DebitiDebitiVersoAltriFinanziatoriTotaleDebitiVersoAltriFinanziatori",
] as const;

/** Segno che i debiti sono ripartiti per natura (schema ordinario o tabella della nota integrativa). */
const DEBITI_DETTAGLIATI = /^Debiti\w+Totale\w+$/;

export function mappaBilancioDaXbrl(istanza: IstanzaXbrl): BilancioDaXbrl {
  const testo = (nome: string): string | null =>
    istanza.fatti.find((f) => f.nome === nome && f.valore !== "")?.valore ?? null;

  // Gli anni sono le date di chiusura dei periodi con il valore della produzione
  const chiusure = [
    ...new Set(
      istanza.fatti
        .filter((f) => f.nome === "TotaleValoreProduzione" && f.periodo.inizio)
        .map((f) => f.periodo.fine),
    ),
  ].sort((a, b) => b.localeCompare(a));
  if (chiusure.length === 0) {
    throw new ErroreXbrl(
      "Nel file non c'è il valore della produzione: non è un bilancio d'esercizio leggibile.",
    );
  }

  const anni = chiusure.map((chiusura): AnnoXbrl => {
    const num = (nome: string): number | null => {
      // flussi: periodo che chiude qui; saldi: istante di chiusura
      const f = istanza.fatti.find(
        (x) => x.nome === nome && x.numerico && x.periodo.fine === chiusura,
      );
      if (!f) return null;
      const n = Number(f.valore);
      if (!Number.isFinite(n))
        throw new ErroreXbrl(`Valore non numerico per ${nome}: «${f.valore}».`);
      return n;
    };

    const dati: Partial<DatiBilancio> = {};
    const mancanti: AnnoXbrl["mancanti"] = [];
    const metti = (campo: keyof DatiBilancio, v: number | null, motivo: MotivoMancante) => {
      if (v === null) mancanti.push({ campo, motivo });
      else dati[campo] = v;
    };

    metti("valProd", num("TotaleValoreProduzione"), "voce-assente");
    metti("fatturato", num("ValoreProduzioneRicaviVenditePrestazioni"), "voce-assente");
    const ro = num("DifferenzaValoreCostiProduzione");
    metti("ro", ro, "voce-assente");
    metti("capInvest", num("TotaleAttivo"), "voce-assente");
    metti("patrNetto", num("TotalePatrimonioNetto"), "voce-assente");
    metti("utileNetto", num("UtilePerditaEsercizio"), "voce-assente");

    // EBITDA = A − B + B10 (scelta dell'11/2026: definizione del MOL civilistico)
    const ammortamenti = num(
      "CostiProduzioneAmmortamentiSvalutazioniTotaleAmmortamentiSvalutazioni",
    );
    metti("ebitda", ro === null ? null : ro + (ammortamenti ?? 0), "voce-assente");

    // PFN: solo se i debiti sono ripartiti per natura
    const dettagliati = istanza.fatti.some(
      (f) => f.numerico && f.periodo.fine === chiusura && DEBITI_DETTAGLIATI.test(f.nome),
    );
    const totaleDebiti = num("TotaleDebiti");
    const liquidita = num("TotaleDisponibilitaLiquide") ?? 0;
    if (dettagliati || totaleDebiti === 0) {
      const finanziari = DEBITI_FINANZIARI.reduce((s, n) => s + (num(n) ?? 0), 0);
      dati.pfn = finanziari - liquidita;
    } else {
      mancanti.push({ campo: "pfn", motivo: "debiti-non-dettagliati" });
    }

    mancanti.push({ campo: "servizioDebito", motivo: "assente-nel-bilancio" });
    metti("flussoCassa", num("FlussoFinanziarioAttivitaOperativa"), "senza-rendiconto");

    return {
      anno: Number(chiusura.slice(0, 4)),
      chiusura,
      dati,
      mancanti,
      interessi: num(
        "ProventiOneriFinanziariInteressiAltriOneriFinanziariTotaleInteressiAltriOneriFinanziari",
      ),
    };
  });

  return {
    versione: istanza.versione,
    denominazione: testo("DatiAnagraficiDenominazione"),
    codiceFiscale: testo("DatiAnagraficiCodiceFiscale"),
    ateco: estraiAteco(testo("DatiAnagraficiSettoreAttivitaPrevalenteAteco")),
    anni,
  };
}

/** «Strutture di assistenza … (87.10.00)» o «871000» → «87.10.00». */
export function estraiAteco(grezzo: string | null): string | null {
  if (!grezzo) return null;
  const puntato = /(\d{2}(?:\.\d{1,2}){1,2})/.exec(grezzo)?.[1];
  if (puntato) return puntato;
  const cifre = /\b(\d{6})\b/.exec(grezzo)?.[1];
  return cifre ? `${cifre.slice(0, 2)}.${cifre.slice(2, 4)}.${cifre.slice(4, 6)}` : null;
}

/** Tutto il percorso: bytes del file caricato → bilancio per anno. */
export function leggiBilancioXbrl(bytes: Uint8Array): BilancioDaXbrl {
  return mappaBilancioDaXbrl(leggiIstanzaXbrl(testoIstanzaDaFile(bytes)));
}
