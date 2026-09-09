// Tests for CSV export escaping — formula-injection guard + standard CSV escaping

import { escapeCSV } from '../csv';

describe('escapeCSV', () => {
  it('returns empty string for null/undefined', () => {
    expect(escapeCSV(null)).toBe('');
    expect(escapeCSV(undefined)).toBe('');
  });

  it('passes through plain strings unchanged', () => {
    expect(escapeCSV('hello')).toBe('hello');
    expect(escapeCSV(42)).toBe('42');
  });

  it('quotes values containing commas, quotes, or newlines', () => {
    expect(escapeCSV('a,b')).toBe('"a,b"');
    expect(escapeCSV('say "hi"')).toBe('"say ""hi"""');
    expect(escapeCSV('line1\nline2')).toBe('"line1\nline2"');
  });

  it('prefixes formula-injection payloads with a single quote', () => {
    expect(escapeCSV('=cmd|"/c calc"!A1')).toBe('"\'=cmd|""/c calc""!A1"');
    expect(escapeCSV('+1+1')).toBe("'+1+1");
    expect(escapeCSV('-1+1')).toBe("'-1+1");
    expect(escapeCSV('@SUM(1,1)')).toBe('"\'@SUM(1,1)"');
  });

  it('does not treat a bare minus in the middle of a string as a formula prefix', () => {
    expect(escapeCSV('05-1234567')).toBe('05-1234567');
  });

  it('handles a business name that happens to start with = safely for Excel/Sheets', () => {
    const result = escapeCSV('=1+1');
    expect(result.startsWith("'")).toBe(true);
  });
});
