// Proves the mechanism Supabase-as-IdP would use: a custom JWT provider,
// ES256, audience "authenticated" — the exact shape of a Supabase access token.
export default {
  providers: [
    {
      type: "customJwt",
      issuer: "http://127.0.0.1:4455/auth/v1",
      jwks: "http://127.0.0.1:4455/auth/v1/.well-known/jwks.json",
      algorithm: "ES256",
      applicationID: "authenticated",
    },
  ],
};
