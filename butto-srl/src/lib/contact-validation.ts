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

export function validateContactSubmission(payload: unknown): ValidationResult {
  if (typeof payload !== 'object' || payload === null) {
    return { kind: 'invalid', error: 'Richiesta non valida.' };
  }

  const data = payload as ContactFormPayload;

  if (asTrimmedString(data.website) !== '') {
    return { kind: 'honeypot' };
  }

  const name = asTrimmedString(data.name);
  if (!name) {
    return { kind: 'invalid', error: 'Il nome è obbligatorio.' };
  }

  const email = asTrimmedString(data.email);
  if (!EMAIL_PATTERN.test(email)) {
    return { kind: 'invalid', error: 'Inserisci un indirizzo email valido.' };
  }

  const message = asTrimmedString(data.message);
  if (!message) {
    return { kind: 'invalid', error: 'Il messaggio è obbligatorio.' };
  }

  if (data.privacy !== true) {
    return { kind: 'invalid', error: 'Devi accettare il trattamento dei dati personali.' };
  }

  return {
    kind: 'valid',
    data: {
      name,
      email,
      message,
      subject: asTrimmedString(data.subject) || 'Non specificato',
      company: asTrimmedString(data.company) || 'Non specificata',
    },
  };
}
