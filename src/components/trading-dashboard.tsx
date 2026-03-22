"use client";

import { ComponentType, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  Activity,
  AlertCircle,
  ArrowUpRight,
  BarChart3,
  BrainCircuit,
  CandlestickChart,
  Newspaper,
  Shield,
  Target
} from "lucide-react";

import { EmptyState } from "@/components/empty-state";
import { FundamentalsTable } from "@/components/fundamentals-table";
import { HeadlinesTable } from "@/components/headlines-table";
import { IndicatorsTable } from "@/components/indicators-table";
import { StrategyForm } from "@/components/strategy-form";
import { StrategyOutput } from "@/components/strategy-output";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { StrategyRequestPayload, StrategyResult } from "@/types/trading";

export function TradingDashboard() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<StrategyResult | null>(null);

  async function handleSubmit(payload: StrategyRequestPayload) {
    setError(null);
    setIsLoading(true);

    try {
      const response = await fetch("/api/strategy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const data = (await response.json()) as StrategyResult & { error?: string };
      if (!response.ok) {
        throw new Error(data.error || "Failed to build strategy.");
      }

      setResult(data);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unexpected request error.");
    } finally {
      setIsLoading(false);
    }
  }

  const summary = useMemo(() => buildSummaryMetrics(result), [result]);

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto max-w-[1500px] space-y-6 px-4 py-6 sm:px-6 lg:px-8">
        <DashboardHeader metrics={summary} isLoading={isLoading} />

        <section className="grid gap-6 xl:grid-cols-[360px_1fr]">
          <motion.aside
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: "easeOut" }}
            className="space-y-4"
          >
            <StrategyForm isLoading={isLoading} onSubmit={handleSubmit} />
          </motion.aside>

          <motion.section
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.05, ease: "easeOut" }}
            className="space-y-4"
          >
            {error ? (
              <Alert>
                <AlertTitle className="flex items-center gap-2">
                  <AlertCircle className="h-4 w-4" />
                  Request Error
                </AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            ) : null}

            <Card className="border-slate-800 bg-slate-900/85">
              <CardHeader className="pb-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <CandlestickChart className="h-5 w-5 text-blue-400" />
                      Strategy Workspace
                    </CardTitle>
                    <CardDescription>
                      Review outputs by section: overview, quantitative signals, news context, fundamentals, and final
                      recommendation.
                    </CardDescription>
                  </div>
                  <Badge variant="outline">Server-side pipeline intact</Badge>
                </div>
              </CardHeader>

              <CardContent>
                <Tabs defaultValue="overview">
                  <TabsList>
                    <TabsTrigger value="overview">Overview</TabsTrigger>
                    <TabsTrigger value="signals">Signals</TabsTrigger>
                    <TabsTrigger value="news">News</TabsTrigger>
                    <TabsTrigger value="fundamentals">Fundamentals</TabsTrigger>
                    <TabsTrigger value="strategy">Strategy</TabsTrigger>
                  </TabsList>

                  <TabsContent value="overview">
                    {isLoading ? (
                      <OverviewSkeleton />
                    ) : result ? (
                      <OverviewTab result={result} metrics={summary} />
                    ) : (
                      <EmptyState
                        title="No analysis yet"
                        message="Submit your controls on the left to generate a full market + strategy view."
                      />
                    )}
                  </TabsContent>

                  <TabsContent value="signals">
                    {isLoading ? (
                      <TableSkeleton />
                    ) : result ? (
                      <div className="space-y-4">
                        <MetricGrid metrics={summary.slice(0, 4)} compact />
                        <IndicatorsTable rows={result.indicators} />
                      </div>
                    ) : (
                      <EmptyState title="Signals pending" message="Run a request to inspect indicator outputs." />
                    )}
                  </TabsContent>

                  <TabsContent value="news">
                    {isLoading ? (
                      <TableSkeleton />
                    ) : result ? (
                      <HeadlinesTable rows={result.headlines} />
                    ) : (
                      <EmptyState title="News pending" message="Generate a strategy to score related headlines." />
                    )}
                  </TabsContent>

                  <TabsContent value="fundamentals">
                    {isLoading ? (
                      <TableSkeleton />
                    ) : result ? (
                      <FundamentalsTable rows={result.fundamentals} />
                    ) : (
                      <EmptyState
                        title="Fundamentals pending"
                        message="Generate a strategy to pull company context and profitability metrics."
                      />
                    )}
                  </TabsContent>

                  <TabsContent value="strategy">
                    {isLoading ? (
                      <OverviewSkeleton />
                    ) : (
                      <StrategyOutput
                        strategy={result?.strategy ?? null}
                        aggregateNewsImpact={result?.aggregateNewsImpact ?? null}
                        warnings={result?.warnings ?? []}
                      />
                    )}
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </motion.section>
        </section>
      </div>
    </main>
  );
}

function DashboardHeader({
  metrics,
  isLoading
}: {
  metrics: DashboardMetric[];
  isLoading: boolean;
}) {
  return (
    <header className="rounded-2xl border border-slate-800 bg-gradient-to-r from-slate-950 via-slate-900 to-slate-900 p-5 md:p-6">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-slate-400">AI Trading Strategy Assistant</p>
          <h1 className="mt-1 text-2xl font-semibold text-white md:text-3xl">Professional Strategy Dashboard</h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-300">
            Turn ticker ideas into data-grounded plans with fundamentals, quant signals, headline scoring, and clear
            strategy decisions.
          </p>
        </div>
        <Badge variant="default" className="h-fit">
          <ArrowUpRight className="mr-1 h-3.5 w-3.5" />
          Live Analysis
        </Badge>
      </div>

      {isLoading ? <MetricsSkeleton /> : <MetricGrid metrics={metrics} />}
    </header>
  );
}

