"use node";

import { createPrivateKey, sign } from "node:crypto";
import { connect } from "node:http2";
import { v } from "convex/values";
import { internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { apnsConfig, apnsHost, apnsPayload, isDeadToken } from "./lib/apns";

/* ─────────────────────────────────────────────────────────────────────────────
   Sending a push through APNs.

   Node rather than Convex's default runtime because APNs accepts HTTP/2 only.
   Does nothing until APNS_KEY_ID, APNS_TEAM_ID, APNS_PRIVATE_KEY and
   APNS_BUNDLE_ID are set, which needs an Apple Developer membership; until
   then the in-app Notifications list and email carry everything, as before.

   A failure here never reaches the booking that caused it: this runs from the
   scheduler, after the mutation has committed.
   ───────────────────────────────────────────────────────────────────────────── */

/** The provider token APNs wants: an ES256 JWT, valid for up to an hour. */
function providerToken(config: { keyId: string; teamId: string; privateKey: string }): string {
  const encode = (value: object) => Buffer.from(JSON.stringify(value)).toString("base64url");
  const unsigned = `${encode({ alg: "ES256", kid: config.keyId })}.${encode({ iss: config.teamId, iat: Math.floor(Date.now() / 1000) })}`;
  const signature = sign("sha256", Buffer.from(unsigned), {
    key: createPrivateKey(config.privateKey),
    dsaEncoding: "ieee-p1363",
  });
  return `${unsigned}.${signature.toString("base64url")}`;
}

function send(
  host: string,
  token: string,
  headers: Record<string, string>,
  body: string,
): Promise<{ status: number; reason?: string }> {
  return new Promise((resolve, reject) => {
    const session = connect(host);
    session.on("error", reject);
    const request = session.request({ ":method": "POST", ":path": `/3/device/${token}`, ...headers });
    let status = 0;
    let data = "";
    request.on("response", (h) => {
      status = Number(h[":status"]);
    });
    request.setEncoding("utf8");
    request.on("data", (chunk) => {
      data += chunk;
    });
    request.on("end", () => {
      session.close();
      let reason: string | undefined;
      try {
        reason = data ? (JSON.parse(data) as { reason?: string }).reason : undefined;
      } catch {
        reason = undefined;
      }
      resolve({ status, reason });
    });
    request.on("error", (error) => {
      session.close();
      reject(error);
    });
    request.end(body);
  });
}

export const deliver = internalAction({
  args: { userId: v.string(), title: v.string(), body: v.string(), bookingId: v.union(v.string(), v.null()) },
  handler: async (ctx, a) => {
    const config = apnsConfig(process.env);
    if (!config) return null;

    const devices = await ctx.runQuery(internal.push.devicesFor, { userId: a.userId });
    if (devices.length === 0) return null;

    const jwt = providerToken(config);
    const body = apnsPayload({ title: a.title, body: a.body, bookingId: a.bookingId });
    const headers = {
      authorization: `bearer ${jwt}`,
      "apns-topic": config.topic,
      "apns-push-type": "alert",
      "apns-priority": "10",
    };

    await Promise.all(
      devices.map(async (device) => {
        try {
          const result = await send(apnsHost(device.environment), device.token, headers, body);
          if (isDeadToken(result.status, result.reason)) {
            await ctx.runMutation(internal.push.forgetToken, { token: device.token });
          } else if (result.status !== 200) {
            console.error("APNs refused a push", { status: result.status, reason: result.reason });
          }
        } catch (error) {
          console.error("APNs unreachable", error instanceof Error ? error.message : String(error));
        }
      }),
    );
    return null;
  },
});
