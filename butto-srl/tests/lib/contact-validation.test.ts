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
