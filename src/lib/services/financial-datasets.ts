import { FundamentalRow } from "@/types/trading";
import { parseTickers, roundOrNull, safeDivide } from "@/lib/utils";

const FD_BASE_URL = "https://api.financialdatasets.ai";

interface CompanyFactsResponse {
  company_facts?: {
    name?: string;
    exchange?: string;
    sector?: string;
    industry?: string;
    market_cap?: number;
    sec_filings_url?: string;
  };
}

interface IncomeStatementsResponse {
  income_statements?: Array<{
    report_period?: string;
    revenue?: number;
    gross_profit?: number;
    operating_income?: number;
    net_income?: number;
  }>;
}

interface PriceSnapshotResponse {
  snapshot?: {
    price?: number;
    day_change_percent?: number;
  };
}

async function fdGet<T>(path: string, params?: Record<string, string | number>): Promise<T | null> {
  const apiKey = process.env.FINANCIAL_DATASETS_API_KEY;
  if (!apiKey) {
    return null;
  }

  const searchParams = new URLSearchParams();
  for (const [key, value] of Object.entries(params ?? {})) {
    searchParams.set(key, String(value));
  }

  const url = `${FD_BASE_URL}${path}${searchParams.toString() ? `?${searchParams.toString()}` : ""}`;

  try {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "X-API-KEY": apiKey
      },
      cache: "no-store"
    });

    if (!response.ok) {
      return null;
    }

    return (await response.json()) as T;
  } catch {
    return null;
  }
}

async function getTickerSnapshot(ticker: string) {
  const [factsJson, snapshotJson, incomeJson] = await Promise.all([
    fdGet<CompanyFactsResponse>("/company/facts", { ticker }),
    fdGet<PriceSnapshotResponse>("/prices/snapshot", { ticker }),
    fdGet<IncomeStatementsResponse>("/financials/income-statements", {
      ticker,
      period: "ttm",
      limit: 1
    })
  ]);

  const facts = factsJson?.company_facts ?? {};
  const snapshot = snapshotJson?.snapshot ?? {};
  const income = incomeJson?.income_statements?.[0] ?? {};

  return { facts, snapshot, income };
}

export async function buildTickerContextFromFinancialDatasets(
  tickersRaw: string,
  maxTickers = 3
): Promise<string> {
  const tickers = parseTickers(tickersRaw).slice(0, maxTickers);
  if (tickers.length === 0) {
    return "";
  }

  const lines: string[] = ["Ticker context (structured data):"];

  for (const ticker of tickers) {
    const { facts, snapshot, income } = await getTickerSnapshot(ticker);

    lines.push(`- ${ticker}:`);
    if (facts.name) {
      lines.push(`  Company: ${facts.name}`);
    }
    if (facts.market_cap != null) {
      lines.push(`  Market cap: ${facts.market_cap}`);
    }
    if (snapshot.price != null) {
      lines.push(`  Current price: ${snapshot.price}`);
    }
    if (snapshot.day_change_percent != null) {
      lines.push(`  Day change (%): ${snapshot.day_change_percent}`);
    }
    if (income.revenue != null) {
      lines.push(`  TTM revenue: ${income.revenue}`);
    }
    if (income.net_income != null) {
      lines.push(`  TTM net income: ${income.net_income}`);
    }
  }

  if (lines.length <= 1) {
    return "";
  }

  return lines.join("\n");
}

export async function buildFundamentalsTable(tickersRaw: string): Promise<FundamentalRow[]> {
  const tickers = parseTickers(tickersRaw);
  if (tickers.length === 0) {
    return [];
  }

  const rows = await Promise.all(
    tickers.map(async (ticker) => {
      const { facts, income } = await getTickerSnapshot(ticker);
      const revenue = income.revenue ?? null;
      const grossProfit = income.gross_profit ?? null;
      const operatingIncome = income.operating_income ?? null;
      const netIncome = income.net_income ?? null;
      const grossMargin = safeDivide(grossProfit, revenue);
      const operatingMargin = safeDivide(operatingIncome, revenue);
      const netMargin = safeDivide(netIncome, revenue);

      return {
        ticker,
        company: facts.name ?? null,
        exchange: facts.exchange ?? null,
        sector: facts.sector ?? null,
        industry: facts.industry ?? null,
        reportPeriod: income.report_period ?? null,
        revenueTtm: revenue,
        grossProfitTtm: grossProfit,
        operatingIncomeTtm: operatingIncome,
        netIncomeTtm: netIncome,
        grossMarginPct: roundOrNull(grossMargin == null ? null : grossMargin * 100, 2),
        operatingMarginPct: roundOrNull(operatingMargin == null ? null : operatingMargin * 100, 2),
        netMarginPct: roundOrNull(netMargin == null ? null : netMargin * 100, 2),
        secFilingsUrl: facts.sec_filings_url ?? null
      } satisfies FundamentalRow;
    })
  );

  return rows;
}
