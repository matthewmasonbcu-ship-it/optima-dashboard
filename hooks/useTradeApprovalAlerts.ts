"use client";

import { useState } from "react";
import type { ApprovalDecision, TradeApprovalAlert } from "@/types/alerts";

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

export function useTradeApprovalAlerts() {
  const [alerts, setAlerts] = useState<TradeApprovalAlert[]>(initialTestAlerts);

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

  return {
    alerts,
    approveAlert,
    rejectAlert,
    reviewAlert,
    updateAlertDecision,
  };
}