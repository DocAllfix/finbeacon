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

export function Occhiello({ children, id }: { children: React.ReactNode; id?: string }) {
  return (
    <p id={id} className="etichetta flex items-center gap-3 text-testo-attenuato">
      <span className="h-px w-6 bg-testo-attenuato" aria-hidden />
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
      className={`mt-5 text-[clamp(2rem,1.35rem+2.5vw,3.25rem)] leading-[1.06] tracking-[-0.025em] font-semibold text-balance ${className}`}
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
 * Due parti, come un tasto con la sua freccia incassata: l'etichetta, un
 * filetto, e una cella più scura con la freccia. Al passaggio la freccia esce a
 * destra e una nuova entra da sinistra (solo transform, spento senza
 * movimento). Nessuna ombra esterna: solo un filo di luce sul bordo alto, che
 * dà al tasto una materia senza farlo galleggiare (Regola del Piano Unico).
 *
 * Sostituisce il rettangolo pieno con la freccia accanto al testo (29/09): era
 * il pulsante di qualunque modello generato, e sembrava tale.
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
  const cella = compatto ? "size-7" : "size-9";
  return (
    <Link
      href={href}
      className={`tasto-primario group/tasto inline-flex items-center rounded-[var(--radius-pulsante)] bg-accento font-medium whitespace-nowrap text-su-accento ${compatto ? "h-10 gap-3 pr-1.5 pl-4 text-sm" : "h-12 gap-4 pr-1.5 pl-5 text-[0.9375rem]"}`}
    >
      <span>{children}</span>
      <span
        className={`relative grid ${cella} shrink-0 place-items-center overflow-hidden rounded-[calc(var(--radius-pulsante)-0.15rem)] bg-[oklch(0.1_0.02_230/0.22)]`}
        aria-hidden
      >
        <ArrowRight className="tasto-freccia size-4" />
        <ArrowRight className="tasto-freccia-entra absolute size-4" />
      </span>
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
