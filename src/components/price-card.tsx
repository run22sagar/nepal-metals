import { Clock3, ShieldCheck, TrendingDown, TrendingUp } from "lucide-react";
import {
  convert,
  money,
  movement,
  priceState,
  type Price,
  type Metal,
} from "@/lib/domain";
import { copy, type Locale } from "@/lib/i18n";
export function PriceCard({
  metal,
  records,
  locale,
}: {
  metal: Metal;
  records: Price[];
  locale: Locale;
}) {
  const t = copy[locale],
    rows = records.filter((p) => p.metal === metal),
    price = rows[0],
    state = priceState(price),
    change = price ? movement(price.amount, rows[1]?.amount) : null;
  return (
    <article className={`price-card ${metal}`}>
      <div className="price-card-top">
        <div className="metal-label">
          <span className="element-symbol">
            {metal === "gold" ? "Au" : "Ag"}
            <small>{metal === "gold" ? "79" : "47"}</small>
          </span>
          <div>
            <h2>{t[metal]}</h2>
            <p>
              {metal === "gold"
                ? "Fine gold · 24K"
                : locale === "en"
                  ? "Silver reference"
                  : "चाँदीको सन्दर्भ"}
            </p>
          </div>
        </div>
        <span className={`badge ${state === "published" ? "badge-green" : ""}`}>
          <Clock3 size={13} />
          {state === "published"
            ? t.published
            : state === "stale"
              ? t.stale
              : locale === "en"
                ? "Not published"
                : "प्रकाशित छैन"}
        </span>
      </div>
      <div className="price-main">
        <span className="label">{t.perTola}</span>
        {price ? (
          <strong>
            {money(price.amount, "NPR", locale === "ne" ? "ne-NP" : "en-NP")}
          </strong>
        ) : (
          <>
            <strong className="price-empty">—</strong>
            <p>{t.pending}</p>
          </>
        )}
      </div>
      <div className="price-details">
        <div>
          <span>{t.tenGrams}</span>
          <b>{price ? money(convert(price.amount, "tola", "10g")) : "—"}</b>
        </div>
        <div
          className={
            change ? (change.amount >= 0 ? "positive" : "negative") : ""
          }
        >
          {change ? (
            <>
              <span>{t.change}</span>
              <b>
                {change.amount >= 0 ? (
                  <TrendingUp size={16} />
                ) : (
                  <TrendingDown size={16} />
                )}{" "}
                {change.amount >= 0 ? "+" : ""}
                {money(change.amount)}{" "}
                <small>({change.percent.toFixed(2)}%)</small>
              </b>
            </>
          ) : (
            <span>{price ? t.noChange : t.pendingDetail}</span>
          )}
        </div>
      </div>
      <div className="source-line">
        <ShieldCheck size={15} />
        {price ? (
          <div>
            <a
              href={price.source_url}
              target="_blank"
              rel="noopener noreferrer"
            >
              {price.source_name}
            </a>
            <span>
              {" "}
              · {t.publishedAt}{" "}
              <time dateTime={price.published_at}>
                {new Intl.DateTimeFormat(locale === "ne" ? "ne-NP" : "en-GB", {
                  timeZone: "Asia/Kathmandu",
                  dateStyle: "medium",
                  timeStyle: "short",
                }).format(new Date(price.published_at))}{" "}
                NPT
              </time>
            </span>
            <small>
              {t.recorded}:{" "}
              {new Intl.DateTimeFormat("en-GB", {
                timeZone: "Asia/Kathmandu",
                dateStyle: "medium",
                timeStyle: "short",
              }).format(new Date(price.fetched_at))}{" "}
              NPT · {locale === "en" ? "Manually verified" : "म्यानुअल प्रमाणित"}
            </small>
          </div>
        ) : (
          <span>
            {locale === "en"
              ? "Source publication will be linked with each verified rate."
              : "प्रमाणित मूल्यसँग स्रोत प्रकाशनको लिङ्क देखाइनेछ।"}
          </span>
        )}
      </div>
    </article>
  );
}
