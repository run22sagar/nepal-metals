"use client";
import { useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { ChartNoAxesCombined, CalendarDays } from "lucide-react";
import { money, nepalDate, type Metal, type Price } from "@/lib/domain";
import { copy, type Locale } from "@/lib/i18n";
const PriceChart = dynamic(() => import("./price-chart"), {
  ssr: false,
  loading: () => (
    <div className="chart-loading" role="status">
      Loading chart…
    </div>
  ),
});
export function History({
  records,
  locale,
  initialMetal = "gold",
}: {
  records: Price[];
  locale: Locale;
  initialMetal?: Metal;
}) {
  const t = copy[locale];
  const [metal, setMetal] = useState<Metal>(initialMetal),
    [range, setRange] = useState(30),
    [sort, setSort] = useState("desc"),
    [from, setFrom] = useState(""),
    [to, setTo] = useState(""),
    [page, setPage] = useState(0);
  const [older, setOlder] = useState<Price[]>([]),
    [loading, setLoading] = useState(false),
    [loadError, setLoadError] = useState("");
  async function selectRange(n: number) {
    setRange(n);
    setPage(0);
    if (n !== 0 || records.length < 1000 || older.length || loading) return;
    setLoading(true);
    setLoadError("");
    try {
      let last = records.at(-1)!;
      const all: Price[] = [];
      while (true) {
        const response = await fetch(
          "/api/history?" +
            new URLSearchParams({
              before_date: last.publication_date,
              before_id: last.id,
            }),
          { cache: "no-store" },
        );
        if (!response.ok)
          throw new Error("Could not load older records. Select All to retry.");
        const data = await response.json();
        all.push(...data.records);
        if (!data.next) break;
        last = { ...last, publication_date: data.next.date, id: data.next.id };
      }
      setOlder(all);
    } catch (error) {
      setLoadError((error as Error).message);
    } finally {
      setLoading(false);
    }
  }
  const filtered = useMemo(() => {
    const cutoff = range
      ? nepalDate(new Date(Date.now() - (range - 1) * 86400000))
      : "";
    return [...new Map([...older, ...records].map((p) => [p.id, p])).values()]
      .filter(
        (p) =>
          p.metal === metal &&
          (!cutoff || p.publication_date >= cutoff) &&
          (!from || p.publication_date >= from) &&
          (!to || p.publication_date <= to),
      )
      .sort((a, b) => a.publication_date.localeCompare(b.publication_date));
  }, [records, older, metal, range, from, to]);
  const rows = sort === "desc" ? [...filtered].reverse() : filtered;
  return (
    <section className="panel history-panel" id="history">
      <div className="section-heading">
        <div>
          <span className="eyebrow">
            {locale === "en" ? "THE PRICE OVER TIME" : "समयसँगै मूल्य"}
          </span>
          <h2>{t.historyTitle}</h2>
          <p>{t.historyIntro}</p>
        </div>
        <div className="segmented" aria-label="Metal">
          {(["gold", "silver"] as Metal[]).map((m) => (
            <button
              key={m}
              aria-pressed={metal === m}
              onClick={() => {
                setMetal(m);
                setPage(0);
              }}
            >
              {t[m]}
            </button>
          ))}
        </div>
      </div>
      <div className="chart-toolbar">
        <span className="chart-unit">
          NPR / {locale === "en" ? "tola" : "तोला"}
        </span>
        <div className="range-tabs">
          {[7, 30, 90, 365, 0].map((n) => (
            <button
              key={n}
              aria-pressed={range === n}
              onClick={() => selectRange(n)}
            >
              {n === 0 ? t.all : n === 365 ? "1Y" : `${n}D`}
            </button>
          ))}
        </div>
      </div>
      {loading && <p role="status">Loading all verified history…</p>}
      {loadError && (
        <p className="notice" role="alert">
          {loadError}
        </p>
      )}
      {filtered.length ? (
        <PriceChart records={filtered} metal={metal} />
      ) : (
        <div className="empty-chart">
          <div className="empty-icon">
            <ChartNoAxesCombined size={31} />
          </div>
          <h3>{t.historyEmpty}</h3>
          <p>{t.historyEmptyBody}</p>
        </div>
      )}
      <div className="history-filters">
        <h3>
          <CalendarDays size={17} />
          {t.table}
        </h3>
        <div>
          <label>
            {t.from}
            <input
              type="date"
              value={from}
              onChange={(e) => {
                setFrom(e.target.value);
                setPage(0);
              }}
            />
          </label>
          <label>
            {t.to}
            <input
              type="date"
              value={to}
              min={from}
              onChange={(e) => {
                setTo(e.target.value);
                setPage(0);
              }}
            />
          </label>
          <label className="sort-label">
            {t.sort}
            <select
              value={sort}
              onChange={(e) => {
                setSort(e.target.value);
                setPage(0);
              }}
            >
              <option value="desc">{t.newest}</option>
              <option value="asc">{t.oldest}</option>
            </select>
          </label>
        </div>
      </div>
      <div className="table-scroll">
        <table>
          <caption className="sr-only">{t.table}</caption>
          <thead>
            <tr>
              <th>{t.date}</th>
              <th>{t[metal]} / tola</th>
              <th>{t.tenGrams}</th>
              <th>{t.source}</th>
            </tr>
          </thead>
          <tbody>
            {rows.slice(page * 10, (page + 1) * 10).map((p) => (
              <tr key={p.id}>
                <td>
                  <time dateTime={p.publication_date}>
                    {p.publication_date}
                  </time>
                </td>
                <td className="numeric">{money(p.amount)}</td>
                <td className="numeric">
                  {money((p.amount / 11.6638038) * 10)}
                </td>
                <td>
                  <a
                    href={p.source_url}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {p.source_name}
                  </a>
                </td>
              </tr>
            ))}
            {!rows.length && (
              <tr>
                <td colSpan={4} className="empty-row">
                  {locale === "en"
                    ? "No verified records in this date range."
                    : "यस अवधिमा प्रमाणित अभिलेख छैन।"}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {rows.length > 10 && (
        <div className="pagination">
          <button disabled={page === 0} onClick={() => setPage((p) => p - 1)}>
            Previous
          </button>
          <span>
            {page + 1} / {Math.ceil(rows.length / 10)}
          </span>
          <button
            disabled={(page + 1) * 10 >= rows.length}
            onClick={() => setPage((p) => p + 1)}
          >
            Next
          </button>
        </div>
      )}
      <p className="fine-print">
        {locale === "en"
          ? "Calendar days without publications remain gaps. Select All to load the complete available verified history."
          : "प्रकाशन नभएका दिनमा खाली ठाउँ रहन्छ। सबै प्रमाणित इतिहास हेर्न सबै छान्नुहोस्।"}
      </p>
    </section>
  );
}
