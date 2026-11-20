"use client";
import { useState } from "react";
import { Globe2 } from "lucide-react";
import {
  countries,
  convert,
  spotPrice,
  money,
  unitLabels,
  type Metal,
  type Unit,
  type Price,
  type Spot,
} from "@/lib/domain";
import { copy, type Locale } from "@/lib/i18n";
export function Comparison({
  prices,
  spot,
  locale,
  selectedCountry,
}: {
  prices: Price[];
  spot: Spot | null;
  locale: Locale;
  selectedCountry?: string;
}) {
  const t = copy[locale];
  const [metal, setMetal] = useState<Metal>("gold"),
    [unit, setUnit] = useState<Unit>("tola"),
    [currency, setCurrency] = useState("local");
  const nepal = prices.find((p) => p.metal === metal),
    stale = spot
      ? Date.now() - Date.parse(spot.observed_at) > 2 * 3600000
      : false;
  return (
    <section className="panel comparison-panel" id="compare">
      <div className="section-heading">
        <div>
          <span className="eyebrow">
            <Globe2 size={14} />{" "}
            {locale === "en" ? "NEPAL & THE WORLD" : "नेपाल र विश्व"}
          </span>
          <h2>{t.world}</h2>
          <p>{t.worldIntro}</p>
        </div>
      </div>
      <div className="comparison-controls">
        <div className="segmented">
          {(["gold", "silver"] as Metal[]).map((m) => (
            <button
              key={m}
              aria-pressed={metal === m}
              onClick={() => setMetal(m)}
            >
              {t[m]}
            </button>
          ))}
        </div>
        <label>
          <span className="sr-only">Currency</span>
          <select
            value={currency}
            onChange={(e) => setCurrency(e.target.value)}
          >
            <option value="local">Local currency</option>
            {countries.map((c) => (
              <option key={c.currency}>{c.currency}</option>
            ))}
          </select>
        </label>
        <label>
          <span className="sr-only">Unit</span>
          <select
            value={unit}
            onChange={(e) => setUnit(e.target.value as Unit)}
          >
            {Object.entries(unitLabels).map(([u, l]) => (
              <option key={u} value={u}>
                Per {l}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>{t.country}</th>
              <th>
                {t.rate} / {unitLabels[unit]}
              </th>
              <th>{t.basis}</th>
              <th>{t.publishedAt}</th>
            </tr>
          </thead>
          <tbody>
            {countries.map((c) => {
              const target = currency === "local" ? c.currency : currency;
              let value: number | null = null;
              if (c.code === "NP" && nepal) {
                const npr = convert(nepal.amount, "tola", unit);
                value =
                  target === "NPR"
                    ? npr
                    : spot?.currencies.NPR &&
                        (target === "USD" || spot.currencies[target])
                      ? (npr * spot.currencies.NPR) /
                        (target === "USD" ? 1 : spot.currencies[target])
                      : null;
              } else if (c.code !== "NP" && spot)
                value = spotPrice(spot, metal, target, unit);
              return (
                <tr
                  key={c.code}
                  className={`${c.code === "NP" ? "nepal-row" : ""} ${c.slug === selectedCountry ? "selected-country" : ""}`}
                >
                  <td>
                    <span className="flag">{c.flag}</span>
                    <strong>{c.name}</strong>
                    <small>
                      {metal === "gold" ? "24K · Fine gold" : "Silver"} ·{" "}
                      {target}
                    </small>
                  </td>
                  <td className="numeric">
                    {value === null ? (
                      <span className="muted">{t.unavailable}</span>
                    ) : (
                      money(value, target)
                    )}
                  </td>
                  <td>
                    <span
                      className={`basis-tag ${c.code === "NP" ? "reference-tag" : ""}`}
                    >
                      {c.code === "NP"
                        ? target === "NPR"
                          ? t.official
                          : `${t.official} · FX converted`
                        : t.indicative}
                    </span>
                  </td>
                  <td className="timestamp">
                    {c.code === "NP"
                      ? nepal?.publication_date || "—"
                      : spot
                        ? `${new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Kathmandu", dateStyle: "short", timeStyle: "short" }).format(new Date(spot.observed_at))} NPT${stale ? " · Delayed" : ""}`
                        : "—"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="fine-print">
        {locale === "en"
          ? "International rows convert one global spot reference into each currency. They are not official local retail rates and exclude duties, taxes, dealer premiums and making charges. Nepal conversions use the separately published Nepal reference."
          : "अन्तर्राष्ट्रिय पङ्क्तिमा एउटै विश्व स्पट मूल्यलाई मुद्रामा रूपान्तरण गरिन्छ। यी स्थानीय आधिकारिक खुद्रा मूल्य होइनन्। कर, शुल्क, पसलको नाफा र ज्याला समावेश छैन।"}
        {spot && ` Source: ${spot.provider}.`}
      </p>
    </section>
  );
}
