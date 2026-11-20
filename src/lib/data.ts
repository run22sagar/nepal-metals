import "server-only";
import { cache } from "react";
import { unstable_cache } from "next/cache";
import { db, databaseReady, check } from "./db";
import type { Price, Spot, Article } from "./domain";
const publicPriceFields =
  "id,metal,amount,publication_date,published_at,fetched_at,source_name,source_url,verification_status,purity,revision";
function publicPrices(rows: Price[]): Price[] {
  return rows.map((p) => ({
    id: p.id,
    metal: p.metal,
    amount: Number(p.amount),
    publication_date: p.publication_date,
    published_at: p.published_at,
    fetched_at: p.fetched_at,
    source_name: p.source_name,
    source_url: p.source_url,
    verification_status: p.verification_status,
    purity: p.purity,
    revision: p.revision,
  }));
}
const cachedMarket =
  unstable_cache(
    async () => {
      const empty = {
        prices: [] as Price[],
        history: [] as Price[],
        spot: null as Spot | null,
        articles: [] as Article[],
        newsStatus: "unconfigured",
        status: "unconfigured",
      };
      if (!databaseReady()) return empty;
      try {
        const client = db();
        const [prices, history, spot, articles, sources] = await Promise.all([
          client.rpc("latest_nepal_rates", undefined, { get: true }),
          client
            .from("price_observations")
            .select(publicPriceFields)
            .eq("verification_status", "verified")
            .order("publication_date", { ascending: false })
            .order("id", { ascending: false })
            .limit(1000),
          process.env.METALS_LICENSE_ACTIVE === "true"
            ? client
                .from("spot_cache")
                .select("*")
                .eq("id", "latest")
                .maybeSingle()
            : Promise.resolve({ data: null, error: null }),
          client
            .from("news_articles")
            .select("id,title,url,source_name,published_at,category")
            .eq("enabled", true)
            .order("published_at", { ascending: false })
            .limit(60),
          client.from("news_sources").select("last_status").eq("enabled", true),
        ]);
        check(prices.error);
        check(history.error);
        return {
          prices: publicPrices((prices.data ?? []) as Price[]),
          history: publicPrices((history.data ?? []) as Price[]),
          spot: spot.error ? null : (spot.data as Spot | null),
          articles: (articles.data ?? []) as Article[],
          status: "ready",
          newsStatus:
            articles.error || sources.error
              ? "failed"
              : !sources.data?.length
                ? "unconfigured"
                : sources.data.some((s) => s.last_status === "failed")
                  ? "failed"
                  : "ready",
        };
      } catch {
        // Throw so a transient failure cannot replace the last good cache entry.
        throw new Error("Market data temporarily unavailable");
      }
    },
    [
      "public-market-v2",
      process.env.SUPABASE_URL || "unconfigured",
      process.env.METALS_LICENSE_ACTIVE || "false",
    ],
    { revalidate: 60, tags: ["public-market"] },
  );
export const readMarket = cache(async () => {
  try { return await cachedMarket(); }
  catch { return { prices: [] as Price[], history: [] as Price[], spot: null as Spot | null, articles: [] as Article[], newsStatus: "failed", status: "failed" }; }
});
