export type MarketCondition = {
  label: "BULLISH" | "BEARISH" | "CHOPPY";
  scoreAdjustment: number;
  bias: "CALL" | "PUT" | "NEUTRAL";
  reason: string;
};

type MarketQuote = {
  currentPrice: number;
  percentChange: number;
  high: number;
  low: number;
  open: number;
  previousClose: number;
};

export function getMarketCondition(spyQuote: MarketQuote | null): MarketCondition {
  if (!spyQuote) {
    return {
      label: "CHOPPY",
      scoreAdjustment: -8,
      bias: "NEUTRAL",
      reason: "SPY data unavailable, reducing risk.",
    };
  }

  const price = Number(spyQuote.currentPrice ?? 0);
  const open = Number(spyQuote.open ?? 0);
  const high = Number(spyQuote.high ?? 0);
  const low = Number(spyQuote.low ?? 0);
  const percentChange = Number(spyQuote.percentChange ?? 0);

  const dayRange = Math.max(high - low, 0.01);
  const positionInRange = (price - low) / dayRange;

  const aboveOpen = price > open;
  const belowOpen = price < open;

  if (percentChange >= 0.35 && aboveOpen && positionInRange >= 0.6) {
    return {
      label: "BULLISH",
      scoreAdjustment: 6,
      bias: "CALL",
      reason: "SPY is green, above open, and trading in the upper part of its daily range.",
    };
  }

  if (percentChange <= -0.35 && belowOpen && positionInRange <= 0.4) {
    return {
      label: "BEARISH",
      scoreAdjustment: 6,
      bias: "PUT",
      reason: "SPY is red, below open, and trading in the lower part of its daily range.",
    };
  }

  return {
    label: "CHOPPY",
    scoreAdjustment: -10,
    bias: "NEUTRAL",
    reason: "SPY is not showing clean directional strength, so trade quality is reduced.",
  };
}