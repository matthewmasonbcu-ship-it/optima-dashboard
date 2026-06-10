"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type ApprovalHistoryRow = {
  id: string;
  created_at: string;
  symbol: string;
  contract_symbol: string | null;
  strike: number | null;
  expiration: string | null;
  option_type: string | null;
  contract_quality: string | null;
  risk_guard_status: string | null;
  alert_status: string;
  approved_for_order: boolean;
};

type ApprovalHistoryPanelProps = {
  refreshKey?: string;
};

function formatDateTime(value: string) {
  return new Date(value).toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function getStatusBadgeClass(status: string) {
  if (status === "APPROVED") {
    return "border-emerald-500/40 bg-emerald-500/10 text-emerald-300";
  }

  if (status === "REJECTED") {
    return "border-red-500/40 bg-red-500/10 text-red-300";
  }

  return "border-yellow-500/40 bg-yellow-500/10 text-yellow-300";
}

export default function ApprovalHistoryPanel({
  refreshKey,
}: ApprovalHistoryPanelProps) {
  const [approvalHistory, setApprovalHistory] = useState<ApprovalHistoryRow[]>(
    []
  );
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadApprovalHistory() {
      setIsLoadingHistory(true);
      setHistoryError(null);

      const { data, error } = await supabase
        .from("trade_approval_decisions")
        .select(
          "id, created_at, symbol, contract_symbol, strike, expiration, option_type, contract_quality, risk_guard_status, alert_status, approved_for_order"
        )
        .order("created_at", { ascending: false })
        .limit(8);

      if (!isMounted) return;

      if (error) {
        console.error("Failed to load approval history:", error);
        setHistoryError("Could not load approval history.");
        setApprovalHistory([]);
      } else {
        setApprovalHistory((data ?? []) as ApprovalHistoryRow[]);
      }

      setIsLoadingHistory(false);
    }

    loadApprovalHistory();

    return () => {
      isMounted = false;
    };
  }, [refreshKey]);

  return (
    <div className="mt-6 rounded-2xl border border-slate-800 bg-black/20 p-4">
      <div className="mb-4 flex flex-col gap-1 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.25em] text-slate-500">
            Audit Trail
          </p>

          <h3 className="mt-1 text-lg font-bold text-white">
            Recent Approval Decisions
          </h3>
        </div>

        <p className="text-xs text-slate-500">
          Saved from Supabase approval history
        </p>
      </div>

      {isLoadingHistory ? (
        <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4 text-sm text-slate-400">
          Loading approval history...
        </div>
      ) : historyError ? (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">
          {historyError}
        </div>
      ) : approvalHistory.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-700 bg-slate-950/50 p-4 text-sm text-slate-500">
          No approval decisions saved yet.
        </div>
      ) : (
        <div className="space-y-3">
          {approvalHistory.map((row) => (
            <div
              key={row.id}
              className="rounded-xl border border-slate-800 bg-slate-950/70 p-4"
            >
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-bold text-white">{row.symbol}</p>

                    {row.option_type && (
                      <span className="rounded-full border border-slate-700 px-2 py-1 text-xs font-bold text-slate-300">
                        {row.option_type}
                      </span>
                    )}

                    {row.contract_quality && (
                      <span className="rounded-full border border-sky-500/40 bg-sky-500/10 px-2 py-1 text-xs font-bold text-sky-300">
                        Grade {row.contract_quality}
                      </span>
                    )}

                    <span
                      className={`rounded-full border px-2 py-1 text-xs font-bold ${getStatusBadgeClass(
                        row.alert_status
                      )}`}
                    >
                      {row.alert_status}
                    </span>
                  </div>

                  <p className="mt-2 text-sm text-slate-400">
                    {row.contract_symbol || "No contract symbol saved"}
                  </p>

                  <div className="mt-2 flex flex-wrap gap-3 text-xs text-slate-500">
                    {row.strike !== null && <span>Strike: {row.strike}</span>}
                    {row.expiration && <span>Exp: {row.expiration}</span>}
                    {row.risk_guard_status && (
                      <span>Risk Guard: {row.risk_guard_status}</span>
                    )}
                  </div>
                </div>

                <div className="text-left md:text-right">
                  <p className="text-xs text-slate-500">
                    {formatDateTime(row.created_at)}
                  </p>

                  <p className="mt-1 text-xs font-bold text-slate-400">
                    Order Approved: {row.approved_for_order ? "YES" : "NO"}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}