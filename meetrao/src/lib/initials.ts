/** First letters of the first two words, e.g. "Faisal Rahman" → "FR". */
export function initialsOf(name: string, fallback = "?"): string {
  const letters = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0])
    .join("")
    .toUpperCase();
  return letters || fallback;
}
