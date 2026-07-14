# Contact form → real email delivery (design)

## Goal

The contact form on `butto-srl/src/pages/contatti.astro` currently posts to `action="#"` and does nothing. It must actually send an email to `buttosrl@gmail.com` for every submission, using a branded HTML template, without breaking the site's static build/SEO.

## Context

- Site is Astro 4.15, `output: 'static'` (no adapter), deployed on **Vercel**.
- No backend/serverless infra exists yet in the repo.
- Site is bilingual (IT/EN) via `src/i18n/translations.ts` + `data-i18n` attributes; form strings already live under `contatti.form.*` in both languages.
- Brand colors (from `tailwind.config.mjs`): `forest #162C1B`, `forest-mid #244D3C`, `forest-soft #356B4D`, `sage #8DB49A`, `ochre #C4922A`, `ochre-light #D9A83F`, `sienna #B05527`.
- Target inbox `buttosrl@gmail.com` is an existing Gmail account — no new third-party email service will be introduced.

## Chosen approach

**Vercel serverless function + Nodemailer over Gmail SMTP.**

Considered alternatives:
- *Resend (or similar transactional API)* — better deliverability tooling, but requires a new third-party account and DNS domain verification on `butto-srl.it` before it can deliver to an arbitrary recipient. Rejected as disproportionate setup for a single contact form.
- *EmailJS (client-side only)* — no backend/adapter needed at all, template edited in EmailJS's own dashboard. Rejected because it gives less control over the HTML template and weaker anti-spam posture (public endpoint, no server-side validation), and the user wants a real, "we control it" template.

Nodemailer/Gmail wins on: zero new external accounts, reuses the existing mailbox directly, full control over the HTML template in our own code, and sending volume for a contact form is trivially within Gmail's limits.

## Architecture

- `astro.config.mjs`: add `@astrojs/vercel` adapter, switch `output: 'static'` → `output: 'hybrid'`. Every existing page keeps prerendering by default (no SEO/perf regression) — only the new API route opts out.
- `src/pages/api/contact.ts` — new POST endpoint, `export const prerender = false`.
- `src/lib/email-template.ts` — new module exporting `buildContactEmailHtml(data)`, returns a branded HTML string.
- New dependencies: `nodemailer`, `@astrojs/vercel` (`@types/nodemailer` as dev dependency).

## Data flow

1. User fills the form, clicks "Invia Messaggio".
2. Client-side script in `contatti.astro` intercepts `submit`, prevents page reload, collects fields (`name`, `email`, `subject`, `company`, `message`, `privacy`) plus a hidden honeypot field (`website`).
3. `fetch('/api/contact', { method: 'POST', body: JSON.stringify(...) })`.
4. Endpoint validates server-side: `name`/`email`/`message` non-empty, email format valid, `privacy === true`, honeypot empty.
   - Honeypot filled → respond `200 { ok: true }` (fake success), send nothing. Bots get no signal they were blocked.
5. On valid input: build HTML via the template, send with Nodemailer over Gmail SMTP (`smtp.gmail.com:465`, secure), `to: buttosrl@gmail.com`, `replyTo: <visitor email>`, subject `Nuovo contatto sito — <oggetto scelto>`.
6. Respond `{ ok: true }` or `{ ok: false, error: "..." }`.
7. Client script shows a success (green) or error (red) message inline, re-enables the submit button, disables it with a "Invio…" label while the request is in flight.

## Email template (branded)

- Header band, `forest` background, "Buttò S.r.l." + "Nuovo messaggio dal form contatti".
- Body: white background, label/value rows for Nome, Email, Azienda, Oggetto; Messaggio in its own highlighted block.
- Accents in `ochre`.
- Footer, small muted text: "Rispondi a questa email per contattare direttamente il mittente." (works because of the `replyTo` header).
- Plain system font stack (no webfonts — not reliably supported by email clients).

## Error handling

- Server re-validates everything; never trusts client-side `required`/`type=email` alone.
- Invalid input → `400` with a specific message.
- SMTP/send failure → `500`, generic user-facing message ("riprova o scrivi a buttosrl@gmail.com direttamente"); real error detail only in server-side `console.error` (visible in Vercel function logs), never sent to the client.
- Honeypot triggered → `200` fake success, no email sent, no error shown.

## Configuration / secrets (manual steps, outside the codebase)

- Enable 2-Step Verification on the Google account for `buttosrl@gmail.com`.
- Generate a Google "App Password" (16 characters) for that account.
- Vercel → Project Settings → Environment Variables: `GMAIL_USER`, `GMAIL_APP_PASSWORD`. Redeploy after setting.
- Local dev: `.env` (gitignored) with the same two variables, for manual testing only.

## i18n

Add `contatti.form.sending` / `contatti.form.success` / `contatti.form.error` keys to both the `it` and `en` blocks of `src/i18n/translations.ts`, following the existing structure. Submit button label switches to the `sending` string while the request is in flight.

## Testing

- Manual: run `astro dev` with a real `.env`, submit the form, confirm the email lands in `buttosrl@gmail.com` with correct fields and a working reply-to.
- Validation: empty required field / malformed email → correct inline error, no email sent.
- Honeypot: fill the hidden field via devtools → UI shows fake success, no email sent.
- Failure path: temporarily break an env var → generic error shown, no page crash.
- `npm run build` still succeeds and the rest of the site remains statically prerendered.

## Out of scope (YAGNI)

- No autoreply/confirmation email to the visitor.
- No CAPTCHA — honeypot is judged sufficient for the expected traffic volume.
- No stored history/dashboard of submitted messages; email is the only record.
