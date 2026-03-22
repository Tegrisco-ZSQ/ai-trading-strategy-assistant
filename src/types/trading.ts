export type Timeframe = "Intraday" | "Daily" | "Weekly";
export type StrategyStyle = "Momentum" | "Mean Reversion" | "Breakout" | "Event-driven";
export type RiskLevel = "Conservative" | "Balanced" | "Aggressive";
export type HeadlineLabel = "POSITIVE" | "NEGATIVE" | "NEUTRAL";

export interface StrategyRequestPayload {
  tickers: string;
  timeframe: Timeframe;
  style: StrategyStyle;
  riskLevel: RiskLevel;
  newsDays: number;
  maxNews: number;
  maxDrawdown: number;
  stopLoss: number;
  takeProfit: number;
  specialRequirements?: string;
}

export interface FundamentalRow {
  ticker: string;
  company: string | null;
  exchange: string | null;
  sector: string | null;
  industry: string | null;
  reportPeriod: string | null;
  revenueTtm: number | null;
  grossProfitTtm: number | null;
  operatingIncomeTtm: number | null;
  netIncomeTtm: number | null;
  grossMarginPct: number | null;
  operatingMarginPct: number | null;
  netMarginPct: number | null;
  secFilingsUrl: string | null;
}

export interface IndicatorRow {
  ticker: string;
  momentum10dPct: number | null;
  vol20dAnnualizedPct: number | null;
  suggestedPositionPct: number | null;
  probabilityUpTomorrow: number | null;
}

export interface NewsArticle {
  headline: string;
  url: string;
  published: string;
}

export interface ScoredHeadline extends NewsArticle {
  label: HeadlineLabel;
  reason: string;
  impactScore: number;
}

export interface StrategyResult {
  strategy: string;
  aggregateNewsImpact: number;
  headlines: ScoredHeadline[];
  fundamentals: FundamentalRow[];
  indicators: IndicatorRow[];
  warnings: string[];
}
