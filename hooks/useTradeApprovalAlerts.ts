"use client";

import { useState } from "react";
import {
  APPROVED_CONTRACT_GRADES,
  DEFAULT_RISK_LIMITS,
} from "@/constants/riskLimits";
import { supabase } from "@/lib/supabaseClient";
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
  riskGuardReason?: string | null;
  contractQuality?: ContractQuality | null;
  maxRiskDollars?: number | null;

  contractSymbol?: string | null;
  strike?: number | null;
  expiration?: string | null;
  optionType?: "CALL" | "PUT" | null;
  bid?: number | null;
  ask?: number | null;
  mid?: number | null;
  volume?: number | null;
  openInterest?: number | null;
  delta?: number | null;
};

const initialTestAlerts: TradeApprovalAlert[] = [];

function createLocalAlertId(symbol: string) {
  return `local-${symbol.toLowerCase()}-${Date.now()}`;
}

async function saveApprovalDecision(
  alert: TradeApprovalAlert,
  decision: Extract<ApprovalDecision, "APPROVED" | "REJECTED" | "PENDING">
) {
  const alertStatus =
    decision === "APPROVED"
      ? "APPROVED"
      : decision === "REJECTED"
      ? "REJECTED"
      : "REVIEW";

  const decisionReason =
    alertStatus === "APPROVED"
      ? "Approved from dashboard approval queue"
      : alertStatus === "REJECTED"
      ? "Rejected from dashboard approval queue"
      : "Marked for review from dashboard approval queue";

  const { error } = await supabase.from("trade_approval_decisions").insert({
    symbol: alert.symbol,
    direction: alert.lane ?? null,

    contract_symbol: alert.contractSymbol ?? null,
    strike: alert.strike ?? null,
    expiration: alert.expiration ?? null,
    option_type: alert.optionType ?? null,

    contract_quality: alert.contractQuality ?? null,
    risk_guard_status: alert.riskGuardStatus ?? null,
    risk_guard_reason: alert.riskGuardReason ?? null,

    scanner_setup_name: alert.setupName ?? null,
    alert_status: alertStatus,
    decision_reason: decisionReason,

    // Safety lock: approving an alert does NOT approve a broker order yet.
    approved_for_order: false,
    source: "dashboard_approval_queue",
  });

  if (error) {
    console.error("Failed to save approval decision:", error);
    throw error;
  }

  return alertStatus;
}

export function useTradeApprovalAlerts() {
  const [alerts, setAlerts] = useState<TradeApprovalAlert[]>(initialTestAlerts);
  const [approvalActionStatus, setApprovalActionStatus] = useState<string | null>(
    null
  );
  const [approvalActionError, setApprovalActionError] = useState<string | null>(
    null
  );
  const [isSavingApprovalDecision, setIsSavingApprovalDecision] = useState(false);

  const createTradeAlert = (input: CreateTradeApprovalAlertInput) => {
    if (input.riskGuardStatus !== "APPROVED") {
      setApprovalActionStatus(null);
      setApprovalActionError(
        `${input.symbol} was not sent to approval queue because Risk Guard is ${input.riskGuardStatus}.`
      );

      return null;
    }

    if (
      !input.contractQuality ||
      !APPROVED_CONTRACT_GRADES.includes(input.contractQuality)
    ) {
      setApprovalActionStatus(null);
      setApprovalActionError(
        `${input.symbol} was not sent to approval queue because Contract Quality is ${
          input.contractQuality ?? "UNKNOWN"
        }.`
      );

      return null;
    }

    const maxRiskLimit = DEFAULT_RISK_LIMITS.maxRiskPerTradeDollars;
    const maxRiskDollars = input.maxRiskDollars ?? null;

    if (maxRiskDollars === null || maxRiskDollars <= 0) {
      setApprovalActionStatus(null);
      setApprovalActionError(
        `${input.symbol} was not sent to approval queue because max risk is missing.`
      );

      return null;
    }

    if (maxRiskDollars > maxRiskLimit) {
      setApprovalActionStatus(null);
      setApprovalActionError(
        `${input.symbol} was not sent to approval queue because max risk is $${maxRiskDollars.toFixed(
          2
        )}, above the $${maxRiskLimit.toFixed(2)} limit.`
      );

      return null;
    }

    const duplicatePendingAlert = alerts.find((alert) => {
      const sameSymbol = alert.symbol === input.symbol;
      const sameLane = alert.lane === input.lane;
      const sameContract =
        (alert.contractSymbol ?? null) === (input.contractSymbol ?? null);
      const isPending = alert.decision === "PENDING";

      return sameSymbol && sameLane && sameContract && isPending;
    });

    if (duplicatePendingAlert) {
      setApprovalActionStatus(
        `${input.symbol} already has a pending approval alert. Duplicate blocked.`
      );
      setApprovalActionError(null);

      return duplicatePendingAlert;
    }

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
      riskGuardReason: input.riskGuardReason ?? null,
      contractQuality: input.contractQuality ?? null,
      maxRiskDollars,

      contractSymbol: input.contractSymbol ?? null,
      strike: input.strike ?? null,
      expiration: input.expiration ?? null,
      optionType: input.optionType ?? null,
      bid: input.bid ?? null,
      ask: input.ask ?? null,
      mid: input.mid ?? null,
      volume: input.volume ?? null,
      openInterest: input.openInterest ?? null,
      delta: input.delta ?? null,

      createdAt: new Date().toISOString(),
    };

    setAlerts((currentAlerts) => [newAlert, ...currentAlerts]);
    setApprovalActionStatus("Contract sent to approval queue.");
    setApprovalActionError(null);

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

  const handleDecision = async (
    alertId: string,
    decision: Extract<ApprovalDecision, "APPROVED" | "REJECTED" | "PENDING">
  ) => {
    const alert = alerts.find((currentAlert) => currentAlert.id === alertId);
    if (!alert) return;

    setIsSavingApprovalDecision(true);
    setApprovalActionStatus(null);
    setApprovalActionError(null);

    try {
      const savedStatus = await saveApprovalDecision(alert, decision);
      updateAlertDecision(alertId, decision);

      setApprovalActionStatus(
        savedStatus === "APPROVED"
          ? "Approval saved to audit trail."
          : savedStatus === "REJECTED"
          ? "Rejection saved to audit trail."
          : "Review decision saved to audit trail."
      );
    } catch {
      setApprovalActionError(
        "Decision was not saved. Check Supabase connection and try again."
      );
    } finally {
      setIsSavingApprovalDecision(false);
    }
  };

  const approveAlert = async (alertId: string) => {
    await handleDecision(alertId, "APPROVED");
  };

  const rejectAlert = async (alertId: string) => {
    await handleDecision(alertId, "REJECTED");
  };

  const reviewAlert = async (alertId: string) => {
    await handleDecision(alertId, "PENDING");
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

    approvalActionStatus,
    approvalActionError,
    isSavingApprovalDecision,
  };
}