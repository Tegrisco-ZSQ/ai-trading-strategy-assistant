import { ArrowUpRight, CalendarClock, Newspaper } from "lucide-react";

import { EmptyState } from "@/components/empty-state";
import { ScoredHeadline } from "@/types/trading";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

interface HeadlinesTableProps {
  rows: ScoredHeadline[];
}

export function HeadlinesTable({ rows }: HeadlinesTableProps) {
  if (rows.length === 0) {
    return <EmptyState message="No headlines were found for this request." title="News unavailable" />;
  }

  return (
    <div className="grid gap-3">
      {rows.map((row) => (
        <Card key={`${row.headline}-${row.url}`} className="border-slate-800 bg-slate-900/75">
          <CardContent className="p-4">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={sentimentVariant(row.label)}>{row.label}</Badge>
              <ImpactChip score={row.impactScore} />
              <span className="inline-flex items-center gap-1 text-xs text-slate-400">
                <CalendarClock className="h-3.5 w-3.5" />
                {formatDate(row.published)}
              </span>
            </div>

            <a
              href={row.url}
              target="_blank"
              rel="noreferrer"
              className="mt-3 flex items-start justify-between gap-3 text-sm font-medium text-slate-100 transition hover:text-blue-300"
            >
              <span className="line-clamp-2">{row.headline}</span>
              <ArrowUpRight className="mt-0.5 h-4 w-4 shrink-0" />
            </a>

            <div className="mt-3 flex items-start gap-2 rounded-md border border-slate-800 bg-slate-950/70 px-3 py-2 text-xs text-slate-300">
              <Newspaper className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-500" />
              <p className="line-clamp-2">{row.reason}</p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function sentimentVariant(label: string): "positive" | "negative" | "neutral" {
  if (label === "POSITIVE") {
    return "positive";
  }
  if (label === "NEGATIVE") {
    return "negative";
  }
  return "neutral";
}

function formatDate(value: string): string {
  if (!value) {
    return "Date unavailable";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function ImpactChip({ score }: { score: number }) {
  const tone =
    score > 0 ? "border-emerald-700/50 bg-emerald-500/10 text-emerald-300" : score < 0 ? "border-rose-700/50 bg-rose-500/10 text-rose-300" : "border-slate-700 bg-slate-800 text-slate-300";
  return (
    <span className={`rounded-full border px-2 py-0.5 text-xs font-medium ${tone}`}>Impact {score.toFixed(3)}</span>
  );
}
