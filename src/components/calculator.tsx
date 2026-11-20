"use client";
import { useState } from "react";
import { Calculator as CalculatorIcon } from "lucide-react";
import {
  estimate,
  money,
  unitLabels,
  type Unit,
  type Metal,
  type Price,
} from "@/lib/domain";
import { copy, type Locale } from "@/lib/i18n";
export function Calculator({
  prices,
  locale,
}: {
  prices: Price[];
  locale: Locale;
}) {
  const t = copy[locale];
  const [metal, setMetal] = useState<Metal>("gold"),
    [quantity, setQuantity] = useState("1"),
    [unit, setUnit] = useState<Unit>("tola"),
    [purity, setPurity] = useState(1);
  const price = prices.find((p) => p.metal === metal),
    value =
      price && quantity !== ""
        ? estimate(price.amount, Number(quantity), unit, purity)
        : null;
  return (
    <section className="panel calculator-panel" id="calculator">
      <div className="section-heading">
        <span className="utility-icon">
          <CalculatorIcon size={22} />
        </span>
        <div>
          <h2>{t.calculator}</h2>
          <p>{t.calcIntro}</p>
        </div>
      </div>
      <div className="segmented full">
        {(["gold", "silver"] as Metal[]).map((m) => (
          <button
            key={m}
            aria-pressed={m === metal}
            onClick={() => {
              setMetal(m);
              setPurity(1);
            }}
          >
            {t[m]}
          </button>
        ))}
      </div>
      <div className="form-grid">
        <label>
          {t.quantity}
          <input
            type="number"
            min="0"
            max="1000000000"
            step="any"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
          />
        </label>
        <label>
          {t.unit}
          <select
            value={unit}
            onChange={(e) => setUnit(e.target.value as Unit)}
          >
            {Object.entries(unitLabels).map(([u, l]) => (
              <option key={u} value={u}>
                {l}
              </option>
            ))}
          </select>
        </label>
        <label className="span-2">
          {t.purity}
          <select
            value={purity}
            onChange={(e) => setPurity(Number(e.target.value))}
          >
            {(metal === "gold"
              ? [
                  [1, "24K · Fine gold"],
                  [22 / 24, "22K · Estimated"],
                  [18 / 24, "18K · Estimated"],
                ]
              : [[1, "Published silver reference"]]
            ).map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="estimate">
        <span>{t.estimate}</span>
        <output aria-live="polite">
          {value !== null ? money(value) : "—"}
        </output>
        <small>
          {price
            ? `${price.publication_date} · ${price.source_name}`
            : t.noRate}
        </small>
      </div>
      <p className="fine-print">{t.calcNote}</p>
    </section>
  );
}
