import { test } from "node:test";
import assert from "node:assert/strict";
import {
  metalsDev,
  approvedFeed,
  publicArticleUrl,
  ingestSpot,
} from "../src/lib/providers";
test("Metals.Dev adapter validates contract, licensing and timestamps", async () => {
  const oldFetch = globalThis.fetch;
  const oldKey = process.env.METALS_API_KEY,
    oldLicense = process.env.METALS_LICENSE_ACTIVE;
  try {
    delete process.env.METALS_API_KEY;
    await assert.rejects(metalsDev.latest());
    process.env.METALS_API_KEY = "TEST_ONLY";
    process.env.METALS_LICENSE_ACTIVE = "true";
    const fixture = {
      status: "success",
      currency: "USD",
      unit: "toz",
      timestamp: new Date().toISOString(),
      metals: { gold: 800, silver: 8 },
      currencies: { NPR: 0.01 },
    };
    globalThis.fetch = async () => Response.json(fixture);
    const result = await metalsDev.latest();
    assert.equal(result.gold, 800);
    assert.equal(result.currencies.NPR, 0.01);
    globalThis.fetch = async () => Response.json({ ...fixture, unit: "g" });
    await assert.rejects(metalsDev.latest());
    globalThis.fetch = async () =>
      Response.json({ ...fixture, timestamp: "2099-01-01T00:00:00Z" });
    await assert.rejects(metalsDev.latest());
    let calls = 0;
    globalThis.fetch = async () => {
      calls++;
      return new Response("", { status: 401 });
    };
    await assert.rejects(metalsDev.latest());
    assert.equal(calls, 1);
  } finally {
    globalThis.fetch = oldFetch;
    if (oldKey === undefined) delete process.env.METALS_API_KEY;
    else process.env.METALS_API_KEY = oldKey;
    if (oldLicense === undefined) delete process.env.METALS_LICENSE_ACTIVE;
    else process.env.METALS_LICENSE_ACTIVE = oldLicense;
  }
});
test("news URLs reject executable schemes and non-approved feed hosts", () => {
  process.env.NEWS_ALLOWED_HOSTS = "feeds.example.com";
  assert.equal(approvedFeed("https://feeds.example.com/rss"), true);
  assert.equal(approvedFeed("https://feeds.example.com.evil.test/rss"), false);
  assert.equal(approvedFeed("http://feeds.example.com/rss"), false);
  assert.equal(publicArticleUrl("javascript:alert(1)"), false);
  assert.equal(publicArticleUrl("https://example.com/article"), true);
  assert.equal(publicArticleUrl("https://www.eia.gov/todayinenergy/detail.php?id="), false);
  assert.equal(publicArticleUrl("https://www.eia.gov/todayinenergy/detail.php?id=68444"), true);
  delete process.env.NEWS_ALLOWED_HOSTS;
});
test("failed provider ingestion preserves the previous stored observation", async () => {
  const oldFetch = globalThis.fetch;
  const keys = [
    "SUPABASE_URL",
    "SUPABASE_SERVICE_ROLE_KEY",
    "METALS_API_KEY",
    "METALS_LICENSE_ACTIVE",
  ] as const;
  const saved = Object.fromEntries(keys.map((k) => [k, process.env[k]]));
  Object.assign(process.env, {
    SUPABASE_URL: "https://database.example.test",
    SUPABASE_SERVICE_ROLE_KEY: "TEST_ONLY",
    METALS_API_KEY: "TEST_ONLY",
    METALS_LICENSE_ACTIVE: "true",
  });
  const writes: string[] = [];
  try {
    globalThis.fetch = async (input, init) => {
      const url = String(input);
      if (init?.method && init.method !== "GET") {
        writes.push(url);
        return Response.json({});
      }
      return Response.json({
        fetched_at: "2020-01-01T00:00:00Z",
        observed_at: "2020-01-01T00:00:00Z",
      });
    };
    assert.equal(
      await ingestSpot({
        latest: async () => {
          throw new Error("Test provider unavailable");
        },
      }),
      "failed",
    );
    assert.ok(writes.some((url) => url.includes("ingestion_logs")));
    assert.ok(
      writes.every(
        (url) => !url.includes("spot_cache") && !url.includes("spot_history"),
      ),
    );
  } finally {
    globalThis.fetch = oldFetch;
    for (const key of keys) {
      if (saved[key] === undefined) delete process.env[key];
      else process.env[key] = saved[key];
    }
  }
});
