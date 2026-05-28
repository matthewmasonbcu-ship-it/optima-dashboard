import type { MarketScan } from "@/lib/mockScans";

export type TradePlan = {
  ticker: string;
  bias: string;
  action: string;
  entryZone: string;
  stopRule: string;
  profitRule: string;
  riskLevel: "Low" | "Medium" | "High";
  notes: string;
};

export function createTradePlan(scan: MarketScan): TradePlan {
  const isASetup = scan.setupGrade === "A";
  const isBSetup = scan.setupGrade === "B";

  if (isASetup) {
    return {
      ticker: scan.ticker,
      bias: scan.trend,
      action: "Paper Trade Candidate",
      entryZone: `Watch near $${scan.price.toFixed(2)} for confirmation`,
      stopRule: "Skip or exit paper trade if setup drops below B quality",
      profitRule: "Take partial profits if momentum fades or RSI becomes overheated",
      riskLevel: scan.rsi > 65 ? "Medium" : "Low",
      notes:
        "This is the strongest setup type. Still requires confirmation before any real-money trade.",
    };
  }

  if (isBSetup) {
    return {
      ticker: scan.ticker,
      bias: scan.trend,
      action: "Watchlist Only",
      entryZone: `Do not chase. Wait for stronger confirmation near $${scan.price.toFixed(2)}`,
      stopRule: "Avoid if volume weakens or RSI falls below 50",
      profitRule: "No profit target yet because this is not a full trade candidate",
      riskLevel: "Medium",
      notes:
        "This setup has potential, but it is not strong enough to force a trade.",
    };
  }

  return {
    ticker: scan.ticker,
    bias: scan.trend,
    action: "No Trade",
    entryZone: "No entry zone. Setup is not clean enough.",
    stopRule: "Skip until the scanner upgrades the setup",
    profitRule: "No profit target because there is no trade",
    riskLevel: "High",
    notes:
      "The system is protecting capital by avoiding unclear or weak setups.",
  };
}