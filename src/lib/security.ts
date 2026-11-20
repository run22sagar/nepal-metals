import "server-only";
import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
  timingSafeEqual,
} from "node:crypto";
import { cookies } from "next/headers";
import { db, check } from "./db";
export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
export function siteUrl() {
  return (process.env.SITE_URL || "http://localhost:3000").replace(/\/$/, "");
}
export function hash(value: string) {
  return createHash("sha256").update(value).digest("hex");
}
export function equal(a: string, b: string) {
  const x = Buffer.from(a),
    y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}
export function requireOrigin(request: Request) {
  if (request.headers.get("origin") !== new URL(siteUrl()).origin)
    throw new HttpError(403, "Request origin rejected");
}
export async function readBody(request: Request) {
  if (!request.headers.get("content-type")?.includes("application/json"))
    throw new HttpError(415, "JSON required");
  if (Number(request.headers.get("content-length")) > 16384)
    throw new HttpError(413, "Request too large");
  const reader = request.body?.getReader();
  if (!reader) throw new HttpError(400, "Body required");
  let total = 0;
  const chunks: Uint8Array[] = [];
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.length;
    if (total > 16384) {
      await reader.cancel();
      throw new HttpError(413, "Request too large");
    }
    chunks.push(value);
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString());
  } catch {
    throw new HttpError(400, "Invalid JSON");
  }
}
export async function limit(key: string, max = 20, seconds = 3600) {
  const { data, error } = await db().rpc("consume_limit", {
    p_key: hash(key),
    p_max: max,
    p_seconds: seconds,
  });
  check(error);
  if (!data)
    throw new HttpError(429, "Too many attempts. Please try again later.");
}
export async function admin() {
  const token = (await cookies()).get("nm_admin")?.value;
  if (!token) throw new HttpError(401, "Sign in required");
  const client = db();
  const { data, error } = await client.auth.getUser(token);
  if (error || !data.user)
    throw new HttpError(401, "Session expired. Sign in again.");
  const row = await client
    .from("admin_users")
    .select("user_id")
    .eq("user_id", data.user.id)
    .maybeSingle();
  if (row.error || !row.data)
    throw new HttpError(403, "Administrator access required");
  return data.user;
}
export function requireCron(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (
    !secret ||
    secret.length < 32 ||
    !equal(request.headers.get("authorization") || "", `Bearer ${secret}`)
  )
    throw new HttpError(401, "Unauthorized");
}
function encryptionKey() {
  const key = Buffer.from(
    process.env.SUBSCRIPTION_ENCRYPTION_KEY || "",
    "base64",
  );
  if (key.length !== 32) throw new HttpError(503, "Alerts are not configured");
  return key;
}
export function encrypt(value: unknown) {
  const iv = randomBytes(12),
    cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const encrypted = Buffer.concat([
    cipher.update(JSON.stringify(value), "utf8"),
    cipher.final(),
  ]);
  return Buffer.concat([iv, cipher.getAuthTag(), encrypted]).toString("base64");
}
export function decrypt<T>(value: string): T {
  const raw = Buffer.from(value, "base64"),
    decipher = createDecipheriv(
      "aes-256-gcm",
      encryptionKey(),
      raw.subarray(0, 12),
    );
  decipher.setAuthTag(raw.subarray(12, 28));
  return JSON.parse(
    Buffer.concat([
      decipher.update(raw.subarray(28)),
      decipher.final(),
    ]).toString(),
  );
}
export function alertsReady() {
  return !!(
    process.env.VAPID_PUBLIC_KEY &&
    process.env.VAPID_PRIVATE_KEY &&
    process.env.VAPID_SUBJECT &&
    process.env.SUBSCRIPTION_ENCRYPTION_KEY
  );
}
export function pushEndpoint(url: string) {
  const u = new URL(url);
  const hosts = [
    "fcm.googleapis.com",
    "updates.push.services.mozilla.com",
    "web.push.apple.com",
    "wns.windows.com",
    "notify.windows.com",
  ];
  return (
    u.protocol === "https:" &&
    !u.username &&
    !u.password &&
    (!u.port || u.port === "443") &&
    hosts.some(
      (h) =>
        u.hostname === h ||
        (h !== "fcm.googleapis.com" && u.hostname.endsWith("." + h)),
    )
  );
}
export function errorResponse(error: unknown) {
  if (error instanceof HttpError)
    return Response.json({ error: error.message }, { status: error.status });
  if (error instanceof Error && error.name === "ZodError")
    return Response.json(
      { error: "Please check the submitted fields." },
      { status: 400 },
    );
  return Response.json(
    { error: "The service is temporarily unavailable. Please try again." },
    { status: 503 },
  );
}
