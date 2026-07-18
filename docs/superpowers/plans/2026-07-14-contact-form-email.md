# Contact Form Email Delivery Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the contact form on `butto-srl/src/pages/contatti.astro` actually deliver a branded HTML email to `buttosrl@gmail.com` on submit, instead of posting to `action="#"` and doing nothing.

**Architecture:** Astro switches from `output: 'static'` to `output: 'hybrid'` with the `@astrojs/vercel/serverless` adapter, so every existing page still prerenders statically and only one new opt-out route (`src/pages/api/contact.ts`) runs as a Vercel serverless function. That function validates the submission, builds a branded HTML email via a small template module, and sends it with Nodemailer over Gmail SMTP using an App Password. The page gets a honeypot field, a status element, and a small script that submits via `fetch` instead of a real page navigation.

**Tech Stack:** Astro 4.15, `@astrojs/vercel/serverless` adapter, Nodemailer (Gmail SMTP), Vitest (unit tests for pure logic), existing hand-rolled i18n (`translations.ts` + `data-i18n` + `window.__applyLang`).

## Global Constraints

- All existing pages must remain statically prerendered — only the new API route opts out (`export const prerender = false`). No SEO/perf regression.
- No new third-party account/service (spec rejected EmailJS/Resend) — Gmail SMTP via Nodemailer only, using the existing `buttosrl@gmail.com` mailbox.
- Secrets (`GMAIL_USER`, `GMAIL_APP_PASSWORD`) live only in environment variables (Vercel dashboard + local `.env`), never committed.
- Every new user-facing string needs both `it` and `en` entries in `src/i18n/translations.ts`, following the existing nested-key pattern.
- Anti-spam is a honeypot field only — no CAPTCHA (per spec, judged sufficient for expected volume).
- No autoreply to the visitor, no stored history/dashboard of messages — email is the only record (YAGNI, per spec).
- Server-side validation is authoritative; never trust the client-side `required`/`type=email` attributes alone.

---

### Task 1: Contact form validation module

**Files:**
- Create: `butto-srl/src/lib/contact-validation.ts`
- Test: `butto-srl/tests/lib/contact-validation.test.ts`
- Modify: `butto-srl/package.json` (add `vitest` dev dependency + `test` script)

**Interfaces:**
- Consumes: nothing (pure module, no dependencies on other new code).
- Produces (used by Task 4):
  - `interface ContactFormPayload { name?: unknown; email?: unknown; subject?: unknown; company?: unknown; message?: unknown; privacy?: unknown; website?: unknown; }`
  - `interface ContactFormData { name: string; email: string; subject: string; company: string; message: string; }`
  - `type ValidationResult = { kind: 'valid'; data: ContactFormData } | { kind: 'honeypot' } | { kind: 'invalid'; error: string };`
  - `function validateContactSubmission(payload: ContactFormPayload): ValidationResult`

- [ ] **Step 1: Install Vitest**

Run: `npm install -D vitest`

- [ ] **Step 2: Add the `test` script**

Modify `butto-srl/package.json` — add a `test` entry to `scripts`:

```json
{
  "name": "butto-srl",
  "type": "module",
  "version": "0.0.1",
  "scripts": {
    "dev": "astro dev",
    "start": "astro dev",
    "build": "astro build",
    "preview": "astro preview",
    "astro": "astro",
    "test": "vitest run"
  },
  "dependencies": {
    "astro": "^4.15.0",
    "@astrojs/tailwind": "^5.1.0",
    "tailwindcss": "^3.4.10"
  }
}
```

- [ ] **Step 3: Write the failing test file**

