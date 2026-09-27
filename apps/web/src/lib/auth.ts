import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { APIError, createAuthMiddleware, getSessionFromCtx } from "better-auth/api";
import { nextCookies } from "better-auth/next-js";
import { organization } from "better-auth/plugins";
import { and, eq, gt } from "drizzle-orm";

import { db, schema } from "./db";
import { MESSAGGIO_DEMO } from "./demo";
import { eLocale } from "./env";
import { accoda } from "./email/outbox";
import { invitoCollaboratore, recuperoPassword, verificaEmail } from "./email/template";

/**
 * Autenticazione multi-studio: studio = organization (plugin Better Auth),
 * ruoli nativi owner/admin/member.
 *
 * Le email non partono da qui: vengono accodate in mail_outbox e spedite dal
 * worker. Un relay SMTP lento o irraggiungibile non deve far fallire un login,
 * una registrazione o una richiesta di recupero password.
 */
const baseURL = process.env.BETTER_AUTH_URL ?? "http://localhost:3000";
const produzione = process.env.NODE_ENV === "production";
const cookieSicuri = produzione && !eLocale(baseURL);

/**
 * Cancello di registrazione LATO SERVER. La costante NEXT_PUBLIC_ omonima
 * controlla solo cosa mostra l'interfaccia: da sola lascerebbe
 * /api/auth/sign-up/email aperto a chiunque anche in produzione.
 *
 * NON si usa `disableSignUp` di Better Auth: spegne l'endpoint per TUTTI, e
 * accettare un invito passa proprio di li'. Con quello attivo il titolare crea
 * l'invito, la mail parte, il collaboratore clicca — e non puo' creare il
 * proprio accesso. Verificato: HTTP 400 EMAIL_PASSWORD_SIGN_UP_DISABLED.
 *
 * La regola che serve davvero e' piu' stretta e piu' precisa: nessuno si
 * registra da solo, ma chi ha un invito valido si'. Vive nell'hook
 * `user.create.before` qui sotto.
 *
 * Il provisioning di una nuova istanza crea il titolare eseguendo il seed con
 * REGISTRAZIONE_APERTA=true per quella singola esecuzione.
 */
const registrazioneAperta = produzione ? process.env.REGISTRAZIONE_APERTA === "true" : true;

/**
 * L'indirizzo dello studio dimostrativo, in minuscolo.
 *
 * Serve perche' quell'account, con la demo aperta al pubblico, e' un indirizzo
 * NOTO: chiunque lo conosce puo' chiedergli il recupero password. Vedi
 * `sendResetPassword` qui sotto.
 */
const emailDimostrativa = (process.env.DEMO_EMAIL ?? "demo@finbeacon.it").toLowerCase();

/**
 * Percorsi di Better Auth che modificano lo studio o i suoi membri.
 *
 * PERCHE' ESISTE QUESTA LISTA. `vietatoInDemo()` protegge le NOSTRE azioni di
 * dominio (clienti, esercizi, scadenze), e le protegge tutte. Non protegge
 * niente di cio' che passa da `/api/auth/*`, perche' quelle rotte sono di
 * Better Auth e non transitano dalle nostre azioni.
 *
 * Finche' le credenziali dimostrative si consegnavano a mano a un
 * commercialista, non importava: il blocco nel pannello impostazioni
 * (`disabled` sui campi, `if (demo) return toast.error(...)`) bastava a evitare
 * l'errore involontario. Con un ingresso pubblico senza credenziali non basta
 * piu': una POST diretta a questi percorsi salta il pannello e riesce. Un
 * visitatore potrebbe invitarsi come membro o rinominare lo studio.
 *
 * Un blocco solo nel browser non e' un blocco: e' un suggerimento.
 */
const MUTAZIONI_STUDIO = new Set([
  "/organization/update",
  "/organization/delete",
  "/organization/invite-member",
  "/organization/cancel-invitation",
  "/organization/remove-member",
  "/organization/update-member-role",
  "/organization/leave",
]);

/** Vero se quello studio porta il contrassegno dimostrativo. */
async function studioDimostrativo(organizationId: string): Promise<boolean> {
  const righe = await db
    .select({ metadata: schema.organization.metadata })
    .from(schema.organization)
    .where(eq(schema.organization.id, organizationId))
    .limit(1);
  try {
    return JSON.parse(righe[0]?.metadata ?? "{}")?.demo === true;
  } catch {
    return false;
  }
}

