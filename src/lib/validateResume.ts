const BYTES_PER_MB = 1024 * 1024;

export const MAX_SIZE_MB = 5;

export const ACCEPTED_EXTENSIONS = ['.pdf', '.doc', '.docx'] as const;

export const ACCEPTED_MIME_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
] as const;

/** Value for the file input's `accept` attribute, so the native picker filters too. */
export const ACCEPT_ATTRIBUTE = [...ACCEPTED_EXTENSIONS, ...ACCEPTED_MIME_TYPES].join(',');

export const TYPE_ERROR = `Only PDF, DOC, or DOCX files under ${MAX_SIZE_MB}MB are allowed.`;

/** Renders a byte count as a short human-readable string, e.g. `"200 KB"`. */
export function formatBytes(bytes: number): string {
  const units = ['B', 'KB', 'MB', 'GB'];
  let value = bytes;
  let unit = 0;

  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }

  const rounded = value < 10 && unit > 0 ? value.toFixed(1) : Math.round(value).toString();
  return `${rounded} ${units[unit]}`;
}

/**
 * Extension is the primary signal — browsers report an empty or inconsistent
 * MIME type for .doc/.docx often enough that it can't be trusted alone. MIME is
 * the fallback for files that arrive without an extension.
 */
export function hasAcceptedType(file: File): boolean {
  const name = file.name.toLowerCase();
  const byExtension = ACCEPTED_EXTENSIONS.some((extension) => name.endsWith(extension));
  const byMimeType = ACCEPTED_MIME_TYPES.some((mime) => mime === file.type.toLowerCase());
  return byExtension || byMimeType;
}

export function exceedsSizeLimit(file: File): boolean {
  return file.size > MAX_SIZE_MB * BYTES_PER_MB;
}

/**
 * Returns a human-readable reason the file is unacceptable, or `null` if it
 * passes. Type is checked first, so a file failing both reports the type error.
 */
export function validateResume(file: File): string | null {
  if (!hasAcceptedType(file)) {
    return TYPE_ERROR;
  }
  if (exceedsSizeLimit(file)) {
    return `${file.name} is ${formatBytes(file.size)}. The maximum size is ${MAX_SIZE_MB} MB.`;
  }
  return null;
}
