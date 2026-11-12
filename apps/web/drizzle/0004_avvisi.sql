CREATE TABLE "avvisi" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"cliente_id" uuid NOT NULL,
	"tipo" text NOT NULL,
	"gravita" text NOT NULL,
	"titolo" text NOT NULL,
	"testo" text NOT NULL,
	"letto_at" timestamp,
	"chiuso_at" timestamp,
	"email_inviata_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "avvisi_gravita_valida" CHECK ("avvisi"."gravita" in ('critico','attenzione'))
);
--> statement-breakpoint
CREATE TABLE "lavori_periodici" (
	"nome" text NOT NULL,
	"giorno" date NOT NULL,
	"eseguito_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "lavori_periodici_nome_giorno_pk" PRIMARY KEY("nome","giorno")
);
--> statement-breakpoint
CREATE TABLE "preferenze_avvisi" (
	"user_id" text PRIMARY KEY NOT NULL,
	"email_critici" boolean DEFAULT true NOT NULL,
	"riepilogo_settimanale" boolean DEFAULT true NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "avvisi" ADD CONSTRAINT "avvisi_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "avvisi" ADD CONSTRAINT "avvisi_cliente_id_clienti_id_fk" FOREIGN KEY ("cliente_id") REFERENCES "public"."clienti"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "preferenze_avvisi" ADD CONSTRAINT "preferenze_avvisi_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "avvisi_aperto_uidx" ON "avvisi" USING btree ("cliente_id","tipo") WHERE "avvisi"."chiuso_at" is null;--> statement-breakpoint
CREATE INDEX "avvisi_org_creato_idx" ON "avvisi" USING btree ("organization_id","created_at");