export type ClassValue = string | false | null | undefined;

/** Joins class names, dropping falsy entries. */
export function cx(...parts: ClassValue[]): string {
  return parts.filter(Boolean).join(" ");
}
