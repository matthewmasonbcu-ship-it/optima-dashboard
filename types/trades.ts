export type TradeDirection = "CALL" | "PUT" | "STOCK_LONG" | "STOCK_SHORT" | "NO_TRADE";

export type TradeStatus = "OPEN" | "CLOSED" | "CANCELLED";

export type TradeLane =
  | "OPTIONS_DAY_TRADE"
  | "SWING_TRADE"
  | "POSITION_TRADE"
  | "PERSONAL_TRADER"
  | "WEALTH_BUILDER"
  | "FUNDED_ACCOUNT";

export type RiskGuardStatus = "APPROVED" | "CAUTION" | "BLOCKED" | "WAITING";

export type ContractQuality = "A+" | "A" | "B" | "C" | "BLOCKED" | "UNKNOWN";

export interface BaseTrade {
  id?: string;
  symbol: string;
  direction: TradeDirection;
  lane: TradeLane;
  status: TradeStatus;
  entryPrice?: number | null;
  exitPrice?: number | null;
  quantity?: number | null;
  riskGuardStatus?: RiskGuardStatus;
  riskGuardReason?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface OptionTradeDetails {
  optionSymbol?: string | null;
  underlyingSymbol: string;
  optionType: "call" | "put";
  strike: number;
  expiration: string;
  bid?: number | null;
  ask?: number | null;
  mid?: number | null;
  last?: number | null;
  volume?: number | null;
  openInterest?: number | null;
  contractQuality: ContractQuality;
  maxRisk?: number | null;
  overrideUsed?: boolean;
  overrideReason?: string | null;
}

export interface PaperTrade extends BaseTrade {
  lane: "OPTIONS_DAY_TRADE" | "SWING_TRADE" | "POSITION_TRADE" | "PERSONAL_TRADER";
  notes?: string | null;
  optionDetails?: OptionTradeDetails | null;
}