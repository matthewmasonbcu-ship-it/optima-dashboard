"use client";

import { useState } from "react";
import { supabase } from "../lib/supabaseClient";

type TestControlPanelProps = {
  onActionComplete?: () => void;
};

export default function TestControlPanel({
  onActionComplete,
}: TestControlPanelProps) {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("Ready.");

  const closeOpenTradesAsBreakEven = async () => {
    setLoading(true);
    setMessage("Closing open trades as BE...");

    const { data: openTrades, error: fetchError } = await supabase
      .from("paper_trades")
      .select("id, entry_price, status")
      .eq("status", "OPEN");

    if (fetchError) {
      console.error("Failed to fetch open trades:", fetchError);
      setMessage(`Failed to fetch open trades: ${fetchError.message}`);
      setLoading(false);
      return;
    }

    if (!openTrades || openTrades.length === 0) {
      setMessage("No open trades to close.");
      setLoading(false);
      return;
    }

    for (const trade of openTrades) {
      const entryPrice = Number(trade.entry_price ?? 0);

      const { error: updateError } = await supabase
        .from("paper_trades")
        .update({
          status: "CLOSED",
          result: "BE",
          pnl: 0,
          exit_price: entryPrice,
          closed_at: new Date().toISOString(),
        })
        .eq("id", trade.id);

      if (updateError) {
        console.error("Failed to close trade:", updateError);
        setMessage(`Failed to close trade: ${updateError.message}`);
        setLoading(false);
        return;
      }
    }

    setMessage(`Closed ${openTrades.length} open trade(s) as BE.`);
    setLoading(false);

    if (onActionComplete) {
      onActionComplete();
    }
  };

  const resetTodayAutoTradeCount = async () => {
    setLoading(true);
    setMessage("Resetting today's auto trade count...");

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const { error } = await supabase
      .from("paper_trades")
      .update({
        strategy: "manual",
      })
      .gte("created_at", todayStart.toISOString())
      .eq("strategy", "auto");

    if (error) {
      console.error("Failed to reset auto trade count:", error);
      setMessage(`Failed to reset auto trade count: ${error.message}`);
      setLoading(false);
      return;
    }

    setMessage("Today's auto trade count reset to 0.");
    setLoading(false);

    if (onActionComplete) {
      onActionComplete();
    }
  };

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-xl">
      <div className="mb-4">
        <h2 className="text-2xl font-bold">Test Control Panel</h2>
        <p className="text-slate-400">
          Use this while testing. It closes open trades safely or resets today&apos;s auto count.
        </p>
      </div>

      <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">
        <p className="text-sm text-slate-400">Test Status</p>
        <p className="mt-1 font-medium text-slate-100">{message}</p>
      </div>

      <div className="mt-5 flex flex-col gap-3 md:flex-row">
        <button
          onClick={closeOpenTradesAsBreakEven}
          disabled={loading}
          className="rounded-xl bg-yellow-600 px-5 py-3 font-semibold text-white hover:bg-yellow-500 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? "Working..." : "Close Open Trades as BE"}
        </button>

        <button
          onClick={resetTodayAutoTradeCount}
          disabled={loading}
          className="rounded-xl bg-slate-700 px-5 py-3 font-semibold text-white hover:bg-slate-600 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? "Working..." : "Reset Today Auto Count"}
        </button>
      </div>
    </div>
  );
}