import {
  IndicatorRow,
  ScoredHeadline,
  StrategyRequestPayload,
  StrategyResult
} from "@/types/trading";
import {
  buildFundamentalsTable,
  buildTickerContextFromFinancialDatasets
} from "@/lib/services/financial-datasets";
import { buildIndicatorTable } from "@/lib/services/market-indicators";
import { classifyHeadlineWithLlm, generateStrategyWithLlm } from "@/lib/services/llm";
import { fetchRssNews } from "@/lib/services/news";
import { parseTickers, roundOrNull } from "@/lib/utils";

function buildIndicatorContext(indicators: IndicatorRow[]): string {
  if (indicators.length === 0) {
    return "";
  }

  const lines = ["Quant indicators (momentum + volatility + ML probability):"];
  for (const row of indicators) {
    lines.push(
      `- ${row.ticker}: 10D Momentum (%)=${row.momentum10dPct ?? "n/a"}, ` +
        `20D Vol (ann, %)=${row.vol20dAnnualizedPct ?? "n/a"}, ` +
        `Suggested Position (%)=${row.suggestedPositionPct ?? "n/a"}, ` +
        `P(Up Tomorrow)=${row.probabilityUpTomorrow ?? "n/a"}`
    );
  }
  return lines.join("\n");
}

function buildTopHeadlinesText(headlines: ScoredHeadline[], limit = 3): string {
  if (headlines.length === 0) {
    return "";
  }
  return headlines
    .slice(0, limit)
    .map(
      (headline, index) =>
        `${index + 1}. ${headline.headline} | ${headline.label} | impact=${headline.impactScore} | ${headline.reason}`
    )
    .join("\n");
}

export async function runStrategyPipeline(payload: StrategyRequestPayload): Promise<StrategyResult> {
  const tickers = parseTickers(payload.tickers);
  if (tickers.length === 0) {
    throw new Error("Please provide at least one valid ticker.");
  }

  const warnings: string[] = [];

  const [fundamentals, fundamentalsContext, indicators] = await Promise.all([
    buildFundamentalsTable(payload.tickers),
    buildTickerContextFromFinancialDatasets(payload.tickers),
    buildIndicatorTable(payload.tickers, payload.riskLevel)
  ]);

  if (!process.env.FINANCIAL_DATASETS_API_KEY) {
    warnings.push("FINANCIAL_DATASETS_API_KEY not set. Fundamentals may be limited.");
  }

  const indicatorContext = buildIndicatorContext(indicators);
  const combinedContext = [fundamentalsContext, indicatorContext].filter(Boolean).join("\n\n");

  const articles = await fetchRssNews(payload.tickers, payload.maxNews, payload.newsDays);
  const scoredHeadlines: ScoredHeadline[] = [];

  for (const article of articles) {
    const score = await classifyHeadlineWithLlm(
      article.headline,
      payload.tickers,
      payload.timeframe,
      payload.style,
      payload.specialRequirements ?? "",
      combinedContext
    );

    scoredHeadlines.push({
      headline: article.headline,
      url: article.url,
      published: article.published,
      label: score.label,
      impactScore: roundOrNull(score.impactScore, 3) ?? 0,
      reason: score.reason
    });
  }

  const normalizedHeadlines = scoredHeadlines.sort((a, b) => Math.abs(b.impactScore) - Math.abs(a.impactScore));

  const aggregateNewsImpact = roundOrNull(
    normalizedHeadlines.length
      ? normalizedHeadlines.reduce((sum, row) => sum + row.impactScore, 0) / normalizedHeadlines.length
      : 0,
    3
  );

  const topHeadlinesText = buildTopHeadlinesText(normalizedHeadlines, 3);

  const specialRequirementsAugmented = [
    payload.specialRequirements?.trim() ?? "",
    `Aggregate news impact score: ${aggregateNewsImpact ?? 0}`,
    topHeadlinesText ? `Top scored headlines:\n${topHeadlinesText}` : ""
  ]
    .filter(Boolean)
    .join("\n\n");

  const strategy = await generateStrategyWithLlm({
    tickers: payload.tickers,
    timeframe: payload.timeframe,
    style: payload.style,
    riskLevel: payload.riskLevel,
    maxDrawdown: payload.maxDrawdown,
    stopLoss: payload.stopLoss,
    takeProfit: payload.takeProfit,
    specialRequirements: specialRequirementsAugmented,
    combinedContext
  });

  return {
    strategy,
    aggregateNewsImpact: aggregateNewsImpact ?? 0,
    headlines: normalizedHeadlines,
    fundamentals,
    indicators,
    warnings
  };
}