function OverviewTab({ result, metrics }: { result: StrategyResult; metrics: DashboardMetric[] }) {
  return (
    <div className="space-y-4">
      <MetricGrid metrics={metrics.slice(0, 4)} compact />

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="border-slate-800 bg-slate-900/75">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-slate-100">Strategy Snapshot</CardTitle>
            <CardDescription>Condensed recommendation and risk posture.</CardDescription>
          </CardHeader>
          <CardContent>
            <StrategyOutput
              strategy={result.strategy}
              aggregateNewsImpact={result.aggregateNewsImpact}
              warnings={result.warnings}
              compact
            />
          </CardContent>
        </Card>

        <Card className="border-slate-800 bg-slate-900/75">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm text-slate-100">
              <Newspaper className="h-4 w-4 text-blue-400" />
              Top Headlines
            </CardTitle>
            <CardDescription>Highest impact items from current news scoring.</CardDescription>
          </CardHeader>
          <CardContent>
            <HeadlinesTable rows={result.headlines.slice(0, 3)} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

type DashboardMetric = {
  label: string;
  value: string;
  detail: string;
  icon: ComponentType<{ className?: string }>;
};

function MetricGrid({ metrics, compact = false }: { metrics: DashboardMetric[]; compact?: boolean }) {
  return (
    <div className={`grid gap-3 ${compact ? "md:grid-cols-2 xl:grid-cols-4" : "md:grid-cols-2 xl:grid-cols-5"}`}>
      {metrics.map((metric) => (
        <motion.div
          key={metric.label}
          whileHover={{ y: -2 }}
          transition={{ type: "spring", stiffness: 220, damping: 16 }}
        >
          <Card className="h-full border-slate-800 bg-slate-900/70">
            <CardContent className="p-4">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-xs uppercase tracking-wide text-slate-400">{metric.label}</span>
                <metric.icon className="h-4 w-4 text-blue-400" />
              </div>
              <p className="text-xl font-semibold text-white">{metric.value}</p>
              <p className="mt-1 text-xs text-slate-400">{metric.detail}</p>
            </CardContent>
          </Card>
        </motion.div>
      ))}
    </div>
  );
}

function OverviewSkeleton() {
  return (
    <div className="space-y-4">
      <MetricsSkeleton />
      <TableSkeleton />
    </div>
  );
}

function MetricsSkeleton() {
  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
      {Array.from({ length: 5 }).map((_, idx) => (
        <Card key={idx} className="border-slate-800 bg-slate-900/65">
          <CardContent className="space-y-2 p-4">
            <Skeleton className="h-3 w-28" />
            <Skeleton className="h-7 w-20" />
            <Skeleton className="h-3 w-36" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function TableSkeleton() {
  return (
    <Card className="border-slate-800 bg-slate-900/65">
      <CardContent className="space-y-3 p-4">
        <Skeleton className="h-4 w-44" />
        {Array.from({ length: 5 }).map((_, idx) => (
          <Skeleton key={idx} className="h-12 w-full" />
        ))}
      </CardContent>
    </Card>
  );
}

function buildSummaryMetrics(result: StrategyResult | null): DashboardMetric[] {
  const momentum = average(result?.indicators.map((row) => row.momentum10dPct ?? null) ?? []);
  const volatility = average(result?.indicators.map((row) => row.vol20dAnnualizedPct ?? null) ?? []);
  const position = average(result?.indicators.map((row) => row.suggestedPositionPct ?? null) ?? []);
  const probability = average(result?.indicators.map((row) => row.probabilityUpTomorrow ?? null) ?? []);
  const newsImpact = result?.aggregateNewsImpact ?? null;

  return [
    {
      label: "Momentum 10D",
      value: valueOrDash(momentum, 2, "%"),
      detail: "Average across selected tickers",
      icon: BarChart3
    },
    {
      label: "Volatility 20D",
      value: valueOrDash(volatility, 2, "%"),
      detail: "Annualized risk estimate",
      icon: Activity
    },
    {
      label: "Position Sizing",
      value: valueOrDash(position, 1, "%"),
      detail: "Volatility-adjusted allocation",
      icon: Shield
    },
    {
      label: "P(Up Tomorrow)",
      value: valueOrDash(probability, 3),
      detail: "Model directional estimate",
      icon: Target
    },
    {
      label: "News Impact",
      value: valueOrDash(newsImpact, 3),
      detail: `${result?.headlines.length ?? 0} scored headlines`,
      icon: BrainCircuit
    }
  ];
}

function average(values: Array<number | null>): number | null {
  const clean = values.filter((value): value is number => value != null && !Number.isNaN(value));
  if (clean.length === 0) {
    return null;
  }
  return clean.reduce((sum, value) => sum + value, 0) / clean.length;
}

function valueOrDash(value: number | null, decimals = 2, suffix = ""): string {
  if (value == null || Number.isNaN(value)) {
    return "--";
  }
  return `${value.toFixed(decimals)}${suffix}`;
}
