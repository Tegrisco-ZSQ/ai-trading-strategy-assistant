import OpenAI from "openai";

import { HeadlineLabel, ScoredHeadline } from "@/types/trading";
import { clamp } from "@/lib/utils";

const MODEL = process.env.OPENAI_MODEL || "gpt-5.2";

function getClient(): OpenAI {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("Missing OPENAI_API_KEY in server environment.");
  }
  return new OpenAI({ apiKey });
}

function extractJsonObject(raw: string): string | null {
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) {
    return null;
  }
  return raw.slice(start, end + 1);
}

async function callLlm(systemPrompt: string, userPrompt: string): Promise<string> {
  const client = getClient();
  const response = await client.chat.completions.create({
    model: MODEL,
    temperature: 0.2,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt }
    ]
  });

  const content = response.choices[0]?.message?.content;
  return typeof content === "string" ? content : "";
}

export async function classifyHeadlineWithLlm(
  headline: string,
  tickers: string,
  timeframe: string,
  style: string,
  specialRequirements: string,
  tickerContext = ""
): Promise<Pick<ScoredHeadline, "label" | "reason" | "impactScore">> {
  const systemPrompt = `
You are a financial news analyst.
Classify whether the news is POSITIVE, NEGATIVE, or NEUTRAL
for the given asset and trading horizon.
Also consider the user's special requirements and constraints.

Return STRICT JSON only:
{
  "label": "POSITIVE|NEGATIVE|NEUTRAL",
  "reason": "one short sentence",
  "impact_score": -1.0 to 1.0
}
`.trim();

  const enrichedRequirements = [specialRequirements.trim(), tickerContext.trim()].filter(Boolean).join("\n\n");
  const userPrompt = `
Asset(s): ${tickers}
Timeframe: ${timeframe}
Strategy: ${style}

Special Requirements and Context:
${enrichedRequirements || "(none)"}

Headline:
${headline}
`.trim();

  const raw = await callLlm(systemPrompt, userPrompt);
  const jsonString = extractJsonObject(raw);
  if (!jsonString) {
    return {
      label: "NEUTRAL",
      reason: "Could not parse model output.",
      impactScore: 0
    };
  }

  try {
    const parsed = JSON.parse(jsonString) as {
      label?: string;
      reason?: string;
      impact_score?: number;
    };
    const label = (parsed.label ?? "NEUTRAL").toUpperCase();
    const normalizedLabel: HeadlineLabel =
      label === "POSITIVE" || label === "NEGATIVE" ? (label as HeadlineLabel) : "NEUTRAL";

    return {
      label: normalizedLabel,
      reason: parsed.reason?.trim() || "No reason provided.",
      impactScore: clamp(Number(parsed.impact_score ?? 0), -1, 1)
    };
  } catch {
    return {
      label: "NEUTRAL",
      reason: "Could not parse model output.",
      impactScore: 0
    };
  }
}

export async function generateStrategyWithLlm(params: {
  tickers: string;
  timeframe: string;
  style: string;
  riskLevel: string;
  maxDrawdown: number;
  stopLoss: number;
  takeProfit: number;
  specialRequirements: string;
  combinedContext: string;
}): Promise<string> {
  const systemPrompt = `
You are writing for non-technical users who want clear actions and a bit of explanation.

Brevity rules:
- Output must be <= 18 bullets total across the whole response.
- Each bullet must be <= 50 words.
- No long paragraphs (max 2 lines each).
- No repetition and no fluff.

Hard grounding requirements (must follow ALL):
1) If these numbers appear in context, you MUST quote them:
   - 10D Momentum (%)
   - 20D Vol (ann, %)
   - P(Up Tomorrow)
   - Aggregate news impact score
2) You MUST reference at least 2 fundamentals from ticker context.
3) You MUST mention at least 2 specific scored headlines if provided.

Decision logic requirements:
- If 10D momentum is negative, do NOT recommend momentum-style long entries.
- If 10D momentum is positive, allow momentum entries subject to news and probability filters.
- If 20D volatility is high, reduce position size and tighten entry requirements.
- If P(Up Tomorrow) < 0.50, tighten entries (require stronger news and/or momentum).
- If P(Up Tomorrow) is missing, say so and use conservative defaults.

Risk level mapping:
- Conservative: stricter entries, smaller size, faster exits.
- Balanced: moderate thresholds and sizing.
- Aggressive: looser entries, larger size, tolerate more noise.

Output format (use these headings exactly):
1. Trade decision (what to do today)
2. How to maximize profit
3. How to avoid losses
4. What to watch (news + numbers)
5. Why this fits ${params.tickers}

In "Trade decision", choose ONE of: Buy / Wait / Reduce / Avoid, and give 1-2 bullets.
In "How to maximize profit", provide: entry trigger, add-on rule, take-profit rule, and when to do nothing.
In "How to avoid losses", provide: stop-loss rule, max drawdown rule, position sizing guidance, and a "do not trade if..." rule.
In "What to watch", list 2 headlines (with their impact scores) + 2 numeric thresholds that would change the decision.
In "Why this fits ${params.tickers}", cite 2 fundamentals + the quoted indicator numbers + aggregate news score.

If the best action is WAIT, say WAIT and give the single best condition that would change to BUY.
`.trim();

  const userPrompt = `
Assets: ${params.tickers}
Timeframe: ${params.timeframe}
Strategy Style: ${params.style}
Risk Level: ${params.riskLevel}
Max Drawdown: ${params.maxDrawdown}%
Stop Loss: ${params.stopLoss}%
Take Profit: ${params.takeProfit}%

Context (fundamentals + quant indicators + ML probability):
${params.combinedContext || "(not available)"}

Special requirements (may include aggregate score and top scored headlines):
${params.specialRequirements || "(none)"}

Write a strategy that is clearly driven by the fundamentals, the quant indicators, the ML probability, and the scored news above.
`.trim();

  return callLlm(systemPrompt, userPrompt);
}
