/** Postgres generated these with gen_random_uuid(). Same shape, same length. */
export function uuid(): string {
  return crypto.randomUUID();
}

/** bookings.reference was `encode(gen_random_bytes(16), 'hex')`, 32 hex chars. */
export function reference(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}
