import { describe, expect, it } from 'vitest';
import {
  ACCEPT_ATTRIBUTE,
  MAX_SIZE_MB,
  TYPE_ERROR,
  formatBytes,
  hasAcceptedType,
  validateResume,
} from './validateResume';

const MB = 1024 * 1024;

const makeFile = (name: string, type: string, sizeBytes = 1024): File => {
  const file = new File(['x'], name, { type });
  Object.defineProperty(file, 'size', { value: sizeBytes });
  return file;
};

describe('formatBytes', () => {
  it('scales to the largest fitting unit', () => {
    expect(formatBytes(512)).toBe('512 B');
    expect(formatBytes(200 * 1024)).toBe('200 KB');
    expect(formatBytes(8.2 * MB)).toBe('8.2 MB');
  });
});

describe('hasAcceptedType', () => {
  it.each(['resume.pdf', 'resume.doc', 'resume.docx'])('accepts %s', (name) => {
    expect(hasAcceptedType(makeFile(name, ''))).toBe(true);
  });

  it('is case-insensitive about the extension', () => {
    expect(hasAcceptedType(makeFile('RESUME.PDF', ''))).toBe(true);
  });

  it('does not confuse .docx with .doc', () => {
    // Both are accepted, but via their own rules rather than a prefix match.
    expect(hasAcceptedType(makeFile('resume.docx', ''))).toBe(true);
    expect(hasAcceptedType(makeFile('resume.docx.exe', ''))).toBe(false);
  });

  it('falls back to MIME type when there is no extension', () => {
    expect(hasAcceptedType(makeFile('resume', 'application/pdf'))).toBe(true);
  });

  it.each(['resume.exe', 'resume.png', 'resume.txt', 'resume'])('rejects %s', (name) => {
    expect(hasAcceptedType(makeFile(name, 'application/octet-stream'))).toBe(false);
  });
});

describe('validateResume', () => {
  it('returns null for a valid resume', () => {
    expect(validateResume(makeFile('resume.pdf', 'application/pdf', 200 * 1024))).toBeNull();
  });

  it('rejects a disallowed type with the type error', () => {
    const file = makeFile('virus.exe', 'application/x-msdownload', 1024);
    expect(validateResume(file)).toBe(TYPE_ERROR);
  });

  it('reports the type error when a file fails both checks', () => {
    // A 40MB .exe is oversized too, but type is checked first.
    const file = makeFile('virus.exe', 'application/x-msdownload', 40 * MB);
    expect(validateResume(file)).toBe(TYPE_ERROR);
  });

  it('rejects an oversized file with a message naming size and limit', () => {
    const file = makeFile('resume.pdf', 'application/pdf', 8.2 * MB);
    expect(validateResume(file)).toBe('resume.pdf is 8.2 MB. The maximum size is 5 MB.');
  });

  it('allows a file exactly at the limit', () => {
    const file = makeFile('resume.pdf', 'application/pdf', MAX_SIZE_MB * MB);
    expect(validateResume(file)).toBeNull();
  });

  it('rejects a file one byte over the limit', () => {
    const file = makeFile('resume.pdf', 'application/pdf', MAX_SIZE_MB * MB + 1);
    expect(validateResume(file)).toMatch(/maximum size is 5 MB/);
  });
});

describe('ACCEPT_ATTRIBUTE', () => {
  it('lists both extensions and MIME types for the native picker', () => {
    expect(ACCEPT_ATTRIBUTE).toContain('.pdf');
    expect(ACCEPT_ATTRIBUTE).toContain('.docx');
    expect(ACCEPT_ATTRIBUTE).toContain('application/pdf');
  });
});
