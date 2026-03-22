"use client";

import { FormEvent, useState } from "react";
import { Settings2 } from "lucide-react";

import { StrategyRequestPayload } from "@/types/trading";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface StrategyFormProps {
  isLoading: boolean;
  onSubmit: (payload: StrategyRequestPayload) => Promise<void>;
}

const defaultForm: StrategyRequestPayload = {
  tickers: "AAPL",
  timeframe: "Daily",
  style: "Momentum",
  riskLevel: "Balanced",
  newsDays: 7,
  maxNews: 6,
  maxDrawdown: 10,
  stopLoss: 3,
  takeProfit: 6,
  specialRequirements: ""
};

export function StrategyForm({ isLoading, onSubmit }: StrategyFormProps) {
  const [form, setForm] = useState<StrategyRequestPayload>(defaultForm);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await onSubmit(form);
  }

  return (
    <Card className="border-slate-800/90 bg-slate-900">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-white">
          <Settings2 className="h-4 w-4 text-blue-400" />
          Trade Controls
        </CardTitle>
        <CardDescription>Configure symbols, constraints, and execution preferences.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="tickers">Tickers</Label>
            <Input
              id="tickers"
              value={form.tickers}
              onChange={(event) => setForm((current) => ({ ...current, tickers: event.target.value }))}
              placeholder="AAPL, MSFT, NVDA"
              required
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="timeframe">Timeframe</Label>
              <Select
                id="timeframe"
                value={form.timeframe}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    timeframe: event.target.value as StrategyRequestPayload["timeframe"]
                  }))
                }
              >
                <option value="Intraday">Intraday</option>
                <option value="Daily">Daily</option>
                <option value="Weekly">Weekly</option>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="style">Style</Label>
              <Select
                id="style"
                value={form.style}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    style: event.target.value as StrategyRequestPayload["style"]
                  }))
                }
              >
                <option value="Momentum">Momentum</option>
                <option value="Mean Reversion">Mean Reversion</option>
                <option value="Breakout">Breakout</option>
                <option value="Event-driven">Event-driven</option>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="riskLevel">Risk Level</Label>
            <Select
              id="riskLevel"
              value={form.riskLevel}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  riskLevel: event.target.value as StrategyRequestPayload["riskLevel"]
                }))
              }
            >
              <option value="Conservative">Conservative</option>
              <option value="Balanced">Balanced</option>
              <option value="Aggressive">Aggressive</option>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="specialRequirements">Special Requirements</Label>
            <Textarea
              id="specialRequirements"
              value={form.specialRequirements}
              onChange={(event) => setForm((current) => ({ ...current, specialRequirements: event.target.value }))}
              rows={4}
              placeholder="Long-only; no leverage; avoid earnings week; max 3 trades/week..."
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <NumberField
              label="News Days"
              min={1}
              max={30}
              step={1}
              value={form.newsDays}
              onChange={(value) => setForm((current) => ({ ...current, newsDays: value }))}
            />
            <NumberField
              label="Max Headlines"
              min={3}
              max={15}
              step={1}
              value={form.maxNews}
              onChange={(value) => setForm((current) => ({ ...current, maxNews: value }))}
            />
            <NumberField
              label="Max Drawdown %"
              min={1}
              max={30}
              step={1}
              value={form.maxDrawdown}
              onChange={(value) => setForm((current) => ({ ...current, maxDrawdown: value }))}
            />
            <NumberField
              label="Stop Loss %"
              min={0.5}
              max={20}
              step={0.5}
              value={form.stopLoss}
              onChange={(value) => setForm((current) => ({ ...current, stopLoss: value }))}
            />
          </div>

          <NumberField
            label="Take Profit %"
            min={1}
            max={40}
            step={1}
            value={form.takeProfit}
            onChange={(value) => setForm((current) => ({ ...current, takeProfit: value }))}
          />

          <Button type="submit" disabled={isLoading} className="w-full">
            {isLoading ? "Building Strategy..." : "Generate Strategy"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

interface NumberFieldProps {
  label: string;
  min: number;
  max: number;
  step: number;
  value: number;
  onChange: (value: number) => void;
}

function NumberField({ label, min, max, step, value, onChange }: NumberFieldProps) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Input
        type="number"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
      />
    </div>
  );
}
