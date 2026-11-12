#!/usr/bin/env node
/**
 * Rigenera src/settori/dati-istat.ts dai dati ISTAT «Risultati economici delle
 * imprese — Tutti i settori economici (Ateco 4 cifre) e classe di addetti»
 * (dataflow SDMX IT1,161_267_DF_DCSP_SBSNAZ_3). Licenza ISTAT: CC BY 4.0.
 *
 * Scaricare i due file (il servizio è lento, anche minuti):
 *
 *   curl -o sbs-dati.csv -H "Accept: application/vnd.sdmx.data+csv;version=1.0.0" \
 *     "https://esploradati.istat.it/SDMXWS/rest/data/IT1,161_267_DF_DCSP_SBSNAZ_3,1.0/A.IT.12110+12170....?startPeriod=2021"
 *   curl -o sbs-struttura.xml \
 *     "https://esploradati.istat.it/SDMXWS/rest/dataflow/IT1/161_267_DF_DCSP_SBSNAZ_3/latest?references=all&detail=full"
 *
 * Poi:  node scripts/settori-istat.mjs sbs-dati.csv sbs-struttura.xml
 *
 * Si tiene solo l'anno più recente, solo i codici ATECO numerici (divisione,
 * gruppo, classe) e le sezioni, e per ogni classe dimensionale fatturato e MOL
 * in migliaia di euro: il margine si calcola nel motore. Le celle riservate
 * (OBS_STATUS «c») diventano null, e il motore ripiega sul livello superiore.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const [csvPath, xmlPath] = process.argv.slice(2);
if (!csvPath || !xmlPath) {
  console.error("uso: node scripts/settori-istat.mjs <sbs-dati.csv> <sbs-struttura.xml>");
  process.exit(1);
}

const FATTURATO = "12110";
const MOL = "12170";
// Classi di addetti ISTAT → dimensione del cliente in FinBeacon
const CLASSI = {
  tutte: ["TOTAL"],
  micro: ["W0_9"],
  piccola: ["W10_19", "W20_49"],
  media: ["W50_249"],
  grande: ["W_GE250"],
};

// --- dati -----------------------------------------------------------------
const righe = fs.readFileSync(csvPath, "utf8").trim().split(/\r?\n/);
const intest = righe.shift().split(",");
const col = (n) => {
  const i = intest.indexOf(n);
  if (i < 0) throw new Error(`colonna ${n} assente: il CSV non è quello atteso`);
  return i;
};
const [cTipo, cAteco, cClasse, cAnno, cValore, cStato, cFatt, cAmb] = [
  "DATA_TYPE",
  "ECON_ACTIVITY_NACE_2007",
  "PERS_EMPL_SIZE_CLASS",
  "TIME_PERIOD",
  "OBS_VALUE",
  "OBS_STATUS",
  "TURNOVER_CLASS",
  "ENVIROM_DOMAIN",
].map(col);

const valori = new Map(); // `${anno}|${tipo}|${ateco}|${classe}` → numero | null
let anno = 0;
for (const r of righe) {
  const c = r.split(",");
  if (c[cFatt] !== "9" || c[cAmb] !== "9") continue;
  if (c[cTipo] !== FATTURATO && c[cTipo] !== MOL) continue;
  const a = Number(c[cAnno]);
  anno = Math.max(anno, a);
  const riservato = c[cStato] === "c" || c[cValore] === "";
  valori.set(`${a}|${c[cTipo]}|${c[cAteco]}|${c[cClasse]}`, riservato ? null : Number(c[cValore]));
}

// --- nomi dei codici ATECO ------------------------------------------------
const xml = fs.readFileSync(xmlPath, "utf8");
const lista = xml.match(/<structure:Codelist id="CL_ATECO_2007".*?<\/structure:Codelist>/s);
if (!lista) throw new Error("codelist CL_ATECO_2007 assente nella struttura");
const nomi = new Map();
for (const m of lista[0].matchAll(/<structure:Code id="([^"]+)"[^>]*>(.*?)<\/structure:Code>/gs)) {
  const it = m[2].match(/<common:Name xml:lang="it">([^<]*)/);
  if (it) nomi.set(m[1], it[1].trim());
}

// --- composizione -------------------------------------------------------
const somma = (tipo, ateco, classi) => {
  let t = 0;
  for (const k of classi) {
    const v = valori.get(`${anno}|${tipo}|${ateco}|${k}`);
    if (v === null || v === undefined) return null;
    t += v;
  }
  return t;
};

const codici = [...new Set([...valori.keys()].map((k) => k.split("|")[2]))]
  .filter((c) => /^\d{2,4}$/.test(c) || /^[A-U]$/.test(c))
  .sort();

const settori = {};
for (const codice of codici) {
  const classi = {};
  for (const [dim, ist] of Object.entries(CLASSI)) {
    const f = somma(FATTURATO, codice, ist);
    const m = somma(MOL, codice, ist);
    classi[dim] = f !== null && m !== null && f > 0 ? [f, m] : null;
  }
  if (Object.values(classi).every((v) => v === null)) continue;
  settori[codice] = { nome: nomi.get(codice) ?? "", ...classi };
}

const qui = path.dirname(fileURLToPath(import.meta.url));
const uscita = path.join(qui, "..", "src", "settori", "dati-istat.ts");
fs.mkdirSync(path.dirname(uscita), { recursive: true });
fs.writeFileSync(
  uscita,
  `/* eslint-disable */
// GENERATO da scripts/settori-istat.mjs: non modificare a mano.
// Fonte: ISTAT, Risultati economici delle imprese (SBS), anno ${anno}.
// Dataflow IT1,161_267_DF_DCSP_SBSNAZ_3. Licenza CC BY 4.0.
// Per ogni codice ATECO 2007 e dimensione: [fatturato, MOL] in migliaia di euro, null se riservato.

import type { DatiSettoriIstat } from "./tipi";

export const ANNO_ISTAT = ${anno};

export const SETTORI_ISTAT: DatiSettoriIstat = ${JSON.stringify(settori)};
`,
);
console.log(`scritto ${uscita}: ${Object.keys(settori).length} codici, anno ${anno}`);
