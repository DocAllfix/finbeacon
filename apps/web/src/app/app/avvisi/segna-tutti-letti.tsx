"use client";

import { useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { segnaTuttiLetti } from "@/lib/avvisi/actions";

export function SegnaTuttiLetti() {
  const [inCorso, avvia] = useTransition();
  return (
    <Button
      variant="outline"
      disabled={inCorso}
      onClick={() =>
        avvia(async () => {
          const r = await segnaTuttiLetti();
          if (!r.ok) toast.error(r.errore);
        })
      }
    >
      {inCorso ? "Un momento…" : "Segna tutti come letti"}
    </Button>
  );
}
