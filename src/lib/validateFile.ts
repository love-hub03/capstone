const BYTES_PER_MB = 1024 * 1024;

export interface FileConstraints {
  /** Comma-separated list of extensions and MIME types, e.g. `"image/*,.pdf"`. */
  accept?: string;
  /** Maximum size per file, in megabytes. */
  maxSizeMb?: number;
}

/** Renders a byte count as a short human-readable string, e.g. `"2.4 MB"`. */
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

/** Tests a file against one entry of an `accept` list. */
function matchesRule(file: File, rule: string): boolean {
  const type = file.type.toLowerCase();

  if (rule.startsWith('.')) {
    return file.name.toLowerCase().endsWith(rule);
  }
  if (rule.endsWith('/*')) {
    return type.startsWith(rule.slice(0, -1));
  }
  return type === rule;
}

/** Tests a file against a full comma-separated `accept` list. An empty list allows everything. */
export function matchesAccept(file: File, accept?: string): boolean {
  const rules = (accept ?? '')
    .split(',')
    .map((rule) => rule.trim().toLowerCase())
    .filter(Boolean);

  return rules.length === 0 || rules.some((rule) => matchesRule(file, rule));
}

/** Returns a human-readable reason the file is unacceptable, or `null` if it passes. */
export function validateFile(file: File, constraints: FileConstraints = {}): string | null {
  const { accept, maxSizeMb } = constraints;

  if (!matchesAccept(file, accept)) {
    return `File type not allowed. Accepted: ${accept}`;
  }
  if (maxSizeMb !== undefined && file.size > maxSizeMb * BYTES_PER_MB) {
    return `File is too large (${formatBytes(file.size)}). Maximum is ${maxSizeMb} MB.`;
  }
  return null;
}
