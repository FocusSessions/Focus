const LABEL_MAX = 50;
const NAME_MAX = 80;

export function sanitizeLabel(raw: string): string {
  return raw
    .replace(/[\x00-\x1f\x7f]/g, "")
    .trim()
    .slice(0, LABEL_MAX);
}

export function sanitizeFileName(raw: string): string {
  const base = raw.replace(/[/\\?%*:|"<>]/g, "").trim();
  return base.slice(0, NAME_MAX) || "Untitled track";
}

export function isValidAudioMime(mime: string): boolean {
  return ["audio/mpeg", "audio/ogg", "audio/wav", "audio/mp3"].includes(mime);
}

export const MAX_UPLOAD_BYTES = 20 * 1024 * 1024;
