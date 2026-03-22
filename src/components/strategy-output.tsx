import ReactMarkdown from "react-markdown";
import { AlertTriangle, Bot, ShieldCheck, Sparkles } from "lucide-react";

import { EmptyState } from "@/components/empty-state";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface StrategyOutputProps {
  strategy: string | null;
  aggregateNewsImpact: number | null;
  warnings: string[];
  compact?: boolean;
}

interface ParsedSection {
  title: string;
  body: string;
}

export function StrategyOutput({ strategy, aggregateNewsImpact, warnings, compact = false }: StrategyOutputProps) {
  if (!strategy) {
    return <EmptyState message="Run the assistant to generate a strategy recommendation." title="Strategy unavailable" />;
  }

  const sections = parseStrategySections(strategy);
  const visibleSections = compact ? sections.slice(0, 2) : sections;
  const decision = inferDecision(strategy);

  return (
    <div className="space-y-4">
      <Card className="border-blue-900/50 bg-slate-900/70">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-white">
            <Sparkles className="h-4 w-4 text-blue-400" />
            Recommendation Snapshot
          </CardTitle>
          <CardDescription>Quick read before diving into full strategy details.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline">Decision: {decision}</Badge>
            <Badge variant="neutral">Aggregate News Impact: {aggregateNewsImpact?.toFixed(3) ?? "N/A"}</Badge>
          </div>

          {warnings.length > 0 ? (
            <div className="space-y-2 rounded-lg border border-amber-700/40 bg-amber-500/10 p-3">
              {warnings.map((warning) => (
                <div key={warning} className="flex items-start gap-2 text-sm text-amber-200">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>{warning}</span>
                </div>
              ))}
            </div>
          ) : null}
        </CardContent>
      </Card>

      <div className="grid gap-3 lg:grid-cols-2">
        {visibleSections.map((section, index) => (
          <Card key={`${section.title}-${index}`} className="border-slate-800 bg-slate-900/70">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm text-slate-100">
                {section.title.toLowerCase().includes("avoid") ? (
                  <ShieldCheck className="h-4 w-4 text-blue-400" />
                ) : (
                  <Bot className="h-4 w-4 text-slate-400" />
                )}
                {section.title}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="strategy-markdown text-sm text-slate-200">
                <ReactMarkdown>{section.body}</ReactMarkdown>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {compact && sections.length > visibleSections.length ? (
        <p className="text-xs text-slate-400">Open the Strategy tab for the full recommendation breakdown.</p>
      ) : null}
    </div>
  );
}

function parseStrategySections(strategy: string): ParsedSection[] {
  const normalized = strategy.replace(/\r\n/g, "\n").trim();
  if (!normalized) {
    return [];
  }

  const headingSplit = normalized.split(/\n(?=(?:\d+\.\s|#{1,3}\s))/g);
  const chunks = headingSplit.length > 1 ? headingSplit : normalized.split(/\n\n(?=[A-Z][^\n]{3,60}:)/g);

  if (chunks.length <= 1) {
    return [{ title: "Full Strategy", body: normalized }];
  }

  return chunks.map((chunk, index) => {
    const lines = chunk.split("\n").filter((line) => line.trim().length > 0);
    const first = lines[0] ?? `Section ${index + 1}`;
    const title = first.replace(/^#{1,3}\s*/, "").replace(/^\d+\.\s*/, "").trim();
    const body = lines.slice(1).join("\n").trim() || lines.join("\n");
    return { title: title || `Section ${index + 1}`, body };
  });
}

function inferDecision(strategy: string): "BUY" | "WAIT" | "REDUCE" | "AVOID" | "UNSPECIFIED" {
  const match = strategy.match(/\b(Buy|Wait|Reduce|Avoid)\b/i);
  if (!match) {
    return "UNSPECIFIED";
  }
  return match[1].toUpperCase() as "BUY" | "WAIT" | "REDUCE" | "AVOID";
}
