import "server-only";
import { z } from "zod";
import { db, check } from "./db";
import { nepalDate } from "./domain";
import { log } from "./providers";

const endpoint = "https://api.fenegosida.org/api/website/v1/Dashboard/today";
const rowsSchema = z.array(z.object({
  todayDate: z.string().datetime({ offset: true }),
  yestardayDate: z.string().datetime({ offset: true }),
  rateType: z.string(),
  todayBaseRatePerGram: z.number().positive().finite(),
  yestardayBaseRatePerGram: z.number().positive().finite(),
}));

export async function fetchNepalRates() {
  let response: Response | undefined;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      response = await fetch(endpoint, { cache: "no-store", redirect: "error", signal: AbortSignal.timeout(10000) });
    } catch { response = undefined; }
    if (response?.ok || (response && response.status < 500 && response.status !== 429)) break;
    if (attempt < 2) await new Promise(resolve => setTimeout(resolve, 500 * 2 ** attempt));
  }
  if (!response?.ok) throw new Error("Nepal source unavailable");
  const rows = rowsSchema.parse(await response.json());
  const result = [];
  for (const metal of ["gold", "silver"] as const) {
    const matches = rows.filter(row => row.rateType.includes(metal === "gold" ? "छापावाल सुन" : "असली चाँदी") && row.rateType.includes("१ तोला"));
    if (matches.length !== 1) throw new Error("Ambiguous Nepal source units");
    const row = matches[0];
    for (const [amount, publishedAt] of [[row.yestardayBaseRatePerGram, row.yestardayDate], [row.todayBaseRatePerGram, row.todayDate]] as const) {
      if (Date.parse(publishedAt) > Date.now()) throw new Error("Future Nepal publication");
      result.push({ metal, amount, publishedAt, date: nepalDate(new Date(publishedAt)) });
    }
  }
  return result;
}

export async function ingestNepal() {
  if (process.env.NEPAL_SOURCE_PERMISSION_CONFIRMED !== "true" || !process.env.NEPAL_INGEST_ACTOR_ID)
    return "permission_required";
  try {
    const records = await fetchNepalRates();
    for (const record of records) {
      const result = await db().rpc("publish_nepal_rate", {
        p_actor: process.env.NEPAL_INGEST_ACTOR_ID,
        p_metal: record.metal, p_amount: record.amount,
        p_publication_date: record.date, p_published_at: record.publishedAt,
        p_source_url: "https://www.fenegosida.org/",
        p_reason: "Authorized FENEGOSIDA public JSON publication; exact tola row and source timestamp. Endpoint: " + endpoint,
      });
      check(result.error);
    }
    await log("FENEGOSIDA", "success", "Verified current and previous publications processed; unchanged records deduplicated");
    return "updated";
  } catch {
    await log("FENEGOSIDA", "failed", "Source retrieval or validation failed; previous verified prices retained");
    return "failed";
  }
}
