"use client";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import { money, type Price, type Metal } from "@/lib/domain";
export default function PriceChart({
  records,
  metal,
}: {
  records: Price[];
  metal: Metal;
}) {
  // Insert explicit null points for missing calendar dates; never interpolate across them.
  const data: { date: string; price: number | null }[] = [];
  records.forEach((p, i) => {
    if (
      i &&
      Date.parse(p.publication_date) -
        Date.parse(records[i - 1].publication_date) >
        86400000
    )
      data.push({
        date: new Date(Date.parse(records[i - 1].publication_date) + 86400000)
          .toISOString()
          .slice(0, 10),
        price: null,
      });
    data.push({ date: p.publication_date, price: Number(p.amount) });
  });
  return (
    <div
      className="chart"
      role="img"
      aria-label={`${metal} prices in NPR per tola. Exact values are available in the table below.`}
    >
      <ResponsiveContainer width="100%" height={280}>
        <LineChart
          data={data}
          margin={{ top: 15, right: 15, bottom: 5, left: 12 }}
        >
          <CartesianGrid
            vertical={false}
            stroke="#e9e8e2"
            strokeDasharray="3 5"
          />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 12, fill: "#676d69" }}
            tickLine={false}
            axisLine={false}
            minTickGap={50}
          />
          <YAxis
            domain={["auto", "auto"]}
            tickFormatter={(v) =>
              new Intl.NumberFormat("en", { notation: "compact" }).format(v)
            }
            tick={{ fontSize: 12, fill: "#676d69" }}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip
            formatter={(value) => [money(Number(value)), "NPR / tola"]}
            contentStyle={{ borderRadius: 10, border: "1px solid #ddd" }}
          />
          <Line
            type="linear"
            dataKey="price"
            stroke={metal === "gold" ? "#a98229" : "#667a8c"}
            strokeWidth={2.5}
            dot={{ r: 3 }}
            connectNulls={false}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
