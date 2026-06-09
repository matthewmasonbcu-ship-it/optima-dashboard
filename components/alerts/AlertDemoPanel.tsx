"use client";

import { useState } from "react";
import type { ApprovalDecision, TradeApprovalAlert } from "@/types/alerts";
import TradeApprovalCard from "./TradeApprovalCard";

export default function AlertDemoPanel() {
  const [decision, setDecision] = useState<ApprovalDecision>("PENDING");

  const demoAlert: TradeApprovalAlert = {
    symbol: "AAPL",
    lane: "OPTIONS_DAY_TRADE",
    setupName: "Demo B-grade options setup",
    message:
      "AAPL has a demo trade candidate ready for review. This is dashboard-only testing and does not place any order.",
    priority: "HIGH",
    channels: ["DASHBOARD"],
    decision,
    riskGuardStatus: "APPROVED",
    contractQuality: "B",
    maxRiskDollars: 85,
    createdAt: new Date().toISOString(),
  };

  return (
    <section className="rounded-2xl border border-slate-800 bg-slate-950/60 p-5">
      <div className="mb-4">
        <p className="text-xs uppercase tracking-[0.25em] text-slate-500">
          Alert / Approval Foundation
        </p>
        <h2 className="mt-1 text-xl font-bold text-white">
          Dashboard Approval Demo
        </h2>
        <p className="mt-2 text-sm text-slate-400">
          This is a safe visual test. It does not save trades, send alerts, or
          place orders.
        </p>
      </div>

      <TradeApprovalCard
        alert={demoAlert}
        onReview={() => setDecision("PENDING")}
        onApprove={() => setDecision("APPROVED")}
        onReject={() => setDecision("REJECTED")}
      />
    </section>
  );
}