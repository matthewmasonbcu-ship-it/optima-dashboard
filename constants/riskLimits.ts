import { MAX_RISK_PER_TRADE_DOLLARS } from "../lib/preTradeChecks";

export const DEFAULT_RISK_LIMITS = {
  // Manual approval-queue gate (useTradeApprovalAlerts.ts). Read the canonical
  // pipeline cap so the dashboard gate matches what selection + cron enforce ($500).
  maxRiskPerTradeDollars: MAX_RISK_PER_TRADE_DOLLARS,
  maxOpenTrades: 3,
  maxAutoTradesPerDay: 3,
  allowLiveTrading: false,
  allowSandboxOrders: false,
  requirePhoneApproval: true,
  requireRiskGuardApproval: true,
  requirePreTradeChecklist: true,
  requireContractGradeForOptions: true,
} as const;

export const APPROVED_CONTRACT_GRADES = ["A+", "A", "B"] as const;

export const BLOCKED_CONTRACT_GRADES = ["C", "BLOCKED", "UNKNOWN"] as const;

export const TRADE_LANE_LABELS = {
  OPTIONS_DAY_TRADE: "Options Day Trade",
  SWING_TRADE: "Swing Trade",
  POSITION_TRADE: "Position Trade",
  PERSONAL_TRADER: "Personal Trader",
  WEALTH_BUILDER: "Wealth Builder",
  FUNDED_ACCOUNT: "Funded Account",
} as const;