Create `butto-srl/tests/lib/contact-validation.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { validateContactSubmission } from '../../src/lib/contact-validation';

describe('validateContactSubmission', () => {
  const validPayload = {
    name: 'Mario Rossi',
    email: 'mario.rossi@example.com',
    subject: 'Preventivo Servizi Ambientali',
    company: 'Comune di Assoro',
    message: "Vorrei un preventivo per la bonifica di un'area.",
    privacy: true,
    website: '',
  };

  it('returns valid with trimmed data for a well-formed payload', () => {
    const result = validateContactSubmission(validPayload);
    expect(result).toEqual({
      kind: 'valid',
      data: {
        name: 'Mario Rossi',
        email: 'mario.rossi@example.com',
        subject: 'Preventivo Servizi Ambientali',
        company: 'Comune di Assoro',
        message: "Vorrei un preventivo per la bonifica di un'area.",
      },
    });
  });

  it('flags honeypot when the hidden website field is filled', () => {
    const result = validateContactSubmission({ ...validPayload, website: 'http://spam.example' });
    expect(result).toEqual({ kind: 'honeypot' });
  });

  it('rejects a missing name', () => {
    const result = validateContactSubmission({ ...validPayload, name: '  ' });
    expect(result).toEqual({ kind: 'invalid', error: 'Il nome è obbligatorio.' });
  });

  it('rejects a malformed email', () => {
    const result = validateContactSubmission({ ...validPayload, email: 'not-an-email' });
    expect(result).toEqual({ kind: 'invalid', error: 'Inserisci un indirizzo email valido.' });
  });

  it('rejects a missing message', () => {
    const result = validateContactSubmission({ ...validPayload, message: '   ' });
    expect(result).toEqual({ kind: 'invalid', error: 'Il messaggio è obbligatorio.' });
  });

  it('rejects when privacy is not accepted', () => {
    const result = validateContactSubmission({ ...validPayload, privacy: false });
    expect(result).toEqual({ kind: 'invalid', error: 'Devi accettare il trattamento dei dati personali.' });
  });

  it('defaults subject and company when omitted', () => {
    const result = validateContactSubmission({
      name: 'Mario Rossi',
      email: 'mario.rossi@example.com',
      message: 'Messaggio di prova.',
      privacy: true,
    });
    expect(result).toEqual({
      kind: 'valid',
      data: {
        name: 'Mario Rossi',
        email: 'mario.rossi@example.com',
        subject: 'Non specificato',
        company: 'Non specificata',
        message: 'Messaggio di prova.',
      },
    });
  });
});
```

- [ ] **Step 4: Run the test to verify it fails**

Run: `npm test`
Expected: FAIL — `Cannot find module '../../src/lib/contact-validation'` (or similar resolution error), since the module doesn't exist yet.

- [ ] **Step 5: Implement the validation module**

Create `butto-srl/src/lib/contact-validation.ts`:

```ts
export interface ContactFormPayload {
  name?: unknown;
  email?: unknown;
  subject?: unknown;
  company?: unknown;
  message?: unknown;
  privacy?: unknown;
  website?: unknown;
}

export interface ContactFormData {
  name: string;
  email: string;
  subject: string;
  company: string;
  message: string;
}

export type ValidationResult =
  | { kind: 'valid'; data: ContactFormData }
  | { kind: 'honeypot' }
  | { kind: 'invalid'; error: string };

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function asTrimmedString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

export function validateContactSubmission(payload: ContactFormPayload): ValidationResult {
  if (asTrimmedString(payload.website) !== '') {
    return { kind: 'honeypot' };
  }

  const name = asTrimmedString(payload.name);
  if (!name) {
    return { kind: 'invalid', error: 'Il nome è obbligatorio.' };
  }

  const email = asTrimmedString(payload.email);
  if (!EMAIL_PATTERN.test(email)) {
    return { kind: 'invalid', error: 'Inserisci un indirizzo email valido.' };
  }

  const message = asTrimmedString(payload.message);
  if (!message) {
    return { kind: 'invalid', error: 'Il messaggio è obbligatorio.' };
  }

  if (payload.privacy !== true) {
    return { kind: 'invalid', error: 'Devi accettare il trattamento dei dati personali.' };
  }

  return {
    kind: 'valid',
    data: {
      name,
      email,
      message,
      subject: asTrimmedString(payload.subject) || 'Non specificato',
      company: asTrimmedString(payload.company) || 'Non specificata',
    },
  };
}
```

