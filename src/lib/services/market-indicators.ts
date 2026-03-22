import { IndicatorRow, RiskLevel } from "@/types/trading";
import { clamp, parseTickers, roundOrNull } from "@/lib/utils";

interface PricePoint {
  date: string;
  close: number;
}

interface VolatilityFeatures {
  momentum10dPct: number;
  vol20dAnnualizedPct: number;
  lastClose: number;
}

interface MlFeatureRow {
  ret1d: number;
  mom10d: number;
  vol20d: number;
  yUp: number;
}

interface LogisticModel {
  means: number[];
  stds: number[];
  weights: number[];
  bias: number;
}

async function getPriceHistory(ticker: string, period: "6mo" | "2y"): Promise<PricePoint[]> {
  const symbol = encodeURIComponent(ticker.trim().toUpperCase());
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d&range=${period}&includePrePost=false&events=div,splits`;

  try {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "User-Agent": "Mozilla/5.0"
      },
      cache: "no-store"
    });

    if (!response.ok) {
      return [];
    }

    const payload = (await response.json()) as YahooChartResponse;
    const result = payload.chart?.result?.[0];
    const timestamps = result?.timestamp ?? [];
    const adjClose = result?.indicators?.adjclose?.[0]?.adjclose ?? [];
    const close = result?.indicators?.quote?.[0]?.close ?? [];
    const prices = adjClose.length === timestamps.length ? adjClose : close;

    const rows: PricePoint[] = [];
    for (let i = 0; i < timestamps.length; i += 1) {
      const ts = timestamps[i];
      const px = prices[i];
      if (!ts || px == null || Number.isNaN(px)) {
        continue;
      }
      rows.push({
        date: new Date(ts * 1000).toISOString().slice(0, 10),
        close: Number(px)
      });
    }

    return rows;
  } catch {
    return [];
  }
}

interface YahooChartResponse {
  chart?: {
    result?: Array<{
      timestamp?: number[];
      indicators?: {
        quote?: Array<{
          close?: Array<number | null>;
        }>;
        adjclose?: Array<{
          adjclose?: Array<number | null>;
        }>;
      };
    }>;
  };
}

function stdDev(values: number[]): number {
  if (values.length === 0) {
    return 0;
  }
  const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
  const variance = values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / values.length;
  return Math.sqrt(variance);
}

function computeVolatilityFeatures(prices: PricePoint[], volWindow = 20, momWindow = 10): VolatilityFeatures | null {
  if (prices.length < Math.max(volWindow, momWindow) + 2) {
    return null;
  }

  const closes = prices.map((point) => point.close);
  const returns: Array<number | null> = closes.map((close, index) => {
    if (index === 0) {
      return null;
    }
    const prev = closes[index - 1];
    if (prev === 0) {
      return null;
    }
    return close / prev - 1;
  });

  let best: VolatilityFeatures | null = null;
  for (let i = 0; i < closes.length; i += 1) {
    if (i < Math.max(volWindow, momWindow)) {
      continue;
    }
    const momentum = closes[i - momWindow] === 0 ? null : closes[i] / closes[i - momWindow] - 1;
    const trailingReturns = returns.slice(i - volWindow + 1, i + 1).filter((value): value is number => value != null);
    if (momentum == null || trailingReturns.length < volWindow) {
      continue;
    }
    const annualizedVol = stdDev(trailingReturns) * Math.sqrt(252);
    best = {
      momentum10dPct: momentum * 100,
      vol20dAnnualizedPct: annualizedVol * 100,
      lastClose: closes[i]
    };
  }

  return best;
}

function volScaledPositionFraction(volAnnPct: number | null, riskLevel: RiskLevel): number | null {
  if (volAnnPct == null) {
    return null;
  }

  const targets: Record<RiskLevel, number> = {
    Conservative: 15,
    Balanced: 25,
    Aggressive: 35
  };
  const target = targets[riskLevel];
  const fraction = target / Math.max(volAnnPct, 1e-6);
  return clamp(fraction, 0.05, 1);
}

function buildMlFeatures(prices: PricePoint[], volWindow = 20, momWindow = 10): MlFeatureRow[] {
  if (prices.length < 2) {
    return [];
  }

  const closes = prices.map((point) => point.close);
  const returns: Array<number | null> = closes.map((close, index) => {
    if (index === 0) {
      return null;
    }
    const prev = closes[index - 1];
    return prev === 0 ? null : close / prev - 1;
  });

  const features: MlFeatureRow[] = [];
  for (let i = 0; i < closes.length - 1; i += 1) {
    if (i < Math.max(volWindow, momWindow)) {
      continue;
    }

    const ret1d = returns[i];
    const mom10d = closes[i - momWindow] === 0 ? null : closes[i] / closes[i - momWindow] - 1;
    const trailingReturns = returns.slice(i - volWindow + 1, i + 1).filter((value): value is number => value != null);
    const nextRet = closes[i] === 0 ? null : closes[i + 1] / closes[i] - 1;

    if (ret1d == null || mom10d == null || trailingReturns.length < volWindow || nextRet == null) {
      continue;
    }

    features.push({
      ret1d: ret1d * 100,
      mom10d: mom10d * 100,
      vol20d: stdDev(trailingReturns) * Math.sqrt(252) * 100,
      yUp: nextRet > 0 ? 1 : 0
    });
  }

  return features;
}

function sigmoid(value: number): number {
  if (value >= 0) {
    const z = Math.exp(-value);
    return 1 / (1 + z);
  }
  const z = Math.exp(value);
  return z / (1 + z);
}

function trainNextDayUpModel(featureRows: MlFeatureRow[]): LogisticModel | null {
  if (featureRows.length < 120) {
    return null;
  }

  const X = featureRows.map((row) => [row.ret1d, row.mom10d, row.vol20d]);
  const y = featureRows.map((row) => row.yUp);
  const featureCount = X[0]?.length ?? 0;
  if (featureCount === 0) {
    return null;
  }

  const means: number[] = [];
  const stds: number[] = [];
  for (let j = 0; j < featureCount; j += 1) {
    const column = X.map((row) => row[j]);
    const mean = column.reduce((sum, value) => sum + value, 0) / column.length;
    const std = stdDev(column) || 1;
    means.push(mean);
    stds.push(std);
  }

  const Xs = X.map((row) => row.map((value, j) => (value - means[j]) / stds[j]));

  let weights = Array.from({ length: featureCount }, () => 0);
  let bias = 0;
  const learningRate = 0.08;
  const l2 = 0.0005;
  const iterations = 800;

  for (let iter = 0; iter < iterations; iter += 1) {
    const gradW = Array.from({ length: featureCount }, () => 0);
    let gradB = 0;

    for (let i = 0; i < Xs.length; i += 1) {
      const linear = Xs[i].reduce((sum, value, j) => sum + value * weights[j], bias);
      const pred = sigmoid(linear);
      const diff = pred - y[i];

      for (let j = 0; j < featureCount; j += 1) {
        gradW[j] += diff * Xs[i][j];
      }
      gradB += diff;
    }

    for (let j = 0; j < featureCount; j += 1) {
      const regularizedGradient = gradW[j] / Xs.length + l2 * weights[j];
      weights[j] -= learningRate * regularizedGradient;
    }
    bias -= learningRate * (gradB / Xs.length);
  }

  return { means, stds, weights, bias };
}

function predictProbability(model: LogisticModel, ret1d: number, mom10d: number, vol20d: number): number {
  const raw = [ret1d, mom10d, vol20d];
  const normalized = raw.map((value, index) => (value - model.means[index]) / model.stds[index]);
  const linear = normalized.reduce((sum, value, index) => sum + value * model.weights[index], model.bias);
  return sigmoid(linear);
}

async function predictNextDayUpProbability(ticker: string): Promise<number | null> {
  const prices = await getPriceHistory(ticker, "2y");
  const features = buildMlFeatures(prices);
  const model = trainNextDayUpModel(features);
  if (!model || features.length === 0) {
    return null;
  }

  const latest = features[features.length - 1];
  return predictProbability(model, latest.ret1d, latest.mom10d, latest.vol20d);
}

export async function buildIndicatorTable(tickersRaw: string, riskLevel: RiskLevel): Promise<IndicatorRow[]> {
  const tickers = parseTickers(tickersRaw);
  if (tickers.length === 0) {
    return [];
  }

  const rows = await Promise.all(
    tickers.map(async (ticker) => {
      const prices6mo = await getPriceHistory(ticker, "6mo");
      const features = computeVolatilityFeatures(prices6mo);
      if (!features) {
        return {
          ticker,
          momentum10dPct: null,
          vol20dAnnualizedPct: null,
          suggestedPositionPct: null,
          probabilityUpTomorrow: null
        } satisfies IndicatorRow;
      }

      const suggestedFraction = volScaledPositionFraction(features.vol20dAnnualizedPct, riskLevel);
      const probabilityUp = await predictNextDayUpProbability(ticker);

      return {
        ticker,
        momentum10dPct: roundOrNull(features.momentum10dPct, 2),
        vol20dAnnualizedPct: roundOrNull(features.vol20dAnnualizedPct, 2),
        suggestedPositionPct: roundOrNull(suggestedFraction == null ? null : suggestedFraction * 100, 1),
        probabilityUpTomorrow: roundOrNull(probabilityUp, 3)
      } satisfies IndicatorRow;
    })
  );

  return rows;
}
