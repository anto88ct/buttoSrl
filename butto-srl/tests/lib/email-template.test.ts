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
