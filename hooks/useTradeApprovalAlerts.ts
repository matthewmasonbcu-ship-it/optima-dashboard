"use client";

import { useState } from "react";
import type {
  AlertPriority,
  ApprovalDecision,
  TradeApprovalAlert,
} from "@/types/alerts";
import type { ContractQuality, RiskGuardStatus, TradeLane } from "@/types/trades";

type CreateTradeApprovalAlertInput = {
  symbol: string;
  lane: TradeLane;
  setupName?: string | null;
  message: string;
  priority?: AlertPriority;
  riskGuardStatus: RiskGuardStatus;
  contractQuality?: ContractQuality | null;
  maxRiskDollars?: number | null;
};

const initialTestAlerts: TradeApprovalAlert[] = [
  {
    id: "test-aapl-alert-1",
    symbol: "AAPL",
    lane: "OPTIONS_DAY_TRADE",
    setupName: "Test B-grade options setup",
    message:
      "AAPL has a test trade candidate ready for review. This is a fake local alert and does not save trades or place orders.",
    priority: "HIGH",
    channels: ["DASHBOARD"],
    decision: "PENDING",
    riskGuardStatus: "APPROVED",
    contractQuality: "B",
    maxRiskDollars: 85,
    createdAt: new Date().toISOString(),
  },
];

function createLocalAlertId(symbol: string) {
  return `local-${symbol.toLowerCase()}-${Date.now()}`;
}

export function useTradeApprovalAlerts() {
  const [alerts, setAlerts] = useState<TradeApprovalAlert[]>(initialTestAlerts);

  const createTradeAlert = (input: CreateTradeApprovalAlertInput) => {
    const newAlert: TradeApprovalAlert = {
      id: createLocalAlertId(input.symbol),
      symbol: input.symbol,
      lane: input.lane,
      setupName: input.setupName ?? null,
      message: input.message,
      priority: input.priority ?? "MEDIUM",
      channels: ["DASHBOARD"],
      decision: "PENDING",
      riskGuardStatus: input.riskGuardStatus,
      contractQuality: input.contractQuality ?? null,
      maxRiskDollars: input.maxRiskDollars ?? null,
      createdAt: new Date().toISOString(),
    };

    setAlerts((currentAlerts) => [newAlert, ...currentAlerts]);

    return newAlert;
  };

  const updateAlertDecision = (
    alertId: string,
    decision: Extract<ApprovalDecision, "PENDING" | "APPROVED" | "REJECTED">
  ) => {
    setAlerts((currentAlerts) =>
      currentAlerts.map((alert) =>
        alert.id === alertId
          ? {
              ...alert,
              decision,
              decidedAt: new Date().toISOString(),
            }
          : alert
      )
    );
  };

  const approveAlert = (alertId: string) => {
    updateAlertDecision(alertId, "APPROVED");
  };

  const rejectAlert = (alertId: string) => {
    updateAlertDecision(alertId, "REJECTED");
  };

  const reviewAlert = (alertId: string) => {
    updateAlertDecision(alertId, "PENDING");
  };

  const clearResolvedAlerts = () => {
    setAlerts((currentAlerts) =>
      currentAlerts.filter((alert) => alert.decision === "PENDING")
    );
  };

  return {
    alerts,
    createTradeAlert,
    approveAlert,
    rejectAlert,
    reviewAlert,
    updateAlertDecision,
    clearResolvedAlerts,
  };
}