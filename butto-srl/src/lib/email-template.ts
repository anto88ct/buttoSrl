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
