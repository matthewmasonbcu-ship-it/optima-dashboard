export const DEFAULT_RISK_LIMITS = {
  maxRiskPerTradeDollars: 100,
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