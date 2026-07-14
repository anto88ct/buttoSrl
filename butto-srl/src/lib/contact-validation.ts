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
