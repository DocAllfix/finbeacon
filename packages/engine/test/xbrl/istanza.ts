/**
 * Costruisce istanze XBRL di prova con i nomi UFFICIALI della tassonomia
 * itcc-ci 2018-11-04 (verificati sullo schema, vedi nomi-pci-2018-11-04.json).
 *
 * I valori dei casi «reali» vengono da bilanci depositati e pubblicati come PDF
 * «generato automaticamente da XBRL»: le cifre sono quelle del file depositato,
 * la confezione XML è ricostruita qui. Nessun file di un cliente nel repo.
 */
export interface AnnoIstanza {
  /** AAAA: si usano i contesti d_AAAA (1/1–31/12) e i_AAAA (31/12) */
  anno: number;
  /** nome elemento → importo in euro */
  flussi?: Record<string, number>;
  saldi?: Record<string, number>;
}

export function istanzaXbrl({
  anni,
  anagrafica = {},
  versione = "2018-11-04",
  prefisso = "itcc-ci",
  extraRadice = "",
}: {
  anni: AnnoIstanza[];
  anagrafica?: Record<string, string>;
  versione?: string;
  prefisso?: string;
  extraRadice?: string;
}): string {
  const contesti = anni
    .map(
      ({ anno }) => `
  <xbrli:context id="d_${anno}"><xbrli:entity><xbrli:identifier scheme="http://www.infocamere.it">00000000000</xbrli:identifier></xbrli:entity>
    <xbrli:period><xbrli:startDate>${anno}-01-01</xbrli:startDate><xbrli:endDate>${anno}-12-31</xbrli:endDate></xbrli:period></xbrli:context>
  <xbrli:context id="i_${anno}"><xbrli:entity><xbrli:identifier scheme="http://www.infocamere.it">00000000000</xbrli:identifier></xbrli:entity>
    <xbrli:period><xbrli:instant>${anno}-12-31</xbrli:instant></xbrli:period></xbrli:context>`,
    )
    .join("");
  const primo = anni[0]!.anno;
  const fatti = anni
    .flatMap(({ anno, flussi = {}, saldi = {} }) => [
      ...Object.entries(flussi).map(
        ([n, v]) =>
          `  <${prefisso}:${n} contextRef="d_${anno}" unitRef="eur" decimals="0">${v}</${prefisso}:${n}>`,
      ),
      ...Object.entries(saldi).map(
        ([n, v]) =>
          `  <${prefisso}:${n} contextRef="i_${anno}" unitRef="eur" decimals="0">${v}</${prefisso}:${n}>`,
      ),
    ])
    .join("\n");
  const anag = Object.entries(anagrafica)
    .map(([n, v]) => `  <${prefisso}:${n} contextRef="i_${primo}">${v}</${prefisso}:${n}>`)
    .join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>
<xbrli:xbrl xmlns:xbrli="http://www.xbrl.org/2003/instance" xmlns:link="http://www.xbrl.org/2003/linkbase"
  xmlns:xlink="http://www.w3.org/1999/xlink" xmlns:iso4217="http://www.xbrl.org/2003/iso4217"
  xmlns:${prefisso}="http://www.infocamere.it/itnn/fr/itcc/ci/${versione}" ${extraRadice}>
  <link:schemaRef xlink:type="simple" xlink:href="itcc-ci-abb-${versione}.xsd"/>
  <!-- commento con un finto <${prefisso}:TotaleAttivo contextRef="i_${primo}">999</${prefisso}:TotaleAttivo> -->
${contesti}
  <xbrli:unit id="eur"><xbrli:measure>iso4217:EUR</xbrli:measure></xbrli:unit>
${anag}
${fatti}
</xbrli:xbrl>
`;
}

/**
 * Roemar S.r.l., bilancio ABBREVIATO al 31/12/2023 con rendiconto finanziario
 * (metodo indiretto) e nota integrativa con la tabella dei debiti per natura.
 * Fonte: bilancio e nota integrativa «XBRL al 31-12-2023» pubblicati da ghcspa.com.
 */
export const ROEMAR = {
  anagrafica: {
    DatiAnagraficiDenominazione: "RO. E MAR. S.R.L.",
    DatiAnagraficiSettoreAttivitaPrevalenteAteco:
      "Strutture di assistenza infermieristica residenziale per anziani (87.10.00)",
  },
  anni: [
    {
      anno: 2023,
      flussi: {
        TotaleValoreProduzione: 5037283,
        ValoreProduzioneRicaviVenditePrestazioni: 5017499,
        DifferenzaValoreCostiProduzione: 253178,
        CostiProduzioneAmmortamentiSvalutazioniTotaleAmmortamentiSvalutazioni: 372777,
        ProventiOneriFinanziariInteressiAltriOneriFinanziariTotaleInteressiAltriOneriFinanziari: 101594,
        UtilePerditaEsercizio: 648863,
        FlussoFinanziarioAttivitaOperativa: 214134,
      },
      saldi: {
        TotaleAttivo: 10113863,
        TotalePatrimonioNetto: 4901814,
        TotaleDisponibilitaLiquide: 259190,
        TotaleDebiti: 4829431,
        // nota integrativa, «Variazioni e scadenza dei debiti», valore di fine esercizio
        DebitiDebitiVersoSociFinanziamentiTotaleDebitiVersoSociFinanziamenti: 2287227,
        DebitiDebitiVersoFornitoriTotaleDebitiVersoFornitori: 690994,
      },
    },
    {
      anno: 2022,
      flussi: {
        TotaleValoreProduzione: 3997668,
        ValoreProduzioneRicaviVenditePrestazioni: 3963237,
        DifferenzaValoreCostiProduzione: 458121,
        CostiProduzioneAmmortamentiSvalutazioniTotaleAmmortamentiSvalutazioni: 259908,
        ProventiOneriFinanziariInteressiAltriOneriFinanziariTotaleInteressiAltriOneriFinanziari: 94568,
        UtilePerditaEsercizio: 302954,
        FlussoFinanziarioAttivitaOperativa: 903945,
      },
      saldi: {
        TotaleAttivo: 9737279,
        TotalePatrimonioNetto: 4555904,
        TotaleDisponibilitaLiquide: 199415,
        TotaleDebiti: 4781360,
        // valore di INIZIO esercizio 2023 nella stessa tabella
        DebitiDebitiVersoSociFinanziamentiTotaleDebitiVersoSociFinanziamenti: 2236531,
        DebitiDebitiVersoFornitoriTotaleDebitiVersoFornitori: 646128,
      },
    },
  ],
} satisfies { anagrafica: Record<string, string>; anni: AnnoIstanza[] };
