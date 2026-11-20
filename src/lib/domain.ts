export const GRAMS = {
  tola: 11.6638038,
  gram: 1,
  "10g": 10,
  toz: 31.1034768,
} as const;
export type Unit = keyof typeof GRAMS;
export type Metal = "gold" | "silver";
export const unitLabels: Record<Unit, string> = {
  tola: "tola",
  gram: "gram",
  "10g": "10 grams",
  toz: "troy ounce",
};
export const countries = [
  { slug: "nepal", code: "NP", name: "Nepal", currency: "NPR", flag: "🇳🇵" },
  { slug: "india", code: "IN", name: "India", currency: "INR", flag: "🇮🇳" },
  {
    slug: "united-states",
    code: "US",
    name: "United States",
    currency: "USD",
    flag: "🇺🇸",
  },
  {
    slug: "uae",
    code: "AE",
    name: "United Arab Emirates",
    currency: "AED",
    flag: "🇦🇪",
  },
  {
    slug: "saudi-arabia",
    code: "SA",
    name: "Saudi Arabia",
    currency: "SAR",
    flag: "🇸🇦",
  },
  { slug: "qatar", code: "QA", name: "Qatar", currency: "QAR", flag: "🇶🇦" },
  {
    slug: "united-kingdom",
    code: "GB",
    name: "United Kingdom",
    currency: "GBP",
    flag: "🇬🇧",
  },
  { slug: "canada", code: "CA", name: "Canada", currency: "CAD", flag: "🇨🇦" },
  {
    slug: "australia",
    code: "AU",
    name: "Australia",
    currency: "AUD",
    flag: "🇦🇺",
  },
] as const;
export type Price = {
  id: string;
  metal: Metal;
  amount: number;
  publication_date: string;
  published_at: string;
  fetched_at: string;
  source_name: string;
  source_url: string;
  verification_status: "verified";
  purity: string;
  revision: number;
};
export type Spot = {
  id: string;
  observed_at: string;
  fetched_at: string;
  gold: number;
  silver: number;
  currencies: Record<string, number>;
  provider: string;
};
export type Article = {
  id: string;
  title: string;
  url: string;
  source_name: string;
  published_at: string;
  category: string;
};
export function nepalDate(now = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kathmandu",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}
export function nepalHour(now = new Date()) {
  return Number(
    new Intl.DateTimeFormat("en-GB", {
      timeZone: "Asia/Kathmandu",
      hour: "2-digit",
      hourCycle: "h23",
    }).format(now),
  );
}
export function money(value: number, currency = "NPR", locale = "en-NP") {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(value);
}
export function convert(value: number, from: Unit, to: Unit) {
  return from === to ? value : (value / GRAMS[from]) * GRAMS[to];
}
export function estimate(
  rate: number,
  quantity: number,
  unit: Unit,
  purity = 1,
) {
  if (
    !Number.isFinite(quantity) ||
    quantity < 0 ||
    quantity > 1e9 ||
    !Number.isFinite(purity) ||
    purity <= 0 ||
    purity > 1
  )
    return null;
  return convert(rate, "tola", unit) * quantity * purity;
}
export function movement(current: number, previous?: number) {
  return previous && previous > 0
    ? {
        amount: current - previous,
        percent: ((current - previous) / previous) * 100,
      }
    : null;
}
export function priceState(price?: Price, now = new Date()) {
  if (!price) return "unavailable";
  return price.publication_date === nepalDate(now) ? "published" : "stale";
}
// Metals.Dev currencies express USD per unit of foreign currency, NOT units per USD.
export function spotPrice(
  spot: Spot,
  metal: Metal,
  currency: string,
  unit: Unit,
) {
  const usdPerCurrency = currency === "USD" ? 1 : spot.currencies[currency];
  return usdPerCurrency > 0
    ? convert(spot[metal] / usdPerCurrency, "toz", unit)
    : null;
}
export function dailyEligible(
  prices: Price[],
  metals: Metal[],
  now = new Date(),
  hour = 9,
) {
  return (
    nepalHour(now) >= hour &&
    metals.every((metal) =>
      prices.some(
        (p) => p.metal === metal && p.publication_date === nepalDate(now),
      ),
    )
  );
}
