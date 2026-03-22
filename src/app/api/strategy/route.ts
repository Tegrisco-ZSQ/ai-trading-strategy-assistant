import { NextResponse } from "next/server";
import { z } from "zod";

import { runStrategyPipeline } from "@/lib/strategy-pipeline";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const requestSchema = z.object({
  tickers: z.string().min(1, "Tickers are required."),
  timeframe: z.enum(["Intraday", "Daily", "Weekly"]),
  style: z.enum(["Momentum", "Mean Reversion", "Breakout", "Event-driven"]),
  riskLevel: z.enum(["Conservative", "Balanced", "Aggressive"]),
  newsDays: z.number().int().min(1).max(30),
  maxNews: z.number().int().min(3).max(15),
  maxDrawdown: z.number().min(1).max(30),
  stopLoss: z.number().min(0.5).max(20),
  takeProfit: z.number().min(1).max(40),
  specialRequirements: z.string().optional()
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = requestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Invalid input payload.",
          details: parsed.error.flatten()
        },
        { status: 400 }
      );
    }

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        {
          error: "Server is missing OPENAI_API_KEY. Add it to environment variables before running."
        },
        { status: 500 }
      );
    }

    const result = await runStrategyPipeline(parsed.data);
    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected server error.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
