import "server-only";
import { z } from "zod";
import Parser from "rss-parser";
import { db, check } from "./db";
import type { Spot } from "./domain";
export interface MetalsProvider {
  latest(): Promise<Omit<Spot, "id">>;
}
const positive = z.number().finite().positive();
const responseSchema = z.object({
  status: z.literal("success"),
  currency: z.literal("USD"),
  unit: z.literal("toz"),
  timestamp: z.string().datetime({ offset: true }),
  metals: z.object({ gold: positive, silver: positive }),
  currencies: z.record(z.string(), positive),
});
export const metalsDev: MetalsProvider = {
  async latest() {
    if (
      !process.env.METALS_API_KEY ||
      process.env.METALS_LICENSE_ACTIVE !== "true"
    )
      throw new Error("Metals provider inactive");
    const url = new URL("https://api.metals.dev/v1/latest");
    url.search = new URLSearchParams({
      api_key: process.env.METALS_API_KEY,
      currency: "USD",
      unit: "toz",
    }).toString();
    // No URLs or upstream exceptions are logged: query parameters contain a secret.
    let response: Response | undefined;
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        response = await fetch(url, {
          cache: "no-store",
          signal: AbortSignal.timeout(10000),
          redirect: "error",
        });
      } catch {
        response = undefined;
      }
      if (
        response?.ok ||
        (response && response.status < 500 && response.status !== 429)
      )
        break;
      if (attempt < 2)
        await new Promise((r) => setTimeout(r, 250 * 2 ** attempt));
    }
    if (!response?.ok) throw new Error("Metals provider request failed");
    const parsed = responseSchema.parse(await response.json());
    const age = Date.now() - Date.parse(parsed.timestamp);
    if (age < -300000 || age > 7 * 86400000)
      throw new Error("Metals provider timestamp rejected");
    return {
      observed_at: parsed.timestamp,
      fetched_at: new Date().toISOString(),
      gold: parsed.metals.gold,
      silver: parsed.metals.silver,
      currencies: parsed.currencies,
      provider: "Metals.Dev",
    };
  },
};
export async function log(source: string, status: string, message: string) {
  const { error } = await db()
    .from("ingestion_logs")
    .insert({ source, status, message });
  check(error);
}
export async function ingestSpot(provider: MetalsProvider = metalsDev) {
  if (
    process.env.METALS_LICENSE_ACTIVE !== "true" ||
    !process.env.METALS_API_KEY
  )
    return "unconfigured";
  const client = db();
  const current = await client
    .from("spot_cache")
    .select("fetched_at,observed_at")
    .eq("id", "latest")
    .maybeSingle();
  check(current.error);
  const ttl = Math.max(300, Number(process.env.METALS_CACHE_SECONDS) || 1800);
  if (
    current.data &&
    Date.now() - Date.parse(current.data.fetched_at) < ttl * 1000
  )
    return "cached";
  try {
    const spot = await provider.latest();
    if (
      current.data &&
      Date.parse(spot.observed_at) < Date.parse(current.data.observed_at)
    )
      throw new Error("Timestamp regression");
    const result = await client
      .from("spot_cache")
      .upsert({ id: "latest", ...spot });
    check(result.error);
    if (process.env.METALS_HISTORY_ALLOWED === "true") {
      const { fetched_at: _fetchedAt, ...history } = spot;
      void _fetchedAt;
      check(
        (
          await client
            .from("spot_history")
            .upsert(history, {
              onConflict: "observed_at",
              ignoreDuplicates: true,
            })
        ).error,
      );
    }
    await log("Metals.Dev", "success", "Spot observation stored");
    return "updated";
  } catch {
    await log(
      "Metals.Dev",
      "failed",
      "Fetch or validation failed; previous observation preserved",
    );
    return "failed";
  }
}
export function approvedFeed(url: string) {
  const u = new URL(url);
  const allowed = (process.env.NEWS_ALLOWED_HOSTS || "")
    .split(",")
    .map((h) => h.trim().toLowerCase())
    .filter(Boolean);
  return (
    u.protocol === "https:" &&
    !u.username &&
    !u.password &&
    !u.port &&
    allowed.includes(u.hostname) &&
    !/^(localhost|127\.|10\.|192\.168\.|169\.254\.|\[)/.test(u.hostname)
  );
}
export function publicArticleUrl(value: string) {
  try {
    const u = new URL(value);
    // EIA occasionally emits a detail link without its article ID. Exclude
    // these broken source links instead of guessing which article was meant.
    if (
      ["www.eia.gov", "eia.gov"].includes(u.hostname) &&
      u.pathname === "/todayinenergy/detail.php" &&
      !/^\d+$/.test(u.searchParams.get("id") || "")
    ) return false;
    return (
      ["http:", "https:"].includes(u.protocol) && !u.username && !u.password
    );
  } catch {
    return false;
  }
}
export async function ingestNews() {
  const client = db();
  const sources = await client
    .from("news_sources")
    .select("*")
    .eq("enabled", true);
  check(sources.error);
  const parser = new Parser();
  let successes = 0;
  for (const source of sources.data || []) {
    if (
      source.last_checked_at &&
      Date.now() - Date.parse(source.last_checked_at) < 1800000
    )
      continue;
    try {
      if (
        !approvedFeed(source.url) ||
        !source.permission_note ||
        !source.terms_url
      )
        throw new Error("Permission required");
      const response = await fetch(source.url, {
        signal: AbortSignal.timeout(10000),
        redirect: "error",
        cache: "no-store",
        headers: { "User-Agent": "NepalMetals/1.0 RSS reader" },
      });
      if (!response.ok) throw new Error("RSS failed");
      const reader = response.body?.getReader();
      if (!reader) throw new Error("No feed");
      let size = 0;
      const chunks: Uint8Array[] = [];
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        size += value.length;
        if (size > 2000000) {
          await reader.cancel();
          throw new Error("Feed too large");
        }
        chunks.push(value);
      }
      const feed = await parser.parseString(
        Buffer.concat(chunks).toString("utf8"),
      );
      const articles = feed.items
        .slice(0, 100)
        .filter(
          (item) =>
            item.title &&
            item.link &&
            publicArticleUrl(item.link) &&
            item.isoDate &&
            Number.isFinite(Date.parse(item.isoDate)) &&
            Date.parse(item.isoDate) <= Date.now() + 300000,
        )
        .filter((item) =>
          source.category !== "Global Markets"
            ? /gold|silver|oil|metal|सुन|चाँदी|चाँदी|तेल/i.test(item.title || "")
            : true,
        )
        .map((item) => ({
          source_id: source.id,
          source_name: source.name,
          title: item.title!.replace(/<[^>]*>/g, "").slice(0, 500),
          url: item.link!,
          published_at: new Date(item.isoDate!).toISOString(),
          category: source.category,
          enabled: true,
        }));
      if (articles.length)
        check(
          (
            await client
              .from("news_articles")
              .upsert(articles, { onConflict: "url" })
          ).error,
        );
      check(
        (
          await client
            .from("news_sources")
            .update({
              last_status: "success",
              last_checked_at: new Date().toISOString(),
            })
            .eq("id", source.id)
        ).error,
      );
      await log(
        source.name,
        "success",
        `${articles.length} headlines processed`,
      );
      successes++;
    } catch {
      check(
        (
          await client
            .from("news_sources")
            .update({
              last_status: "failed",
              last_checked_at: new Date().toISOString(),
            })
            .eq("id", source.id)
        ).error,
      );
      await log(
        source.name,
        "failed",
        "Feed retrieval failed; previous headlines retained",
      );
    }
  }
  return { configured: sources.data?.length || 0, updated: successes };
}
