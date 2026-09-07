/**
 * `server-only` has no resolvable entry outside a Next build — it exists to
 * fail a *client* bundle that imports a server module. Under vitest there is no
 * such bundle, so it is aliased to this empty module rather than removed from
 * the source, which would lose the guard where it actually does something.
 */
export {};
