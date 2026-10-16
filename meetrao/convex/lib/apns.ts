/* The parts of sending a push that are just data, kept out of the Node
   action so they can be tested without a network or a key. */

export type PushMessage = { title: string; body: string; bookingId: string | null };

/** APNs host for a token's environment. A token sent to the wrong one is rejected. */
export function apnsHost(environment: "sandbox" | "production"): string {
  return environment === "sandbox" ? "https://api.sandbox.push.apple.com" : "https://api.push.apple.com";
}

/** The JSON APNs delivers. `bookingId` is what the app opens when the alert is tapped. */
export function apnsPayload(message: PushMessage): string {
  return JSON.stringify({
    aps: {
      alert: { title: message.title, body: message.body },
      sound: "default",
      // Groups every booking alert together in Notification Center.
      "thread-id": "bookings",
    },
    ...(message.bookingId ? { bookingId: message.bookingId } : {}),
  });
}

/** APNs reasons that mean the token will never work again and should be dropped. */
export function isDeadToken(status: number, reason: string | undefined): boolean {
  return status === 410 || reason === "BadDeviceToken" || reason === "Unregistered" || reason === "DeviceTokenNotForTopic";
}

/** The APNs settings, or null while push is not configured. */
export function apnsConfig(env: Record<string, string | undefined>):
  | { keyId: string; teamId: string; privateKey: string; topic: string }
  | null {
  const keyId = env.APNS_KEY_ID?.trim();
  const teamId = env.APNS_TEAM_ID?.trim();
  // Environment variables flatten newlines; the .p8 file needs them back.
  const privateKey = env.APNS_PRIVATE_KEY?.replace(/\\n/g, "\n").trim();
  const topic = env.APNS_BUNDLE_ID?.trim();
  if (!keyId || !teamId || !privateKey || !topic) return null;
  return { keyId, teamId, privateKey, topic };
}
