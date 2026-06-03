import type { Scan } from "@/lib/dashboardTypes";
import { getDecision, getGrade, getStrategy } from "@/lib/gradeScan";

const TICKERS = [
  "AAPL",
  "TSLA",
  "NVDA",
  "AMD",
  "META",
  "MSFT",
  "AMZN",
  "QQQ",
  "SPY",
  "NFLX",
];

function randomBetween(min: number, max: number) {
  return Number((Math.random() * (max - min) + min).toFixed(2));
}

export function buildMockScan(): Scan {
  const ticker = TICKERS[Math.floor(Math.random() * TICKERS.length)];
  const price = randomBetween(80, 700);

  const momentum = randomBetween(35, 100);
  const volume = randomBetween(35, 100);
  const trend = randomBetween(35, 100);
  const volatility = randomBetween(20, 95);

  const score = Number(
    (momentum * 0.35 + volume * 0.25 + trend * 0.3 + volatility * 0.1).toFixed(1)
  );

  const grade = getGrade(score);
  const decision = getDecision(grade);
  const strategy = getStrategy(grade);

  const entry = Number(price.toFixed(2));
  const stopLoss = Number((entry * 0.97).toFixed(2));
  const takeProfit = Number((entry * 1.06).toFixed(2));

  return {
    id: crypto.randomUUID(),
    ticker,
    price,
    momentum,
    volume,
    trend,
    volatility,
    score,
    grade,
    decision,
    strategy,
    entry,
    stopLoss,
    takeProfit,
    confidence: score,
    createdAt: new Date().toISOString(),
  };
}