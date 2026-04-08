// @ts-expect-error -- web-push has no type declarations
import webpush from "web-push";
import { getDb, initializeDatabase } from "@/lib/db";

// Generate VAPID keys inline for dev if env vars not set
function getVapidKeys() {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;

  if (publicKey && privateKey) {
    return { publicKey, privateKey };
  }

  // Dev fallback — generate deterministic keys from a fixed seed
  // In production, set NEXT_PUBLIC_VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY
  console.warn("[push] VAPID keys not set in env — generating for dev");
  const keys = webpush.generateVAPIDKeys();
  return { publicKey: keys.publicKey, privateKey: keys.privateKey };
}

let configured = false;

function ensureConfigured() {
  if (configured) return;
  const { publicKey, privateKey } = getVapidKeys();
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT || "mailto:admin@trovaar.com",
    publicKey,
    privateKey
  );
  configured = true;
}

export async function sendPushNotification(
  userId: string,
  title: string,
  message: string,
  url?: string
): Promise<void> {
  try {
    ensureConfigured();
    const db = getDb();
  await initializeDatabase();
    const subscriptions = await db
      .prepare("SELECT id, endpoint, p256dh, auth FROM push_subscriptions WHERE user_id = ?")
      .all(userId) as Array<{
        id: number;
        endpoint: string;
        p256dh: string;
        auth: string;
      }>;

    if (subscriptions.length === 0) return;

    const payload = JSON.stringify({ title, message, url: url || "/" });

    const results = await Promise.allSettled(
      subscriptions.map((sub) =>
        webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth },
          },
          payload
        )
      )
    );

    // Clean up expired/invalid subscriptions
    for (let i = 0; i < results.length; i++) {
      const result = results[i];
      if (result.status === "rejected") {
        const statusCode = (result.reason as { statusCode?: number })?.statusCode;
        if (statusCode === 404 || statusCode === 410) {
          try {
            await db.prepare("DELETE FROM push_subscriptions WHERE id = ?").run(subscriptions[i].id);
          } catch {
            // ignore cleanup errors
          }
        }
      }
    }
  } catch (err) {
    console.error("[push] sendPushNotification failed:", err);
  }
}
