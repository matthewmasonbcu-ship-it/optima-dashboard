"use client";

import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";

type AutoTrade = {
  id: number;
  symbol: string | null;
  direction: string | null;
  entry: number | null;
  stop_loss: number | null;
  take_profit: number | null;
  quantity: number | null;
  status: string | null;
  grade: string | null;
  score: number | null;
  strategy: string | null;
  notes: string | null;
  created_at: string | null;
};

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

const supabase =
  supabaseUrl && supabaseAnonKey
    ? createClient(supabaseUrl, supabaseAnonKey)
    : null;

function formatDate(value: string | null) {
  if (!value) return "—";

  return new Date(value).toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function money(value: number | null) {
  if (value === null || value === undefined) return "—";
  return value.toFixed(2);
}

export default function AutoTradeJournal() {
  const [trades, setTrades] = useState<AutoTrade[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  async function loadAutoTrades() {
    if (!supabase) {
      setErrorMessage(
        "Supabase is not configured. Check .env.local and restart npm run dev."
      );
      setLoading(false);
      return;
    }

    setLoading(true);
    setErrorMessage("");

    const { data, error } = await supabase
      .from("paper_trades")
      .select(
        "id, symbol, direction, entry, stop_loss, take_profit, quantity, status, grade, score, strategy, notes, created_at"
      )
      .ilike("notes", "AUTO PAPER TRADE%")
      .order("created_at", { ascending: false })
      .limit(10);

    if (error) {
      setErrorMessage(error.message);
      setLoading(false);
      return;
    }

    setTrades(data || []);
    setLoading(false);
  }

  useEffect(() => {
    loadAutoTrades();
  }, []);

  return (
    <section className="rounded-3xl border border-slate-800 bg-slate-900/70 p-5">
      <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-wide text-purple-400">
            Auto Trade Journal
          </p>
          <h2 className="mt-1 text-2xl font-black text-white">
            Recent Auto Paper Trades
          </h2>
          <p className="mt-2 text-sm text-slate-400">
            This shows why the engine took each trade so we can improve the
            strategy over time.
          </p>
        </div>

        <button
          type="button"
          onClick={loadAutoTrades}
          disabled={loading}
          className="rounded-xl border border-slate-700 bg-slate-950 px-4 py-2 text-sm font-bold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? "Refreshing..." : "Refresh Journal"}
        </button>
      </div>

      {errorMessage && (
        <div className="mb-4 rounded-xl border border-red-800 bg-red-950/60 p-3 text-sm font-bold text-red-200">
          Auto trade journal error: {errorMessage}
        </div>
      )}

      {loading && (
        <div className="rounded-2xl border border-slate-800 bg-slate-950 p-5 text-sm font-bold text-slate-400">
          Loading auto trade journal...
        </div>
      )}

      {!loading && trades.length === 0 && (
        <div className="rounded-2xl border border-slate-800 bg-slate-950 p-5 text-sm font-bold text-slate-400">
          No auto paper trades found yet.
        </div>
      )}

      {!loading && trades.length > 0 && (
        <div className="overflow-hidden rounded-2xl border border-slate-800">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1000px] text-left text-sm">
              <thead className="bg-slate-950 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3">Time</th>
                  <th className="px-4 py-3">Symbol</th>
                  <th className="px-4 py-3">Direction</th>
                  <th className="px-4 py-3">Entry</th>
                  <th className="px-4 py-3">Stop</th>
                  <th className="px-4 py-3">Target</th>
                  <th className="px-4 py-3">Grade</th>
                  <th className="px-4 py-3">Score</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Strategy</th>
                  <th className="px-4 py-3">Reason</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-800 bg-slate-900/60">
                {trades.map((trade) => (
                  <tr key={trade.id} className="hover:bg-slate-800/70">
                    <td className="whitespace-nowrap px-4 py-3 text-slate-400">
                      {formatDate(trade.created_at)}
                    </td>

                    <td className="px-4 py-3 font-black text-white">
                      {trade.symbol || "—"}
                    </td>

                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-black ${
                          trade.direction === "CALL"
                            ? "bg-emerald-950 text-emerald-300"
                            : "bg-red-950 text-red-300"
                        }`}
                      >
                        {trade.direction || "—"}
                      </span>
                    </td>

                    <td className="px-4 py-3 font-bold text-slate-200">
                      {money(trade.entry)}
                    </td>

                    <td className="px-4 py-3 font-bold text-red-300">
                      {money(trade.stop_loss)}
                    </td>

                    <td className="px-4 py-3 font-bold text-emerald-300">
                      {money(trade.take_profit)}
                    </td>

                    <td className="px-4 py-3">
                      <span className="rounded-full bg-blue-950 px-3 py-1 text-xs font-black text-blue-300">
                        {trade.grade || "—"}
                      </span>
                    </td>

                    <td className="px-4 py-3 font-black text-white">
                      {trade.score ?? "—"}
                    </td>

                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-black ${
                          trade.status === "open"
                            ? "bg-yellow-950 text-yellow-300"
                            : "bg-slate-800 text-slate-300"
                        }`}
                      >
                        {trade.status || "—"}
                      </span>
                    </td>

                    <td className="px-4 py-3 text-slate-300">
                      {trade.strategy || "—"}
                    </td>

                    <td className="max-w-[360px] px-4 py-3 text-xs leading-5 text-slate-400">
                      {trade.notes || "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </section>
  );
}