export const auth = betterAuth({
  baseURL,
  trustedOrigins: [baseURL],
  database: drizzleAdapter(db, {
    provider: "pg",
    schema,
  }),
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 10,
    resetPasswordTokenExpiresIn: 60 * 60,
    sendResetPassword: async ({ user, url }) => {
      /*
       * Lo studio dimostrativo non si fa portare via.
       *
       * Con la demo raggiungibile senza credenziali, il suo indirizzo e' noto a
       * chiunque: bastava chiedere il recupero password per prendersi
       * l'account, e da dentro cambiare o cancellare i due esempi. Il flusso di
       * recupero non guarda il contrassegno `demo`, e non deve: il posto giusto
       * per fermarsi e' qui, dove si decide se il messaggio parte.
       *
       * Si esce in silenzio, di proposito. L'endpoint continua a rispondere
       * come sempre — la stessa conferma generica che riceve chiunque, vedi il
       * commento in `recupera-password/page.tsx` — quindi non si rivela che
       * quell'indirizzo e' speciale. Il token viene creato e resta inutile:
       * senza il messaggio, nessuno lo vede.
       */
      if (user.email.toLowerCase() === emailDimostrativa) return;
      await accoda(user.email, recuperoPassword(url));
    },
  },
  emailVerification: {
    sendOnSignUp: true,
    // Non si blocca il login sulla verifica: gli account già esistenti
    // resterebbero chiusi fuori. L'indirizzo verificato serve soprattutto a
    // garantire che il recupero password funzioni davvero.
    autoSignInAfterVerification: false,
    sendVerificationEmail: async ({ user, url }) => {
      await accoda(user.email, verificaEmail(url));
    },
  },
  plugins: [
    organization({
      // Un utente = un solo studio nell'MVP (il titolare crea lo studio al signup)
      organizationLimit: 1,
      sendInvitationEmail: async ({ email, id, organization: studio }) => {
        await accoda(email, invitoCollaboratore(studio.name, `${baseURL}/invito/${id}`), {
          organizationId: studio.id,
        });
      },
    }),
    nextCookies(),
  ],
  databaseHooks: {
    user: {
      create: {
        /**
         * A istanza chiusa si registra solo chi e' stato invitato.
         *
         * Il controllo e' sull'invito, non sull'endpoint: un estraneo viene
         * respinto, un collaboratore invitato entra. L'invito dev'essere in
         * attesa e non scaduto — un invito revocato o vecchio non vale.
         */
        before: async (nuovo) => {
          if (registrazioneAperta) return;
          const inviti = await db
            .select({ id: schema.invitation.id })
            .from(schema.invitation)
            .where(
              and(
                eq(schema.invitation.email, nuovo.email.toLowerCase()),
                eq(schema.invitation.status, "pending"),
                gt(schema.invitation.expiresAt, new Date()),
              ),
            )
            .limit(1);
          if (inviti.length === 0) return false;
        },
      },
    },
    session: {
      create: {
        // Tenant scoping: ogni sessione nasce già agganciata allo studio
        // dell'utente (un solo studio per utente nell'MVP).
        before: async (session) => {
          const membri = await db
            .select({ organizationId: schema.member.organizationId })
            .from(schema.member)
            .where(eq(schema.member.userId, session.userId))
            .limit(1);
          return {
            data: {
              ...session,
              activeOrganizationId: membri[0]?.organizationId ?? null,
            },
          };
        },
      },
    },
  },
  /**
   * Il contrassegno dimostrativo vale anche sulle rotte di Better Auth.
   *
   * `vietatoInDemo()` copre le nostre azioni di dominio; questo copre il resto,
   * cioe' le mutazioni dello studio e dei suoi membri (vedi `MUTAZIONI_STUDIO`).
   * Senza, il pannello impostazioni sarebbe l'unica difesa, e una POST diretta
   * lo aggirerebbe.
   *
   * Si legge la sessione, non il corpo della richiesta: lo studio da proteggere
   * e' quello ATTIVO di chi chiama, mai un identificativo che arriva dal
   * client. E' la stessa regola di `requireStudio()`.
   */
  hooks: {
    before: createAuthMiddleware(async (ctx) => {
      if (!MUTAZIONI_STUDIO.has(ctx.path)) return;
      const sessione = await getSessionFromCtx(ctx).catch(() => null);
      const organizationId = sessione?.session?.activeOrganizationId;
      if (!organizationId) return;
      if (await studioDimostrativo(organizationId)) {
        throw new APIError("FORBIDDEN", { message: MESSAGGIO_DEMO });
      }
    }),
  },
  session: {
    // Otto ore: la sessione copre una giornata di lavoro e non una settimana.
    // L'app mostra i bilanci dei clienti dello studio.
    expiresIn: 60 * 60 * 8,
    updateAge: 60 * 60,
    cookieCache: {
      enabled: true,
      maxAge: 60 * 5,
    },
  },
  advanced: {
    // Esplicito invece che dedotto dallo schema di baseURL: dietro il reverse
    // proxy un BETTER_AUTH_URL sbagliato emetterebbe in silenzio un cookie di
    // sessione senza flag Secure.
    //
    // L'eccezione e' l'origine locale in http (collaudo della build di
    // produzione, test end-to-end): li' un cookie Secure non viene conservato
    // dai client e ogni chiamata autenticata risponderebbe 401. Non e' una
    // rinuncia: verificaAmbiente() in env.ts RIFIUTA l'avvio se un dominio
    // pubblico non usa https, quindi in produzione Secure c'e' sempre.
    useSecureCookies: cookieSicuri,
    defaultCookieAttributes: {
      httpOnly: true,
      sameSite: "lax",
      secure: cookieSicuri,
    },
  },
  /**
   * Rate limiting: soglia generale prudente, più stretta sugli endpoint che
   * si prestano a tentativi ripetuti (login, registrazione, inviti, recupero).
   */
  rateLimit: {
    // Attivo ovunque tranne che su un'origine locale (sviluppo e test
    // end-to-end), dove una suite che crea decine di studi supererebbe la
    // soglia e fallirebbe con 429 su un comportamento CORRETTO.
    //
    // Stessa condizione dei cookie Secure, e per lo stesso motivo: su
    // 127.0.0.1 non c'e' nessuno da cui difendersi. Un'istanza cliente ha
    // sempre un BETTER_AUTH_URL pubblico in https, quindi il limitatore c'e'.
    enabled: !eLocale(baseURL),
    window: 60,
    max: 60,
    customRules: {
      "/sign-in/email": { window: 60, max: 5 },
      "/sign-up/email": { window: 300, max: 10 },
      "/forget-password": { window: 300, max: 5 },
      "/reset-password": { window: 300, max: 10 },
      "/organization/invite-member": { window: 300, max: 20 },
    },
  },
});

export type Session = typeof auth.$Infer.Session;