- [ ] **Step 6: Run the test to verify it passes**

Run: `npm test`
Expected: PASS — 7 tests passing in `tests/lib/contact-validation.test.ts`.

- [ ] **Step 7: Commit**

```bash
git add butto-srl/package.json butto-srl/package-lock.json butto-srl/src/lib/contact-validation.ts butto-srl/tests/lib/contact-validation.test.ts
git commit -m "feat: add contact form validation module"
```

---

### Task 2: Branded email template module

**Files:**
- Create: `butto-srl/src/lib/email-template.ts`
- Test: `butto-srl/tests/lib/email-template.test.ts`

**Interfaces:**
- Consumes: `ContactFormData` type from Task 1 (`butto-srl/src/lib/contact-validation.ts`).
- Produces (used by Task 4):
  - `function escapeHtml(value: string): string`
  - `function buildContactEmailHtml(data: ContactFormData): string`

- [ ] **Step 1: Write the failing test file**

Create `butto-srl/tests/lib/email-template.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { buildContactEmailHtml, escapeHtml } from '../../src/lib/email-template';

describe('escapeHtml', () => {
  it('escapes html special characters', () => {
    expect(escapeHtml('<script>alert("x")</script>')).toBe(
      '&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;'
    );
  });

  it('leaves plain text untouched', () => {
    expect(escapeHtml('Mario Rossi')).toBe('Mario Rossi');
  });
});

describe('buildContactEmailHtml', () => {
  const data = {
    name: 'Mario Rossi',
    email: 'mario.rossi@example.com',
    subject: 'Preventivo Servizi Ambientali',
    company: 'Comune di Assoro',
    message: 'Riga uno\nRiga due',
  };

  it('includes all field values in the output', () => {
    const html = buildContactEmailHtml(data);
    expect(html).toContain('Mario Rossi');
    expect(html).toContain('mario.rossi@example.com');
    expect(html).toContain('Preventivo Servizi Ambientali');
    expect(html).toContain('Comune di Assoro');
    expect(html).toContain('Riga uno');
  });

  it('escapes user-provided values to prevent HTML injection', () => {
    const html = buildContactEmailHtml({ ...data, name: '<b>hacked</b>' });
    expect(html).not.toContain('<b>hacked</b>');
    expect(html).toContain('&lt;b&gt;hacked&lt;/b&gt;');
  });

  it('uses the brand forest color in the header', () => {
    expect(buildContactEmailHtml(data)).toContain('#162C1B');
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test`
Expected: FAIL — `Cannot find module '../../src/lib/email-template'`.

- [ ] **Step 3: Implement the template module**

Create `butto-srl/src/lib/email-template.ts`:

```ts
import type { ContactFormData } from './contact-validation';

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function row(label: string, value: string): string {
  return `
    <tr>
      <td style="padding:10px 16px;border-bottom:1px solid #E7E2D8;font-family:Arial,sans-serif;font-size:13px;font-weight:bold;color:#162C1B;white-space:nowrap;">${escapeHtml(label)}</td>
      <td style="padding:10px 16px;border-bottom:1px solid #E7E2D8;font-family:Arial,sans-serif;font-size:13px;color:#333333;">${escapeHtml(value)}</td>
    </tr>`;
}

export function buildContactEmailHtml(data: ContactFormData): string {
  return `
