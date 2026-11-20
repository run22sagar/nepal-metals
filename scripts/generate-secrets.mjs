import { randomBytes } from "node:crypto";
import { existsSync, writeFileSync } from "node:fs";
import * as webpush from "web-push";
const file = ".env.secrets.local";
if (existsSync(file))
  throw new Error("Secrets already exist; refusing to overwrite");
const vapid = webpush.generateVAPIDKeys();
writeFileSync(
  file,
  `CRON_SECRET=${randomBytes(32).toString("base64url")}\nSUBSCRIPTION_ENCRYPTION_KEY=${randomBytes(32).toString("base64")}\nVAPID_PUBLIC_KEY=${vapid.publicKey}\nVAPID_PRIVATE_KEY=${vapid.privateKey}\n`,
  { mode: 0o600 },
);
console.log(
  "Generated local ignored secrets. Import them into the hosting secret store; never commit or paste them into chat.",
);
