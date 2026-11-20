"use client";
import { useState } from "react";
import { Newspaper, ExternalLink } from "lucide-react";
import { type Article } from "@/lib/domain";
import { copy, type Locale } from "@/lib/i18n";
export function News({
  articles,
  status,
  locale,
}: {
  articles: Article[];
  status: string;
  locale: Locale;
}) {
  const t = copy[locale];
  const [category, setCategory] = useState("All");
  const filtered = articles
    .filter((a) => category === "All" || a.category === category)
    .sort((a, b) =>
      category === "All"
        ? Number(b.category === "Nepal") - Number(a.category === "Nepal") ||
          b.published_at.localeCompare(a.published_at)
        : b.published_at.localeCompare(a.published_at),
    );
  return (
    <section className="news-section" id="news">
      <div className="section-heading">
        <div>
          <span className="eyebrow">
            {locale === "en" ? "MARKET READING" : "बजारका समाचार"}
          </span>
          <h2>{t.newsTitle}</h2>
          <p>{t.newsIntro}</p>
        </div>
      </div>
      <div className="category-tabs">
        {["All", "Nepal", "Gold", "Silver", "Oil", "Global Markets"].map(
          (c) => (
            <button
              key={c}
              aria-pressed={category === c}
              onClick={() => setCategory(c)}
            >
              {c === "All" ? t.all : c}
            </button>
          ),
        )}
      </div>
      {status === "failed" && (
        <p className="notice" role="status">
          {t.newsFailed}
        </p>
      )}
      {filtered.length ? (
        <div className="news-grid">
          {filtered.slice(0, 12).map((a) => (
            <article className="news-card" key={a.id}>
              <span className="eyebrow">{a.category}</span>
              <h3>
                <a href={a.url} target="_blank" rel="noopener noreferrer">
                  {a.title}
                  <ExternalLink size={14} />
                </a>
              </h3>
              <div>
                <span>{a.source_name}</span>
                <time dateTime={a.published_at}>
                  {new Intl.DateTimeFormat(
                    locale === "ne" ? "ne-NP" : "en-GB",
                    {
                      timeZone: "Asia/Kathmandu",
                      dateStyle: "medium",
                      timeStyle: "short",
                    },
                  ).format(new Date(a.published_at))}{" "}
                  NPT
                </time>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="news-empty">
          <Newspaper size={30} />
          <div>
            <h3>{t.newsEmpty}</h3>
            <p>{t.newsEmptyBody}</p>
          </div>
        </div>
      )}
    </section>
  );
}
