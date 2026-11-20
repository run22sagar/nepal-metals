import assert from "node:assert/strict";
const base = process.env.TEST_SITE_URL || "http://localhost:3000";
let checks = 0;
async function get(path, status = 200) {
  const response = await fetch(base + path);
  assert.equal(response.status, status, `${path} HTTP status`);
  checks++;
  return response;
}
for (const path of [
  "/",
  "/gold-price-in-nepal",
  "/silver-price-in-nepal",
  "/gold-price-history",
  "/silver-price-history",
  "/gold-price/india",
  "/gold-price/uae",
  "/compare",
  "/news",
  "/ne",
  "/ne/silver-price-in-nepal",
  "/privacy",
  "/methodology",
]) {
  const response = await get(path);
  const html = await response.text();
  assert.match(html, /<h1/);
  assert.match(html, /<link rel="canonical"/);
  assert.match(html, /application\/ld\+json/);
  assert.ok(!html.includes("SUPABASE_SERVICE_ROLE_KEY"));
  assert.equal(response.headers.get("x-content-type-options"), "nosniff");
  if (path === "/")
    assert.match(
      html,
      /Awaiting a verified rate|Published today|Latest available/,
    );
  if (path === "/ne") assert.match(html, /<html lang="ne"/);
}
assert.match(await (await get("/robots.txt")).text(), /Disallow: \/admin/);
assert.match(await (await get("/sitemap.xml")).text(), /gold-price\/india/);
const manifest = await (await get("/manifest.webmanifest")).json();
assert.equal(manifest.display, "standalone");
for (const icon of manifest.icons) await get(icon.src);
await get("/sw.js");
await get("/offline.html");
await get("/definitely-not-a-page", 404);
const cron = await fetch(base + "/api/cron");
assert.equal(cron.status, 401);
checks++;
const crossOrigin = await fetch(base + "/api/admin/prices", {
  method: "POST",
  headers: {
    origin: "https://evil.example",
    "content-type": "application/json",
  },
  body: "{}",
});
assert.equal(crossOrigin.status, 403);
checks++;
const unauthorized = await fetch(base + "/api/admin/prices", {
  method: "POST",
  headers: { origin: base, "content-type": "application/json" },
  body: "{}",
});
assert.equal(unauthorized.status, 401);
checks++;
const admin = await (await get("/admin")).text();
assert.match(admin, /noindex/);
assert.ok(!admin.includes("encrypted_subscription"));
console.log(
  `${checks} HTTP/SSR route checks passed. No browser push delivery is implied.`,
);
