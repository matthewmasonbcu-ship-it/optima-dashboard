import type { ContractQuality, RiskGuardStatus, TradeLane } from "./trades";

export type AlertChannel = "DASHBOARD" | "EMAIL" | "SMS" | "PUSH";

export type ApprovalDecision = "PENDING" | "APPROVED" | "REJECTED" | "EXPIRED";

export type AlertPriority = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export type AlertOptionType = "CALL" | "PUT";

export interface TradeApprovalAlert {
  id?: string;

  // Main trade info
  symbol: string;
  lane: TradeLane;
  setupName?: string | null;
  message: string;
  priority: AlertPriority;
  channels: AlertChannel[];

  // Approval workflow
  decision: ApprovalDecision;

  // Safety info
  riskGuardStatus: RiskGuardStatus;
  riskGuardReason?: string | null;
  contractQuality?: ContractQuality | null;
  maxRiskDollars?: number | null;

  // Selected option contract info
  contractSymbol?: string | null;
  strike?: number | null;
  expiration?: string | null;
  optionType?: AlertOptionType | null;
  bid?: number | null;
  ask?: number | null;
  mid?: number | null;
  volume?: number | null;
  openInterest?: number | null;
  delta?: number | null;

  // Trade plan (underlying entry/stop/take-profit)
  entryPrice?: number | null;
  stopLoss?: number | null;
  takeProfit?: number | null;

  // Timestamps
  expiresAt?: string | null;
  createdAt?: string;
  decidedAt?: string | null;
}