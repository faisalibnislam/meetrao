// A stand-in for Supabase's /auth/v1 issuer: ES256 keypair + JWKS endpoint.
import { createServer } from "node:http";
import { generateKeyPair, exportJWK, SignJWT } from "jose";
import { writeFileSync } from "node:fs";

const { publicKey, privateKey } = await generateKeyPair("ES256", { extractable: true });
const jwk = await exportJWK(publicKey);
jwk.kid = "spike-key"; jwk.alg = "ES256"; jwk.use = "sig";

const ISS = "http://127.0.0.1:4455/auth/v1";

// Mint tokens with the claim shape Supabase actually issues.
async function mint({ sub, email, aud = "authenticated", expSeconds = 3600 }) {
  return new SignJWT({ email, role: "authenticated", aal: "aal1" })
    .setProtectedHeader({ alg: "ES256", kid: "spike-key", typ: "JWT" })
    .setIssuer(ISS).setAudience(aud).setSubject(sub)
    .setIssuedAt().setExpirationTime(`${expSeconds}s`)
    .sign(privateKey);
}

const tokens = {
  valid:      await mint({ sub: "11111111-1111-1111-1111-111111111111", email: "host@example.com" }),
  wrongAud:   await mint({ sub: "22222222-2222-2222-2222-222222222222", email: "x@example.com", aud: "anon" }),
  expired:    await mint({ sub: "33333333-3333-3333-3333-333333333333", email: "y@example.com", expSeconds: -60 }),
};
writeFileSync("tokens.json", JSON.stringify(tokens, null, 2));

createServer((req, res) => {
  if (req.url === "/auth/v1/.well-known/jwks.json") {
    res.writeHead(200, { "content-type": "application/json" });
    return res.end(JSON.stringify({ keys: [jwk] }));
  }
  res.writeHead(404).end();
}).listen(4455, "127.0.0.1", () => console.log("issuer up on 4455"));
