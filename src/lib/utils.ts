export function parseTickers(tickersRaw: string): string[] {
  if (!tickersRaw) {
    return [];
  }

  const normalized = tickersRaw.replace(/\n/g, " ").replace(/;/g, ",");
  const chunks = normalized.split(",");
  const symbols: string[] = [];

  for (const chunk of chunks) {
    for (const candidate of chunk.split(/\s+/)) {
      const ticker = candidate.trim().toUpperCase();
      if (ticker) {
        symbols.push(ticker);
      }
    }
  }

  return [...new Set(symbols)];
}

export function safeDivide(a: number | null | undefined, b: number | null | undefined): number | null {
  if (a == null || b == null || b === 0) {
    return null;
  }

  return a / b;
}

export function roundOrNull(value: number | null | undefined, decimals = 2): number | null {
  if (value == null || Number.isNaN(value)) {
    return null;
  }
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
