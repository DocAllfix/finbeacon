export type DimensioneImpresa = "micro" | "piccola" | "media" | "grande";

/** [fatturato, MOL] in migliaia di euro; null se il dato è riservato. */
export type CoppiaIstat = [number, number] | null;

export type DatiSettoriIstat = Record<
  string,
  { nome: string } & Record<DimensioneImpresa | "tutte", CoppiaIstat>
>;
