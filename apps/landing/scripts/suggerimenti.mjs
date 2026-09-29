/**
 * Le ricerche vere che partono da una radice, dall'autocompletamento di Google
 * (italiano, Italia). Gratis e senza chiave: non dà i volumi, ma dice COSA la
 * gente scrive, che è ciò che serve per scegliere titoli e sezioni di una
 * guida. I volumi veri arrivano da Search Console, quando ci saranno dati.
 *
 *   node scripts/suggerimenti.mjs "dscr prospettico"
 *   node scripts/suggerimenti.mjs "adeguati assetti" --alfabeto
 *
 * Con --alfabeto prova anche «radice a», «radice b», … : più lento (27
 * richieste, con una pausa fra l'una e l'altra per non martellare), molto più
 * completo.
 */
const [radice, ...opzioni] = process.argv.slice(2);
if (!radice) {
  console.error('Uso: node scripts/suggerimenti.mjs "<radice>" [--alfabeto]');
  process.exit(2);
}

const pausa = (ms) => new Promise((r) => setTimeout(r, ms));

async function suggerisci(q) {
  const url = `https://suggestqueries.google.com/complete/search?client=firefox&hl=it&gl=it&q=${encodeURIComponent(q)}`;
  const r = await fetch(url, { signal: AbortSignal.timeout(10_000) });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  // UTF-8 (verificato: leggerla come ISO-8859-1 dava «chi Ã¨ obbligato»).
  return JSON.parse(await r.text())[1] ?? [];
}

const domande = [radice];
if (opzioni.includes("--alfabeto"))
  for (const c of "abcdefghijklmnopqrstuvwxyz") domande.push(`${radice} ${c}`);

const trovate = new Set();
for (const q of domande) {
  try {
    for (const s of await suggerisci(q)) trovate.add(s.trim());
  } catch (e) {
    console.error(`[suggerimenti] «${q}»: ${e.message}`);
  }
  if (domande.length > 1) await pausa(400);
}

for (const s of [...trovate].sort((a, b) => a.localeCompare(b, "it"))) console.log(s);
