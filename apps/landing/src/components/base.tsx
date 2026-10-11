import { ArrowRight } from "lucide-react";
import Link from "next/link";

/**
 * Mattoni comuni. Un solo contenitore e una sola larghezza per tutta la pagina:
 * il ritmo lo danno i fondi e i respiri, non larghezze diverse.
 */

export function Contenitore({
  className = "",
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return <div className={`mx-auto w-full max-w-[72rem] px-5 sm:px-8 ${className}`}>{children}</div>;
}

/*
 * L'occhiello è una frase, non un'etichetta: niente trattino e niente
 * maiuscoletto spaziato (11/10). Trattino + maiuscole sopra un titolo enorme era
 * la formula di Evalis Deck e di metà delle pagine generate; le maiuscole
 * spaziate restano alle micro-etichette dentro il prodotto.
 */
export function Occhiello({ children, id }: { children: React.ReactNode; id?: string }) {
  return (
    <p id={id} className="text-[0.9375rem] leading-snug font-medium text-accento">
      {children}
    </p>
  );
}

export function Titolo2({
  id,
  children,
  className = "",
}: {
  id: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <h2
      id={id}
      className={`mt-3 max-w-[22ch] text-[clamp(2rem,1.35rem+2.5vw,3.25rem)] leading-[1.06] tracking-[-0.02em] font-semibold text-balance ${className}`}
    >
      {children}
    </h2>
  );
}

export function Paragrafo({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <p className={`text-[1.0625rem] leading-[1.65] text-testo-attenuato ${className}`}>
      {children}
    </p>
  );
}

const PULSANTE =
  "inline-flex h-11 items-center justify-center gap-2 rounded-[var(--radius-pulsante)] px-5 text-[0.9375rem] font-medium whitespace-nowrap transition-transform duration-150 ease-[var(--ease-uscita)] hover:-translate-y-px active:translate-y-0";

/**
 * L'azione principale: una sola per schermata (DESIGN.md), nell'accento.
 *
 * Un rettangolo pieno con la parola e una freccia piccola, che al passaggio di
 * un puntatore vero scivola di qualche pixel (11/10); nel tasto compatto della
 * testata la freccia non c'è. Alla pressione il tasto si stringe appena
 * (scale 0.97). Sostituisce la cella scura con la freccia
 * incassata, che era il tasto di serie dei modelli generati e sembrava tale.
 */
export function PulsantePrimario({
  href,
  compatto = false,
  children,
}: {
  href: string;
  compatto?: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={`tasto-primario inline-flex items-center gap-2 rounded-[var(--radius-pulsante)] bg-accento font-medium whitespace-nowrap text-su-accento ${compatto ? "h-10 px-4 text-sm" : "h-12 pr-5 pl-6 text-[0.9375rem]"}`}
    >
      {children}
      {!compatto && <ArrowRight className="tasto-freccia size-4" aria-hidden />}
    </Link>
  );
}

/**
 * L'alternativa, detta a voce più bassa: testo con un filetto sotto che si
 * riempie al passaggio, come la ricerca a filo dell'app. Non un secondo
 * riquadro accanto al primo: due scatole affiancate dicono «scegli», mentre qui
 * una cosa si fa e l'altra si considera.
 */
export function CollegamentoAFilo({
  href,
  compatto = false,
  className = "",
  children,
}: {
  href: string;
  compatto?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={`a-filo inline-flex items-center font-medium whitespace-nowrap text-testo ${compatto ? "h-10 text-sm" : "h-12 text-[0.9375rem]"} ${className}`}
    >
      <span className="relative pb-1">{children}</span>
    </Link>
  );
}

/** Azione secondaria. Se esterna, si apre in una nuova scheda e lo dice. */
export function PulsanteSecondario({
  href,
  esterno = false,
  children,
}: {
  href: string;
  esterno?: boolean;
  children: React.ReactNode;
}) {
  const classi = `${PULSANTE} border border-bordo bg-superficie text-testo`;
  if (esterno) {
    return (
      <a href={href} className={classi} target="_blank" rel="noopener">
        {children}
        <span className="sr-only"> (si apre in una nuova scheda)</span>
      </a>
    );
  }
  return (
    <Link href={href} className={classi}>
      {children}
    </Link>
  );
}
