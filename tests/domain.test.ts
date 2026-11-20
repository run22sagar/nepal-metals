import { test } from "node:test";
import assert from "node:assert/strict";
import {
  convert,
  estimate,
  nepalDate,
  nepalHour,
  dailyEligible,
  priceState,
  movement,
  spotPrice,
  type Price,
  type Spot,
} from "../src/lib/domain";
const price = (metal: "gold" | "silver", date: string): Price => ({
  id: metal,
  metal,
  amount: 1000,
  publication_date: date,
  published_at: date + "T10:00:00+05:45",
  fetched_at: date + "T10:01:00+05:45",
  source_name: "TEST FIXTURE ONLY",
  source_url: "https://www.fenegosida.org/",
  purity: "test",
  revision: 1,
  verification_status: "verified",
});
test("exact weight conversions round-trip without early rounding", () => {
  assert.ok(Math.abs(convert(31.1034768, "toz", "gram") - 1) < 1e-12);
  assert.equal(convert(1, "gram", "tola"), 11.6638038);
  assert.ok(
    Math.abs(convert(convert(123456, "tola", "toz"), "toz", "tola") - 123456) <
      1e-8,
  );
});
test("a troy ounce and a tola have the expected ratio", () => {
  assert.ok(Math.abs(convert(800, "toz", "tola") - 300) < 1e-9);
});
test("quantity and purity estimates reject invalid inputs", () => {
  assert.equal(estimate(2400, 2, "tola", 22 / 24), 4400);
  assert.equal(estimate(100, 0, "gram"), 0);
  assert.equal(estimate(100, -1, "gram"), null);
  assert.equal(estimate(100, NaN, "gram"), null);
  assert.equal(estimate(100, 1, "gram", 1.1), null);
});
test("Nepal date rolls at 18:15 UTC, independent of US DST", () => {
  assert.equal(nepalDate(new Date("2026-11-01T18:14:59Z")), "2026-11-01");
  assert.equal(nepalDate(new Date("2026-11-01T18:15:00Z")), "2026-11-02");
  assert.equal(nepalHour(new Date("2026-03-08T03:15:00Z")), 9);
});
test("daily alerts wait for 9 AM AND all selected current-day publications", () => {
  const rows = [price("gold", "2026-11-20"), price("silver", "2026-11-19")];
  assert.equal(
    dailyEligible(rows, ["gold"], new Date("2026-11-20T03:14:59Z")),
    false,
  );
  assert.equal(
    dailyEligible(rows, ["gold"], new Date("2026-11-20T03:15:00Z")),
    true,
  );
  assert.equal(
    dailyEligible(rows, ["gold", "silver"], new Date("2026-11-20T06:00:00Z")),
    false,
  );
  assert.equal(
    dailyEligible(
      [...rows, price("silver", "2026-11-20")],
      ["gold", "silver"],
      new Date("2026-11-20T06:00:00Z"),
    ),
    true,
  );
});
test("stale rates are never classified as current", () => {
  const now = new Date("2026-11-20T06:00:00Z");
  assert.equal(priceState(undefined, now), "unavailable");
  assert.equal(priceState(price("gold", "2026-11-19"), now), "stale");
  assert.equal(priceState(price("gold", "2026-11-20"), now), "published");
});
test("movement uses the previous publication denominator", () => {
  assert.deepEqual(movement(110, 100), { amount: 10, percent: 10 });
  assert.equal(movement(110), null);
  assert.deepEqual(movement(90, 100), { amount: -10, percent: -10 });
});
test("provider FX conversion uses USD per local unit, not its inverse", () => {
  const spot: Spot = {
    id: "latest",
    observed_at: "2026-11-20T00:00:00Z",
    fetched_at: "2026-11-20T00:00:00Z",
    gold: 800,
    silver: 8,
    currencies: { NPR: 1 / 100, AED: 1 / 4 },
    provider: "TEST FIXTURE ONLY",
  };
  assert.ok(Math.abs(spotPrice(spot, "gold", "NPR", "tola")! - 30000) < 1e-8);
  assert.equal(spotPrice(spot, "gold", "AED", "toz"), 3200);
  assert.equal(spotPrice(spot, "silver", "USD", "toz"), 8);
  assert.equal(spotPrice(spot, "gold", "XYZ", "toz"), null);
});
