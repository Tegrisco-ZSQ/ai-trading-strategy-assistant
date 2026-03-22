import { EmptyState } from "@/components/empty-state";
import { IndicatorRow } from "@/types/trading";
import { Badge } from "@/components/ui/badge";

interface IndicatorsTableProps {
  rows: IndicatorRow[];
}

export function IndicatorsTable({ rows }: IndicatorsTableProps) {
  if (rows.length === 0) {
    return <EmptyState message="Signals will appear after strategy generation." title="Signals unavailable" />;
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-900/70">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-slate-800 text-xs uppercase tracking-wide text-slate-400">
            <th className="px-4 py-3 text-left">Ticker</th>
            <th className="px-4 py-3 text-left">10D Momentum</th>
            <th className="px-4 py-3 text-left">20D Vol (ann)</th>
            <th className="px-4 py-3 text-left">Position</th>
            <th className="px-4 py-3 text-left">P(Up Tomorrow)</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.ticker} className="border-b border-slate-800/70 text-slate-200">
              <td className="px-4 py-3 font-semibold text-white">{row.ticker}</td>
              <td className="px-4 py-3">
                <Badge variant={momentumVariant(row.momentum10dPct)}>{formatPercent(row.momentum10dPct)}</Badge>
              </td>
              <td className="px-4 py-3">{formatPercent(row.vol20dAnnualizedPct)}</td>
              <td className="px-4 py-3">{formatPercent(row.suggestedPositionPct)}</td>
              <td className="px-4 py-3">{formatNumber(row.probabilityUpTomorrow, 3)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function formatNumber(value: number | null, decimals = 2): string {
  if (value == null || Number.isNaN(value)) {
    return "N/A";
  }
  return value.toFixed(decimals);
}

function formatPercent(value: number | null): string {
  const n = formatNumber(value);
  return n === "N/A" ? n : `${n}%`;
}

function momentumVariant(value: number | null): "positive" | "negative" | "neutral" {
  if (value == null) {
    return "neutral";
  }
  return value >= 0 ? "positive" : "negative";
}
