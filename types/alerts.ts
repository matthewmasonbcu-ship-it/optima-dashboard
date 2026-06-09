import type { ContractQuality, RiskGuardStatus, TradeLane } from "./trades";

export type AlertChannel = "DASHBOARD" | "EMAIL" | "SMS" | "PUSH";

export type ApprovalDecision = "PENDING" | "APPROVED" | "REJECTED" | "EXPIRED";

export type AlertPriority = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export interface TradeApprovalAlert {
  id?: string;
  symbol: string;
  lane: TradeLane;
  setupName?: string | null;
  message: string;
  priority: AlertPriority;
  channels: AlertChannel[];
  decision: ApprovalDecision;
  riskGuardStatus: RiskGuardStatus;
  contractQuality?: ContractQuality | null;
  maxRiskDollars?: number | null;
  expiresAt?: string | null;
  createdAt?: string;
  decidedAt?: string | null;
}