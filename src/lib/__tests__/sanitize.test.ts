import { describe, it, expect } from 'vitest';
import {
  sanitizeLabel,
  sanitizeFileName,
  isValidAudioMime,
  MAX_UPLOAD_BYTES,
} from '@/lib/sanitize';

describe('sanitizeLabel', () => {
  it('trims whitespace', () => {
    expect(sanitizeLabel('  hello  ')).toBe('hello');
  });

  it('strips control characters', () => {
    expect(sanitizeLabel('line\x00one\x1ftwo')).toBe('lineonetwo');
  });

  it('enforces 50-character maximum', () => {
    const long = 'a'.repeat(100);
    expect(sanitizeLabel(long)).toHaveLength(50);
  });

  it('handles empty string', () => {
    expect(sanitizeLabel('')).toBe('');
  });

  it('preserves normal unicode characters', () => {
    expect(sanitizeLabel('日本語テスト')).toBe('日本語テスト');
  });
});

describe('sanitizeFileName', () => {
  it('strips forbidden path characters', () => {
    expect(sanitizeFileName('file/with\\bad?chars')).toBe('filewithbadchars');
  });

  it('strips all dangerous path chars', () => {
    const input = 'a/b\\c?d%e*f:g|h"i<j>k';
    const result = sanitizeFileName(input);
    expect(result).not.toMatch(/[/\\?%*:|"<>]/);
  });

  it('trims whitespace', () => {
    expect(sanitizeFileName('  mytrack  ')).toBe('mytrack');
  });

  it('falls back to "Untitled track" for empty input', () => {
    expect(sanitizeFileName('')).toBe('Untitled track');
  });

  it('falls back to "Untitled track" when only forbidden chars', () => {
    expect(sanitizeFileName('///???***')).toBe('Untitled track');
  });

  it('enforces 80-character maximum', () => {
    const long = 'b'.repeat(200);
    expect(sanitizeFileName(long)).toHaveLength(80);
  });
});

describe('isValidAudioMime', () => {
  it.each([
    'audio/mpeg',
    'audio/ogg',
    'audio/wav',
    'audio/mp3',
  ])('accepts valid MIME type: %s', (mime) => {
    expect(isValidAudioMime(mime)).toBe(true);
  });

  it.each([
    'audio/aac',
    'video/mp4',
    'application/json',
    'text/plain',
    '',
  ])('rejects invalid MIME type: %s', (mime) => {
    expect(isValidAudioMime(mime)).toBe(false);
  });
});

describe('MAX_UPLOAD_BYTES', () => {
  it('is exactly 20 MB', () => {
    expect(MAX_UPLOAD_BYTES).toBe(20 * 1024 * 1024);
  });
});