<!doctype html>
<html lang="it">
  <body style="margin:0;padding:0;background:#F4F1EA;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F4F1EA;padding:32px 0;">
      <tr>
        <td align="center">
          <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="background:#FFFFFF;border:1px solid #E7E2D8;max-width:600px;width:100%;">
            <tr>
              <td style="background:#162C1B;padding:28px 32px;">
                <p style="margin:0;font-family:Arial,sans-serif;font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#C4922A;">Buttò S.r.l.</p>
                <p style="margin:6px 0 0;font-family:Georgia,serif;font-size:20px;color:#FFFFFF;">Nuovo messaggio dal form contatti</p>
              </td>
            </tr>
            <tr>
              <td style="padding:0 0 8px;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                  ${row('Nome', data.name)}
                  ${row('Email', data.email)}
                  ${row('Azienda / Ente', data.company)}
                  ${row('Oggetto', data.subject)}
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:20px 32px 28px;">
                <p style="margin:0 0 6px;font-family:Arial,sans-serif;font-size:11px;font-weight:bold;letter-spacing:1px;text-transform:uppercase;color:#C4922A;">Messaggio</p>
                <p style="margin:0;font-family:Arial,sans-serif;font-size:14px;line-height:1.6;color:#333333;white-space:pre-wrap;">${escapeHtml(data.message)}</p>
              </td>
            </tr>
            <tr>
              <td style="padding:16px 32px;background:#F4F1EA;border-top:1px solid #E7E2D8;">
                <p style="margin:0;font-family:Arial,sans-serif;font-size:11px;color:#8A8577;">Rispondi a questa email per contattare direttamente il mittente.</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test`
Expected: PASS — all tests in both `tests/lib/contact-validation.test.ts` and `tests/lib/email-template.test.ts` passing.

- [ ] **Step 5: Commit**

```bash
git add butto-srl/src/lib/email-template.ts butto-srl/tests/lib/email-template.test.ts
git commit -m "feat: add branded HTML email template for contact form"
```

---

### Task 3: Switch Astro to hybrid output with the Vercel adapter

**Files:**
- Modify: `butto-srl/astro.config.mjs`
- Modify: `butto-srl/package.json` (new dependency)

**Interfaces:**
- Consumes: nothing new.
- Produces (used by Task 4): `output: 'hybrid'` build mode + `@astrojs/vercel/serverless` adapter active, so any page/route with `export const prerender = false` runs as a Node serverless function on Vercel; everything else still prerenders.

- [ ] **Step 1: Install the Vercel adapter**

Run: `npm install @astrojs/vercel@^7.8.2`

(Pin the 7.x line specifically — `@astrojs/vercel` v8+ requires Astro ^5, but this project is pinned to Astro ^4.16. Only 7.x declares `peerDependencies: { astro: "^4.2.0" }`. Verify before installing: `npm view @astrojs/vercel@7.8.2 peerDependencies` should print `{ astro: '^4.2.0' }`.)

- [ ] **Step 2: Update the Astro config**

Note: the live `butto-srl/astro.config.mjs` has diverged from what this plan originally assumed — it now also imports and registers `@astrojs/sitemap` (`sitemap()`), added outside this plan (uncommitted, in-progress work already present in the working tree; `@astrojs/sitemap` is also already in `package.json` dependencies). `public/robots.txt` references the sitemap it generates. That integration is unrelated to this feature and must be preserved — do not drop it. Layer hybrid output + the Vercel adapter on top of the current file instead of replacing it wholesale. If the live file differs from the snippet below in some other way not anticipated here, stop and ask rather than guessing which parts to keep.

Modify `butto-srl/astro.config.mjs` to end up as:

```js
import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';
import sitemap from '@astrojs/sitemap';
import vercel from '@astrojs/vercel/serverless';

