export const DEFAULT_WATCHLIST = ["SPY", "AAPL", "MSFT", "NVDA", "TSLA"];

export type MarketCondition = "BULLISH" | "BEARISH" | "CHOPPY" | "UNKNOWN";
export type TradeDirection = "CALL" | "PUT" | "NO TRADE";

export type QuoteData = {
  c: number;
  d?: number;
  dp?: number;
  h?: number;
  l?: number;
  o?: number;
  pc?: number;
};

export type ScanResult = {
  symbol: string;
  price?: number;
  changePercent?: number;
  direction?: TradeDirection;
  tradeDirection?: TradeDirection;
  directionBias?: "BULLISH" | "BEARISH" | "NEUTRAL";
  setupScore?: number;
  confidenceScore?: number;
  confidence_score?: number;
  trendStrength?: number;
  trend_strength?: number;
  volumeConfirmation?: boolean;
  volume_confirmation?: boolean;
  marketAlignment?: boolean;
  market_alignment?: boolean;
  riskReward?: number;
  risk_reward?: number;
  stopLoss?: number;
  stop_loss?: number;
  takeProfit?: number;
  take_profit?: number;
  entryPrice?: number;
  entry_price?: number;
  blockReasons?: string[];
  block_reasons?: string[];
  tradeSummary?: string;
  trade_summary?: string;
  optionCandidateType?: string;
  preferredExpirationWindow?: string;
  preferredMoneyness?: string;
  liquidityWarning?: string;
  contractSelectionStatus?: string;
};

export function getNumber(value: any, fallback?: number): number;
export function getNumber(value: any, fallback: null): number | null;
export function getNumber(value: any, fallback: number | null = 0): number | null {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

export async function fetchQuote(
  symbol: string,
  baseUrl = ""
): Promise<QuoteData | null> {
  try {
    const res = await fetch(`${baseUrl}/api/quote?symbol=${encodeURIComponent(symbol)}`, {
      cache: "no-store",
    });

    const data = await res.json();

    if (!res.ok || !data?.success || !data?.quote) {
      console.error("QUOTE FAILED:", symbol, data);
      return null;
    }

    const quote = data.quote;

    if (!quote || typeof quote.c !== "number" || quote.c <= 0) {
      console.error("INVALID QUOTE:", symbol, quote);
      return null;
    }

    return quote;
  } catch (error) {
    console.error("fetchQuote error:", symbol, error);
    return null;
  }
}

export function classifyMarketCondition(spyQuote: QuoteData | null): MarketCondition {
  if (!spyQuote || typeof spyQuote.dp !== "number") return "UNKNOWN";

  const percentChange = spyQuote.dp;

  if (percentChange >= 0.35) return "BULLISH";
  if (percentChange <= -0.35) return "BEARISH";
  return "CHOPPY";
}

export function analyzeSetup(
  symbol: string,
  quote: QuoteData,
  marketCondition: MarketCondition
): ScanResult {
  const price = quote.c;
  const changePercent = getNumber(quote.dp, 0);

  let direction: TradeDirection = "NO TRADE";
  let directionBias: "BULLISH" | "BEARISH" | "NEUTRAL" = "NEUTRAL";

  if (changePercent >= 0.35) {
    direction = "CALL";
    directionBias = "BULLISH";
  } else if (changePercent <= -0.35) {
    direction = "PUT";
    directionBias = "BEARISH";
  }

  const momentumScore = Math.min(40, Math.abs(changePercent) * 10);

  const marketScore =
    marketCondition === "BULLISH" && direction === "CALL"
      ? 25
      : marketCondition === "BEARISH" && direction === "PUT"
      ? 25
      : marketCondition === "CHOPPY"
      ? -10
      : 5;

  const rangeScore =
    quote.h && quote.l && quote.h > quote.l
      ? Math.min(20, ((price - quote.l) / (quote.h - quote.l)) * 20)
      : 10;

  const setupScore = Math.max(
    0,
    Math.min(100, Math.round(momentumScore + marketScore + rangeScore + 25))
  );

  const confidenceScore = Math.max(
    0,
    Math.min(100, Math.round(setupScore + (direction === "NO TRADE" ? -20 : 5)))
  );

  const marketAlignment =
    (marketCondition === "BULLISH" && direction === "CALL") ||
    (marketCondition === "BEARISH" && direction === "PUT");

  const blockReasons: string[] = [];

  if (direction === "NO TRADE") {
    blockReasons.push("No clear bullish or bearish direction.");
  }

  if (marketCondition === "CHOPPY") {
    blockReasons.push("Market is CHOPPY.");
  }

  if (
    !marketAlignment &&
    marketCondition !== "UNKNOWN" &&
    marketCondition !== "CHOPPY"
  ) {
    blockReasons.push("Setup does not align with market condition.");
  }

  const stopLoss =
    direction === "CALL"
      ? price * 0.985
      : direction === "PUT"
      ? price * 1.015
      : price * 0.99;

  const takeProfit =
    direction === "CALL"
      ? price * 1.03
      : direction === "PUT"
      ? price * 0.97
      : price * 1.01;

  return {
    symbol,
    price,
    changePercent,
    direction,
    tradeDirection: direction,
    directionBias,
    setupScore,
    confidenceScore,
    confidence_score: confidenceScore,
    trendStrength: Math.round(momentumScore),
    trend_strength: Math.round(momentumScore),
    volumeConfirmation: true,
    volume_confirmation: true,
    marketAlignment,
    market_alignment: marketAlignment,
    riskReward: 2,
    risk_reward: 2,
    stopLoss,
    stop_loss: stopLoss,
    takeProfit,
    take_profit: takeProfit,
    entryPrice: price,
    entry_price: price,
    blockReasons,
    block_reasons: blockReasons,
    tradeSummary:
      direction === "NO TRADE"
        ? `${symbol} has no clean setup right now.`
        : `${symbol} has a ${direction} setup with ${confidenceScore}% confidence.`,
    trade_summary:
      direction === "NO TRADE"
        ? `${symbol} has no clean setup right now.`
        : `${symbol} has a ${direction} setup with ${confidenceScore}% confidence.`,
    optionCandidateType:
      direction === "CALL" ? "CALL" : direction === "PUT" ? "PUT" : "NONE",
    preferredExpirationWindow: "7-21 DTE",
    preferredMoneyness: "Near the money",
    liquidityWarning: "Use contract filters before saving.",
    contractSelectionStatus:
      direction === "NO TRADE" ? "WAIT" : "READY_FOR_CONTRACT",
  };
}

export function sortScanResults(results: ScanResult[]): ScanResult[] {
  return [...results].sort((a, b) => (b.setupScore ?? 0) - (a.setupScore ?? 0));
}
