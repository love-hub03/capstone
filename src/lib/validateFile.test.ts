import { describe, expect, it } from 'vitest';
import { formatBytes, matchesAccept, validateFile } from './validateFile';

const makeFile = (name: string, type: string, sizeBytes = 0): File => {
  const file = new File(['x'], name, { type });
  Object.defineProperty(file, 'size', { value: sizeBytes });
  return file;
};

describe('formatBytes', () => {
  it('scales to the largest fitting unit', () => {
    expect(formatBytes(512)).toBe('512 B');
    expect(formatBytes(2048)).toBe('2.0 KB');
    expect(formatBytes(5 * 1024 * 1024)).toBe('5.0 MB');
  });
});

describe('matchesAccept', () => {
  it('allows anything when no accept list is given', () => {
    expect(matchesAccept(makeFile('a.exe', 'application/octet-stream'))).toBe(true);
  });

  it('matches wildcard MIME types', () => {
    expect(matchesAccept(makeFile('a.png', 'image/png'), 'image/*')).toBe(true);
    expect(matchesAccept(makeFile('a.txt', 'text/plain'), 'image/*')).toBe(false);
  });

  it('matches extensions case-insensitively', () => {
    expect(matchesAccept(makeFile('report.PDF', ''), '.pdf')).toBe(true);
  });

  it('accepts a file matching any rule in the list', () => {
    expect(matchesAccept(makeFile('a.pdf', 'application/pdf'), 'image/*,.pdf')).toBe(true);
  });
});

describe('validateFile', () => {
  it('returns null for a file that passes every constraint', () => {
    const file = makeFile('photo.png', 'image/png', 1024);
    expect(validateFile(file, { accept: 'image/*', maxSizeMb: 1 })).toBeNull();
  });

  it('rejects a disallowed type', () => {
    const file = makeFile('notes.txt', 'text/plain', 10);
    expect(validateFile(file, { accept: 'image/*' })).toMatch(/not allowed/i);
  });

  it('rejects a file over the size limit', () => {
    const file = makeFile('big.png', 'image/png', 3 * 1024 * 1024);
    expect(validateFile(file, { maxSizeMb: 2 })).toMatch(/too large/i);
  });

  it('allows a file exactly at the size limit', () => {
    const file = makeFile('exact.png', 'image/png', 2 * 1024 * 1024);
    expect(validateFile(file, { maxSizeMb: 2 })).toBeNull();
  });
});