export default defineConfig({
  integrations: [tailwind(), sitemap()],
  site: 'https://butto-srl.it',
  output: 'hybrid',
  adapter: vercel(),
});
```

- [ ] **Step 3: Verify the build still succeeds**

Run: `npm run build`
Expected: build completes successfully (exit code 0), output now includes a `.vercel/output` directory alongside the usual `dist/` prerendered pages. No route has opted out of prerendering yet, so behavior is unchanged — this step only confirms the adapter is wired correctly.

- [ ] **Step 4: Commit**

```bash
git add butto-srl/astro.config.mjs butto-srl/package.json butto-srl/package-lock.json
git commit -m "build: switch to hybrid output with the Vercel serverless adapter"
```

---

### Task 4: Contact API route (validation + template + send)

**Files:**
- Create: `butto-srl/src/pages/api/contact.ts`
- Modify: `butto-srl/src/env.d.ts` (typed env vars)
- Create: `butto-srl/.env.example`
- Modify: `butto-srl/package.json` (new dependency)
- Modify: `.gitignore` (repo root)

**Interfaces:**
- Consumes:
  - `validateContactSubmission(payload): ValidationResult` and `ContactFormData` from Task 1.
  - `buildContactEmailHtml(data): string` from Task 2.
  - `output: 'hybrid'` + Vercel adapter from Task 3.
- Produces (used by Task 5): `POST /api/contact` accepting JSON body `{ name, email, subject, company, message, privacy, website }`, responding `200 { ok: true }` on success (including the silent honeypot case), `400 { ok: false, error: string }` on invalid input, `500 { ok: false, error: string }` on send failure. Requires environment variables `GMAIL_USER` and `GMAIL_APP_PASSWORD`.

- [ ] **Step 1: Install Nodemailer**

Run: `npm install nodemailer` then `npm install -D @types/nodemailer`

- [ ] **Step 2: Add typed env vars**

Modify `butto-srl/src/env.d.ts` — replace the whole file:

```ts
/// <reference path="../.astro/types.d.ts" />

interface ImportMetaEnv {
  readonly GMAIL_USER: string;
  readonly GMAIL_APP_PASSWORD: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
```

- [ ] **Step 3: Add the env var documentation file**

Create `butto-srl/.env.example`:

```
GMAIL_USER=buttosrl@gmail.com
GMAIL_APP_PASSWORD=
```

- [ ] **Step 4: Ignore the local env file**

Modify `.gitignore` (repo root) — append one line (exact filename only, no wildcard, so it can never match `.env.example`):

```
butto-srl/node_modules
.claude
./stitch_carmelo_butt_srl
butto-srl/.env
```

- [ ] **Step 5: Implement the API route**

Create `butto-srl/src/pages/api/contact.ts`:

```ts
import type { APIRoute } from 'astro';
import nodemailer from 'nodemailer';
import { validateContactSubmission } from '../../lib/contact-validation';
import { buildContactEmailHtml } from '../../lib/email-template';

export const prerender = false;

function jsonResponse(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

export const POST: APIRoute = async ({ request }) => {
  let payload: Record<string, unknown>;
  try {
    payload = await request.json();
  } catch {
    return jsonResponse({ ok: false, error: 'Richiesta non valida.' }, 400);
  }

  const result = validateContactSubmission(payload);

  if (result.kind === 'honeypot') {
    return jsonResponse({ ok: true }, 200);
  }

  if (result.kind === 'invalid') {
    return jsonResponse({ ok: false, error: result.error }, 400);
  }

  const gmailUser = import.meta.env.GMAIL_USER;
  const gmailAppPassword = import.meta.env.GMAIL_APP_PASSWORD;

  if (!gmailUser || !gmailAppPassword) {
    console.error('contact api: missing GMAIL_USER/GMAIL_APP_PASSWORD env vars');
    return jsonResponse(
      { ok: false, error: 'Errore di configurazione server. Scrivi a buttosrl@gmail.com direttamente.' },
      500
    );
  }

  const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    auth: { user: gmailUser, pass: gmailAppPassword },
  });

  try {
    await transporter.sendMail({
      from: `Sito Buttò S.r.l. <${gmailUser}>`,
      to: 'buttosrl@gmail.com',
      replyTo: result.data.email,
      subject: `Nuovo contatto sito — ${result.data.subject}`,
      html: buildContactEmailHtml(result.data),
    });
  } catch (err) {
    console.error('contact api: send failed', err);
    return jsonResponse(
      { ok: false, error: 'Invio non riuscito. Riprova o scrivi a buttosrl@gmail.com direttamente.' },
      500
    );
  }

