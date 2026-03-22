import { EmptyState } from "@/components/empty-state";
import { FundamentalRow } from "@/types/trading";

interface FundamentalsTableProps {
  rows: FundamentalRow[];
}

export function FundamentalsTable({ rows }: FundamentalsTableProps) {
  if (rows.length === 0) {
    return (
      <EmptyState
        message="No fundamentals were returned. Add FINANCIAL_DATASETS_API_KEY to populate this section."
        title="Fundamentals unavailable"
      />
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-900/70">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-slate-800 text-xs uppercase tracking-wide text-slate-400">
            <th className="px-4 py-3 text-left">Ticker</th>
            <th className="px-4 py-3 text-left">Company</th>
            <th className="px-4 py-3 text-left">Sector</th>
            <th className="px-4 py-3 text-left">Industry</th>
            <th className="px-4 py-3 text-left">Revenue (TTM)</th>
            <th className="px-4 py-3 text-left">Gross Margin</th>
            <th className="px-4 py-3 text-left">Operating Margin</th>
            <th className="px-4 py-3 text-left">Net Margin</th>
            <th className="px-4 py-3 text-left">SEC Filings</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.ticker} className="border-b border-slate-800/70 text-slate-200">
              <td className="px-4 py-3 font-semibold text-white">{row.ticker}</td>
              <td className="px-4 py-3">{row.company ?? "N/A"}</td>
              <td className="px-4 py-3">{row.sector ?? "N/A"}</td>
              <td className="px-4 py-3">{row.industry ?? "N/A"}</td>
              <td className="px-4 py-3">{formatMoney(row.revenueTtm)}</td>
              <td className="px-4 py-3">{formatPercent(row.grossMarginPct)}</td>
              <td className="px-4 py-3">{formatPercent(row.operatingMarginPct)}</td>
              <td className="px-4 py-3">{formatPercent(row.netMarginPct)}</td>
              <td className="px-4 py-3">
                {row.secFilingsUrl ? (
                  <a
                    href={row.secFilingsUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-blue-300 underline decoration-transparent hover:decoration-blue-300"
                  >
                    Open
                  </a>
                ) : (
                  "N/A"
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function formatNumber(value: number | null): string {
  if (value == null || Number.isNaN(value)) {
    return "N/A";
  }
  return value.toFixed(2);
}

function formatPercent(value: number | null): string {
  const n = formatNumber(value);
  return n === "N/A" ? n : `${n}%`;
}

function formatMoney(value: number | null): string {
  if (value == null || Number.isNaN(value)) {
    return "N/A";
  }
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    notation: "compact",
    maximumFractionDigits: 2
  }).format(value);
}
