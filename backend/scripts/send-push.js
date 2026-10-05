// Broadcast a push notification to every subscribed device.
// Usage: npm run push:send -w backend -- --title "Version 2.1.0 is here" --body "Tap to see what's new" [--url /] [--tag release]
import dotenv from "dotenv";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import { buildPushPayload, createPushService } from "../pushNotifications.js";

dotenv.config({ path: resolve(dirname(fileURLToPath(import.meta.url)), "../.env") });

const { values } = parseArgs({
  options: {
    title: { type: "string" },
    body: { type: "string", default: "" },
    url: { type: "string", default: "/" },
    tag: { type: "string" },
  },
});

const payload = buildPushPayload(values);
if (!payload) {
  console.error('Missing --title. Example: npm run push:send -w backend -- --title "Hello" --body "World"');
  process.exit(1);
}

const service = createPushService({
  supabaseUrl: (process.env.SUPABASE_URL || "").replace(/\/+$/, ""),
  serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || "",
  vapidPublicKey: process.env.VAPID_PUBLIC_KEY || "",
  vapidPrivateKey: process.env.VAPID_PRIVATE_KEY || "",
  vapidSubject: process.env.VAPID_SUBJECT || "",
});

if (!service.configured) {
  console.error("Push is not configured. Set SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY in backend/.env.");
  process.exit(1);
}

const result = await service.broadcast(payload);
console.log(`Sent ${result.sent}/${result.total} (failed ${result.failed}, expired removed ${result.removed}).`);