  return jsonResponse({ ok: true }, 200);
};
```

- [ ] **Step 6: Manual verification — set up local credentials**

Enable 2-Step Verification on the Google account for `buttosrl@gmail.com` (Google Account → Security), then create an App Password (Google Account → Security → App passwords → generate one for "Mail"). Create `butto-srl/.env` (not committed):

```
GMAIL_USER=buttosrl@gmail.com
GMAIL_APP_PASSWORD=<the 16-character app password, no spaces>
```

- [ ] **Step 7: Manual verification — hit the endpoint directly**

Start the dev server in the background: `npm run dev` (from `butto-srl/`).

Then, in PowerShell:

```powershell
Invoke-RestMethod -Uri http://localhost:4321/api/contact -Method Post -ContentType "application/json" -Body '{"name":"Test Utente","email":"test@example.com","subject":"Prova","company":"","message":"Messaggio di prova dal piano di implementazione.","privacy":true,"website":""}'
```

Expected: response `{ ok: True }` and a real email arrives at `buttosrl@gmail.com` within a minute, with subject `Nuovo contatto sito — Prova`, branded HTML body, and Reply-To set to `test@example.com`.

Then verify the honeypot path — same command with `"website":"http://spam.example"` — expected: `{ ok: True }` response, but no email arrives.

Then verify validation — same command with `"email":"not-an-email"` — expected: HTTP 400, body `{ ok: False, error: "Inserisci un indirizzo email valido." }`.

- [ ] **Step 8: Configure the same credentials on Vercel (production)**

This step only works on the Vercel dashboard (not from the terminal) — the user with access to the Vercel project must do it:

1. Open the project on vercel.com → **Settings → Environment Variables**.
2. Add `GMAIL_USER` = `buttosrl@gmail.com` (Production + Preview + Development).
3. Add `GMAIL_APP_PASSWORD` = the same 16-character App Password generated in Step 6 (Production + Preview + Development).
4. Redeploy (Vercel → Deployments → ⋯ on the latest deployment → Redeploy), since environment variable changes don't apply to already-built deployments.

Without this step the local `.env` from Step 6 makes the feature work only in local dev — the live site would still fail to send email.

- [ ] **Step 9: Commit**

```bash
git add butto-srl/package.json butto-srl/package-lock.json butto-srl/src/pages/api/contact.ts butto-srl/src/env.d.ts butto-srl/.env.example .gitignore
git commit -m "feat: send contact form submissions to buttosrl@gmail.com via Gmail SMTP"
```

---

### Task 5: Wire the form UI (honeypot, status, i18n, fetch submit)

**Files:**
- Modify: `butto-srl/src/i18n/translations.ts` (add `sending`/`success`/`error` under `contatti.form`, both `it` and `en`)
- Modify: `butto-srl/src/pages/contatti.astro` (honeypot field, ids, status element, submit script)

**Interfaces:**
- Consumes: `POST /api/contact` contract from Task 4 (request field names, `{ ok, error? }` response shape).
- Produces: nothing consumed by later tasks — this is the last functional piece; Task 6 only verifies it end-to-end.

- [ ] **Step 1: Add IT translation keys**

Modify `butto-srl/src/i18n/translations.ts` — in the `it.contatti.form` block, change:

```ts
        privacy: 'Acconsento al trattamento dei dati personali ai sensi del',
        submit: 'Invia Messaggio',
        temi: [
```

to:

```ts
        privacy: 'Acconsento al trattamento dei dati personali ai sensi del',
        submit: 'Invia Messaggio',
        sending: 'Invio in corso…',
        success: 'Messaggio inviato! Ti risponderemo entro 24 ore lavorative.',
        error: 'Invio non riuscito. Riprova o scrivi a buttosrl@gmail.com.',
        temi: [
```

- [ ] **Step 2: Add EN translation keys**

In the same file, in the `en.contatti.form` block, change:

```ts
        privacy: 'I consent to the processing of personal data pursuant to the',
        submit: 'Send Message',
        temi: [
```

to:

```ts
        privacy: 'I consent to the processing of personal data pursuant to the',
        submit: 'Send Message',
        sending: 'Sending…',
        success: 'Message sent! We will reply within 24 working hours.',
        error: 'Sending failed. Please try again or email buttosrl@gmail.com.',
        temi: [
```

- [ ] **Step 3: Add an id to the form and a honeypot field**

Modify `butto-srl/src/pages/contatti.astro` — change:

```astro
              <form action="#" method="POST" class="space-y-6">
                <div class="grid md:grid-cols-2 gap-5">
```

to:

```astro
              <form id="contact-form" method="POST" class="space-y-6">
                <div class="absolute -left-[9999px] w-px h-px overflow-hidden" aria-hidden="true">
                  <label for="form-website">Lascia vuoto questo campo</label>
                  <input
                    id="form-website"
                    type="text"
                    name="website"
                    tabindex="-1"
                    autocomplete="off"
                  />
                </div>
                <div class="grid md:grid-cols-2 gap-5">
```

- [ ] **Step 4: Add a status element and id the submit button**

Modify the same file — change:

```astro
                <button
                  type="submit"
                  class="btn-primary w-full justify-center text-base py-5"
                >
                  <span data-i18n="contatti.form.submit">Invia Messaggio</span>
                  <i class="fa-solid fa-paper-plane text-[11px]"></i>
                </button>
              </form>
```

to:

```astro
                <div
                  id="contact-form-status"
                  role="status"
                  aria-live="polite"
                  class="hidden font-body text-sm px-4 py-3 border"
                >
                </div>

                <button
                  type="submit"
                  id="contact-form-submit"
                  class="btn-primary w-full justify-center text-base py-5"
                >
                  <span id="contact-form-submit-label" data-i18n="contatti.form.submit">Invia Messaggio</span>
                  <i class="fa-solid fa-paper-plane text-[11px]"></i>
                </button>
              </form>
```

- [ ] **Step 5: Add the submit script**

Modify the same file — right before the final `</Layout>` closing tag, add:

```astro
  <script>
    import { translations } from '../i18n/translations';

    type Lang = keyof typeof translations;

    function resolveKey(obj: any, dotPath: string): string | undefined {
      const val = dotPath.split('.').reduce((o, k) => o?.[k], obj);
      return typeof val === 'string' ? val : undefined;
    }

    function currentLang(): Lang {
      return (localStorage.getItem('lang') as Lang) || 'it';
    }

    function t(key: string): string {
      const dict = translations[currentLang()] ?? translations.it;
      return resolveKey(dict, key) ?? key;
    }

    const form = document.getElementById('contact-form') as HTMLFormElement | null;
    const statusEl = document.getElementById('contact-form-status');
    const submitLabel = document.getElementById('contact-form-submit-label');
    const submitBtn = document.getElementById('contact-form-submit') as HTMLButtonElement | null;

    function showStatus(message: string, variant: 'success' | 'error') {
      if (!statusEl) return;
      statusEl.textContent = message;
      statusEl.classList.remove('hidden', 'border-forest-soft', 'text-forest-soft', 'border-sienna', 'text-sienna');
      statusEl.classList.add(
        variant === 'success' ? 'border-forest-soft' : 'border-sienna',
        variant === 'success' ? 'text-forest-soft' : 'text-sienna'
      );
    }

    form?.addEventListener('submit', async (event) => {
      event.preventDefault();
      if (!form.reportValidity()) return;

      const formData = new FormData(form);
      const payload = {
        name: String(formData.get('name') ?? ''),
        email: String(formData.get('email') ?? ''),
        subject: String(formData.get('subject') ?? ''),
        company: String(formData.get('company') ?? ''),
        message: String(formData.get('message') ?? ''),
        privacy: formData.get('privacy') === 'on',
        website: String(formData.get('website') ?? ''),
      };

      if (submitBtn) submitBtn.disabled = true;
      if (submitLabel) {
        submitLabel.dataset.originalText = submitLabel.dataset.originalText ?? submitLabel.textContent ?? '';
        submitLabel.textContent = t('contatti.form.sending');
      }

      try {
        const res = await fetch('/api/contact', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        const json = await res.json();

        if (json.ok) {
          showStatus(t('contatti.form.success'), 'success');
          form.reset();
        } else {
          showStatus(json.error || t('contatti.form.error'), 'error');
        }
      } catch {
        showStatus(t('contatti.form.error'), 'error');
      } finally {
        if (submitBtn) submitBtn.disabled = false;
        if (submitLabel) submitLabel.textContent = submitLabel.dataset.originalText ?? 'Invia Messaggio';
      }
    });
  </script>
```

- [ ] **Step 6: Verify the build still succeeds**

Run: `npm run build`
Expected: exit code 0, no TypeScript/Astro compile errors. (Since Task 3, output goes to `butto-srl/.vercel/output/` via the Vercel adapter, not `dist/` — this step only needs the exit code, no file spot-check.)

- [ ] **Step 7: Commit**

```bash
git add butto-srl/src/i18n/translations.ts butto-srl/src/pages/contatti.astro
git commit -m "feat: submit contact form via fetch with status messaging and honeypot"
```

---

### Task 6: End-to-end manual verification

**Files:** none (verification only; fix forward in the relevant file from Tasks 1–5 if something fails, then re-run this task's steps).

**Interfaces:** none — this task consumes the fully wired feature from Tasks 1–5 and produces no new interface.

- [ ] **Step 1: Happy path in the browser**

With `butto-srl/.env` set (from Task 4) and `npm run dev` running, open `http://localhost:4321/contatti` in a browser. Fill all required fields, check the privacy checkbox, submit.
Expected: button label switches to "Invio in corso…", then a green-bordered status message "Messaggio inviato! Ti risponderemo entro 24 ore lavorative." appears, the form clears, and the branded email arrives at `buttosrl@gmail.com` within a minute.

- [ ] **Step 2: Client-side validation**

Submit the form with the Email field empty or containing `not-an-email`.
Expected: native browser validation blocks submission (no network request fires) — check the Network tab to confirm no request to `/api/contact` was made.

- [ ] **Step 3: Server-side validation (bypass the client)**

Open browser devtools → Console, on the `/contatti` page run:

```js
fetch('/api/contact', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ name: '', email: 'x@x.com', message: 'test', privacy: true, website: '' }),
}).then((r) => r.json()).then(console.log);
```

Expected: logs `{ ok: false, error: 'Il nome è obbligatorio.' }`, HTTP status 400 (check in the Network tab).

- [ ] **Step 4: Honeypot via devtools**

On `/contatti`, in devtools run `document.getElementById('form-website').value = 'i-am-a-bot'`, then submit the form normally through the UI.
Expected: UI shows the normal green success message (form thinks it worked), but no email arrives at `buttosrl@gmail.com`.

- [ ] **Step 5: SMTP failure path**

Stop the dev server. In `butto-srl/.env`, temporarily change `GMAIL_APP_PASSWORD` to an invalid value. Restart `npm run dev`, submit the form.
Expected: red-bordered status message "Invio non riuscito. Riprova o scrivi a buttosrl@gmail.com." appears; the real error (auth failure) is visible only in the terminal running `npm run dev`, not in the browser response body. Restore the correct `GMAIL_APP_PASSWORD` afterward.

- [ ] **Step 6: Full site build**

Run: `npm run build`
Expected: exit code 0. Since Task 3, the Vercel adapter is active and the build no longer writes to `dist/` at all — `dist/` is stale leftover output from before Task 3 and must not be used to verify anything. Spot-check `butto-srl/.vercel/output/static/contatti/index.html` instead (confirmed path — this is where the prerendered page actually lands) and confirm it still contains the full page markup — the rest of the site is unaffected by the new API route.

- [ ] **Step 7: Final commit (only if Step 5 required restoring a file)**

If any file was left in a temporarily-broken state from Step 5, restore it and commit:

```bash
git add butto-srl/.env.example
git status
```

`.env` itself is gitignored and never committed — confirm with `git status` that it does not appear as a tracked or staged change.
