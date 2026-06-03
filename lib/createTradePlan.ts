import type { Scan } from "@/lib/dashboardTypes";

export function createTradePlan(scan: Scan) {
  return {
    ticker: scan.ticker,
    decision: scan.decision,
    strategy: scan.strategy,
    entry: scan.entry,
    stopLoss: scan.stopLoss,
    takeProfit: scan.takeProfit,
    riskReward: "1:2",
    notes:
      scan.grade === "A"
        ? "Strong setup. Only take with confirmation and proper risk control."
        : scan.grade === "B"
        ? "Decent setup. Watch closely and wait for confirmation."
        : "Lower-quality setup. Avoid forcing the trade.",
  };
}