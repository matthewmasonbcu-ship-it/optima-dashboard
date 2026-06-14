"use client";

import { useState } from "react";
import {
  APPROVED_CONTRACT_GRADES,
  DEFAULT_RISK_LIMITS,
} from "@/constants/riskLimits";
import { supabase } from "@/lib/supabaseClient";
import { evaluateFundedAccountSafety } from "@/lib/fundedAccountSafetyFilter";
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

  entryPrice?: number | null;
  stopLoss?: number | null;
  takeProfit?: number | null;
};

const initialTestAlerts: TradeApprovalAlert[] = [];

function createLocalAlertId(symbol: string) {
  return `local-${symbol.toLowerCase()}-${Date.now()}`;
}

function getEstimatedLimitPrice(alert: TradeApprovalAlert) {
  return alert.mid ?? alert.ask ?? alert.bid ?? null;
}

function getEstimatedOrderCost(alert: TradeApprovalAlert) {
  const estimatedLimitPrice = getEstimatedLimitPrice(alert);

  if (estimatedLimitPrice === null) {
    return null;
  }

  return estimatedLimitPrice * 100;
}

async function savePhoneAlertEvent(alert: TradeApprovalAlert) {
  const { error } = await supabase.from("phone_alert_events").insert({
    source_alert_id: alert.id ?? null,

    symbol: alert.symbol,
    trade_lane: alert.lane ?? null,
    setup_name: alert.setupName ?? null,
    message: alert.message,
    priority: alert.priority,

    channel: "DASHBOARD",
    delivery_status: "LOGGED_ONLY",
    delivery_provider: null,
    delivery_error: null,

    contract_symbol: alert.contractSymbol ?? null,
    strike: alert.strike ?? null,
    expiration: alert.expiration ?? null,
    option_type: alert.optionType ?? null,

    bid: alert.bid ?? null,
    ask: alert.ask ?? null,
    mid: alert.mid ?? null,

    contract_quality: alert.contractQuality ?? null,
    risk_guard_status: alert.riskGuardStatus ?? null,
    risk_guard_reason: alert.riskGuardReason ?? null,
    max_risk_dollars: alert.maxRiskDollars ?? null,

    sent_at: null,
    opened_at: null,

    approved_for_order: false,
  });

  if (error) {
    console.error("Failed to log phone alert event:", error);
    throw error;
  }
}

async function savePaperOrderPreview(
  alert: TradeApprovalAlert,
  approvalDecisionId: string | null
) {
  const estimatedLimitPrice = getEstimatedLimitPrice(alert);
const estimatedOrderCost = getEstimatedOrderCost(alert);

const fundedSafety = evaluateFundedAccountSafety({
  symbol: alert.symbol ?? null,
  setup_name: alert.setupName ?? null,
  contract_symbol: alert.contractSymbol ?? null,
  bid: alert.bid ?? null,
  ask: alert.ask ?? null,
  mid: alert.mid ?? null,
  estimated_limit_price: estimatedLimitPrice,
  quantity: 1,
  max_risk_dollars: alert.maxRiskDollars ?? null,
  contract_quality: alert.contractQuality ?? null,
  risk_guard_status: alert.riskGuardStatus ?? null,
  order_side: "BUY_TO_OPEN",
  order_type: "LIMIT",
  time_in_force: "DAY",
  setup_confidence: alert.setupName ?? null,
  market_regime: alert.lane ?? null,
});

const fundedSafetyNote =
  fundedSafety.status === "PASSED"
    ? `Funded Account Safety Filter: PASSED. Score: ${fundedSafety.score}.`
    : `Funded Account Safety Filter: BLOCKED FOR FUNDED FLOW ONLY. Score: ${
        fundedSafety.score
      }. Reasons: ${fundedSafety.reasons.join(" ")}`;

if (fundedSafety.status === "BLOCKED") {
  console.warn("Funded Account Safety Filter blocked funded flow only:", {
    alertId: alert.id,
    symbol: alert.symbol,
    score: fundedSafety.score,
    reasons: fundedSafety.reasons,
    warnings: fundedSafety.warnings,
  });
}

const { error } = await supabase.from("paper_order_previews").insert({
    source_alert_id: alert.id ?? null,
    approval_decision_id: approvalDecisionId,
    phone_alert_event_id: null,

    symbol: alert.symbol,
    trade_lane: alert.lane ?? null,
    setup_name: alert.setupName ?? null,

    contract_symbol: alert.contractSymbol ?? null,
    strike: alert.strike ?? null,
    expiration: alert.expiration ?? null,
    option_type: alert.optionType ?? null,

    bid: alert.bid ?? null,
    ask: alert.ask ?? null,
    mid: alert.mid ?? null,
    estimated_limit_price: estimatedLimitPrice,
    quantity: 1,
    estimated_order_cost: estimatedOrderCost,
    max_risk_dollars: alert.maxRiskDollars ?? null,

    contract_quality: alert.contractQuality ?? null,
    risk_guard_status: alert.riskGuardStatus ?? null,
    risk_guard_reason: alert.riskGuardReason ?? null,

    entry_price: alert.entryPrice ?? null,
    stop_loss: alert.stopLoss ?? null,
    take_profit: alert.takeProfit ?? null,

    preview_status: "PREVIEW_ONLY",
    broker: "TRADIER_SANDBOX",
    order_side: "BUY_TO_OPEN",
    order_type: "LIMIT",
    time_in_force: "DAY",

    approved_for_sandbox_order: false,
    approved_for_live_order: false,
    submitted_to_broker: false,
    broker_order_id: null,
    broker_response: null,

    safety_notes: `Preview only. No Tradier sandbox order submitted. No live order submitted. ${fundedSafetyNote}`,
  });

  if (error) {
    console.error("Failed to save paper order preview:", error);
    throw error;
  }
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

  const { data, error } = await supabase
    .from("trade_approval_decisions")
    .insert({
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

      approved_for_order: false,
      source: "dashboard_approval_queue",
    })
    .select("id")
    .single();

  if (error) {
    console.error("Failed to save approval decision:", error);
    throw error;
  }

  return {
    alertStatus,
    decisionId: data?.id ?? null,
  };
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
      !(APPROVED_CONTRACT_GRADES as readonly ContractQuality[]).includes(input.contractQuality)
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

      entryPrice: input.entryPrice ?? null,
      stopLoss: input.stopLoss ?? null,
      takeProfit: input.takeProfit ?? null,

      createdAt: new Date().toISOString(),
    };

    setAlerts((currentAlerts) => [newAlert, ...currentAlerts]);
    setApprovalActionStatus(
      "Contract sent to approval queue. Phone alert event logged only."
    );
    setApprovalActionError(null);

    void savePhoneAlertEvent(newAlert).catch(() => {
      setApprovalActionStatus(null);
      setApprovalActionError(
        "Approval alert was created, but phone alert event logging failed."
      );
    });

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
      const { alertStatus, decisionId } = await saveApprovalDecision(
        alert,
        decision
      );

      if (decision === "APPROVED") {
        await savePaperOrderPreview(alert, decisionId);
      }

      updateAlertDecision(alertId, decision);

      setApprovalActionStatus(
        alertStatus === "APPROVED"
          ? "Approval saved. Paper order preview created. No broker order placed."
          : alertStatus === "REJECTED"
          ? "Rejection saved to audit trail."
          : "Review decision saved to audit trail."
      );
    } catch {
      setApprovalActionError(
        "Decision was not fully saved. Check Supabase connection and try again."
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