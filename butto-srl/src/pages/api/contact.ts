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
