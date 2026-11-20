import { test } from "node:test";
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import {
  encrypt,
  decrypt,
  pushEndpoint,
  requireOrigin,
  readBody,
  equal,
} from "../src/lib/security";
test("subscription encryption is randomized and rejects ciphertext tampering", () => {
  process.env.SUBSCRIPTION_ENCRYPTION_KEY = randomBytes(32).toString("base64");
  const data = { endpoint: "test-only", keys: { auth: "test" } };
  const a = encrypt(data),
    b = encrypt(data);
  assert.notEqual(a, b);
  assert.deepEqual(decrypt(a), data);
  const bytes = Buffer.from(a, "base64");
  bytes[30] ^= 1;
  assert.throws(() => decrypt(bytes.toString("base64")));
  delete process.env.SUBSCRIPTION_ENCRYPTION_KEY;
});
test("push endpoints are restricted to known HTTPS transports", () => {
  assert.equal(pushEndpoint("https://fcm.googleapis.com/fcm/send/test"), true);
  assert.equal(pushEndpoint("https://web.push.apple.com/test"), true);
  assert.equal(pushEndpoint("http://fcm.googleapis.com/test"), false);
  assert.equal(
    pushEndpoint("https://fcm.googleapis.com.evil.test/test"),
    false,
  );
  assert.equal(pushEndpoint("https://127.0.0.1/"), false);
  assert.equal(pushEndpoint("https://fcm.googleapis.com:8443/test"), false);
  assert.equal(
    pushEndpoint("https://user:password@fcm.googleapis.com/test"),
    false,
  );
});
test("mutation origins and secret equality fail closed", () => {
  process.env.SITE_URL = "https://example.test";
  assert.throws(() =>
    requireOrigin(
      new Request("https://example.test/api", {
        headers: { origin: "https://evil.test" },
      }),
    ),
  );
  assert.doesNotThrow(() =>
    requireOrigin(
      new Request("https://example.test/api", {
        headers: { origin: "https://example.test" },
      }),
    ),
  );
  assert.equal(equal("secret", "secret"), true);
  assert.equal(equal("secret", "short"), false);
  delete process.env.SITE_URL;
});
test("JSON body reader limits actual streamed bytes and rejects malformed input", async () => {
  await assert.rejects(
    readBody(
      new Request("https://example.test", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: "x".repeat(17000),
      }),
    ),
  );
  await assert.rejects(
    readBody(
      new Request("https://example.test", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: "invalid",
      }),
    ),
  );
  assert.deepEqual(
    await readBody(
      new Request("https://example.test", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: '{"valid":true}',
      }),
    ),
    { valid: true },
  );
});
