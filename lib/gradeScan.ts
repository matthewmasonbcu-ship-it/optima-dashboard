import type { MarketScan, SetupGrade, TradeDecision } from "@/lib/mockScans";

function getSetupGrade(scan: MarketScan): SetupGrade {
  const isBullish = scan.trend === "Bullish";
  const isBearish = scan.trend === "Bearish";
  const strongVolume = scan.volumeScore >= 85;
  const goodVolume = scan.volumeScore >= 70;
  const healthyRsi = scan.rsi >= 50 && scan.rsi <= 68;
  const overheatedRsi = scan.rsi > 72;
  const weakRsi = scan.rsi < 45;
  const positiveMove = scan.changePercent > 0;

  if (isBearish || weakRsi) {
    return "AVOID";
  }

  if (isBullish && strongVolume && healthyRsi && positiveMove) {
    return "A";
  }

  if (isBullish && goodVolume && scan.rsi >= 48 && !overheatedRsi) {
    return "B";
  }

  return "C";
}

function getTradeDecision(grade: SetupGrade): TradeDecision {
  if (grade === "A") return "TAKE_TRADE";
  if (grade === "B") return "WATCH_CLOSELY";
  if (grade === "C") return "WAIT";
  return "SKIP";
}

function getReason(scan: MarketScan, grade: SetupGrade): string {
  if (grade === "A") {
    return "Strong bullish setup with high volume, healthy RSI, and positive price action.";
  }

  if (grade === "B") {
    return "Decent bullish structure, but it needs stronger confirmation before becoming an A setup.";
  }

  if (grade === "C") {
    return "Mixed conditions. There is not enough edge yet to justify forcing a trade.";
  }

  return "Weak or risky conditions. The setup should be skipped until strength returns.";
}

export function gradeScan(scan: MarketScan): MarketScan {
  const setupGrade = getSetupGrade(scan);
  const decision = getTradeDecision(setupGrade);
  const reason = getReason(scan, setupGrade);

  return {
    ...scan,
    setupGrade,
    decision,
    reason,
  };
}