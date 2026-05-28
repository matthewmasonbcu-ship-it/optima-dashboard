"use client";

import { useEffect, useState } from "react";
import { mockScans, type MarketScan } from "@/lib/mockScans";
import { gradeScan } from "@/lib/gradeScan";
import { createTradePlan } from "@/lib/createTradePlan";

type SavedScan = {
  id: string;
  ticker: string;
  company: string | null;
  price: number | null;
  change_percent: number | null;
  trend: string | null;
  volume_score: number | null;
  rsi: number | null;
  setup_grade: string | null;
  decision: string | null;
  reason: string | null;
  created_at: string;
};

type PaperTrade = {
  id: string;
  ticker: string | null;
  company: string | null;
  entry_price: number | null;
  setup_grade: string | null;
  decision: string | null;
  trade_plan_action: string | null;
  bias: string | null;
  risk_level: string | null;
  notes: string | null;
  status: string | null;
  result?: string | null;
  exit_price?: number | null;
  closed_at?: string | null;
  created_at: string;
};

type HistoryFilter = "ALL" | "A" | "WATCH" | "SKIP";
type TradeResult = "WIN" | "LOSS" | "BREAKEVEN";

function formatDecision(decision: string | null | undefined) {
  if (decision === "TAKE_TRADE") return "Take Trade";
  if (decision === "WATCH_CLOSELY") return "Watch Closely";
  if (decision === "WAIT") return "Wait";
  if (decision === "SKIP") return "Skip";
  return "No Decision";
}

function getGradeStyle(grade: string | null | undefined) {
  if (grade === "A") return "bg-green-500/15 text-green-400 border-green-500/30";
  if (grade === "B") return "bg-blue-500/15 text-blue-400 border-blue-500/30";
  if (grade === "C") return "bg-yellow-500/15 text-yellow-400 border-yellow-500/30";
  if (grade === "AVOID") return "bg-red-500/15 text-red-400 border-red-500/30";
  return "bg-slate-500/15 text-slate-400 border-slate-500/30";
}

function getDecisionStyle(decision: string | null | undefined) {
  if (decision === "TAKE_TRADE") return "text-green-400";
  if (decision === "WATCH_CLOSELY") return "text-blue-400";
  if (decision === "WAIT") return "text-yellow-400";
  if (decision === "SKIP") return "text-red-400";
  return "text-slate-400";
}

function getRiskStyle(riskLevel: string | null | undefined) {
  if (riskLevel === "Low") {
    return "text-green-400 border-green-500/30 bg-green-500/10";
  }

  if (riskLevel === "Medium") {
    return "text-yellow-400 border-yellow-500/30 bg-yellow-500/10";
  }

  if (riskLevel === "High") {
    return "text-red-400 border-red-500/30 bg-red-500/10";
  }

  return "text-slate-400 border-slate-500/30 bg-slate-500/10";
}

function getResultStyle(result: string | null | undefined) {
  if (result === "WIN") {
    return "text-green-400 border-green-500/30 bg-green-500/10";
  }

  if (result === "LOSS") {
    return "text-red-400 border-red-500/30 bg-red-500/10";
  }

  if (result === "BREAKEVEN") {
    return "text-yellow-400 border-yellow-500/30 bg-yellow-500/10";
  }

  return "text-slate-400 border-slate-500/30 bg-slate-500/10";
}

function formatGrade(grade: string | null | undefined) {
  if (grade === "AVOID") return "Avoid";
  if (grade === "A" || grade === "B" || grade === "C") return `${grade} Setup`;
  return "No Grade";
}

function slightlyRandomizeScans(scans: MarketScan[]) {
  return scans.map((scan) => {
    const priceMove = Number((Math.random() * 4 - 2).toFixed(2));
    const volumeMove = Math.floor(Math.random() * 15 - 7);
    const rsiMove = Math.floor(Math.random() * 10 - 5);
    const percentMove = Number((Math.random() * 2 - 1).toFixed(2));

    return {
      ...scan,
      price: Math.max(1, Number((scan.price + priceMove).toFixed(2))),
      changePercent: Number((scan.changePercent + percentMove).toFixed(2)),
      volumeScore: Math.max(1, Math.min(100, scan.volumeScore + volumeMove)),
      rsi: Math.max(1, Math.min(100, scan.rsi + rsiMove)),
    };
  });
}

export default function Home() {
  const [scans, setScans] = useState<MarketScan[]>(mockScans.map(gradeScan));
  const [scanHistory, setScanHistory] = useState<SavedScan[]>([]);
  const [paperTrades, setPaperTrades] = useState<PaperTrade[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [isLoadingPaperTrades, setIsLoadingPaperTrades] = useState(false);
  const [lastScanTime, setLastScanTime] = useState<string>("Not scanned yet");
  const [saveStatus, setSaveStatus] = useState<string>("No scans saved yet");
  const [historyFilter, setHistoryFilter] = useState<HistoryFilter>("ALL");
  const [paperTradeStatus, setPaperTradeStatus] = useState<string>(
    "No paper trade saved yet"
  );
  const [isSavingPaperTrade, setIsSavingPaperTrade] = useState(false);
  const [closingTradeId, setClosingTradeId] = useState<string | null>(null);
  const [closeTradeStatus, setCloseTradeStatus] = useState<string>(
    "No paper trades closed yet"
  );

  async function saveScansToSupabase(scansToSave: MarketScan[]) {
    const response = await fetch("/api/save-scans", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ scans: scansToSave }),
    });

    const result = await response.json();

    if (!response.ok || !result.success) {
      throw new Error(result.error || "Failed to save scans");
    }

    return result;
  }

  async function loadScanHistory() {
    setIsLoadingHistory(true);

    try {
      const response = await fetch("/api/get-scans");
      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || "Failed to load scan history");
      }

      setScanHistory(result.scans);
    } catch (error) {
      console.error("Load scan history failed:", error);
    } finally {
      setIsLoadingHistory(false);
    }
  }

  async function loadPaperTrades() {
    setIsLoadingPaperTrades(true);

    try {
      const response = await fetch("/api/get-paper-trades");
      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || "Failed to load paper trades");
      }

      setPaperTrades(result.paperTrades);
    } catch (error) {
      console.error("Load paper trades failed:", error);
    } finally {
      setIsLoadingPaperTrades(false);
    }
  }

  async function savePaperTradeFromScan(scan: MarketScan, statusPrefix?: string) {
    const tradePlanForScan = createTradePlan(scan);

    if (statusPrefix) {
      setPaperTradeStatus(statusPrefix);
    }

    const response = await fetch("/api/save-paper-trade", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        scan,
        tradePlan: tradePlanForScan,
      }),
    });

    const result = await response.json();

    if (!response.ok || !result.success) {
      throw new Error(result.error || "Failed to save paper trade");
    }

    setPaperTradeStatus(result.message || `Saved ${scan.ticker} to paper trades`);
    await loadPaperTrades();

    return result;
  }

  async function closePaperTrade(tradeId: string, result: TradeResult) {
    setClosingTradeId(tradeId);
    setCloseTradeStatus(`Closing trade as ${result}...`);

    try {
      const response = await fetch("/api/close-paper-trade", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: tradeId,
          result,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || "Failed to close paper trade");
      }

      setCloseTradeStatus(data.message || `Paper trade closed as ${result}`);
      await loadPaperTrades();
    } catch (error) {
      console.error("Close paper trade failed:", error);

      setCloseTradeStatus(
        error instanceof Error
          ? `Close failed: ${error.message}`
          : "Close failed"
      );
    } finally {
      setClosingTradeId(null);
    }
  }

  async function handleGenerateScan() {
    setIsScanning(true);
    setSaveStatus("Generating scan...");

    try {
      await new Promise((resolve) => setTimeout(resolve, 900));

      const updatedScans = slightlyRandomizeScans(mockScans).map(gradeScan);

      setScans(updatedScans);
      setLastScanTime(new Date().toLocaleTimeString());
      setSaveStatus("Saving scan to Supabase...");

      const result = await saveScansToSupabase(updatedScans);

      setSaveStatus(`Saved ${result.savedCount} scan rows to Supabase`);
      await loadScanHistory();

      const bestASetup = updatedScans.find((scan) => scan.setupGrade === "A");

      if (bestASetup) {
        await savePaperTradeFromScan(
          bestASetup,
          `Auto-checking ${bestASetup.ticker} for paper trade...`
        );
      } else {
        setPaperTradeStatus("No A Setup found for auto paper trade");
      }
    } catch (error) {
      console.error("Scan failed:", error);

      const errorMessage =
        error instanceof Error ? error.message : "Something went wrong";

      setSaveStatus(`Scan failed: ${errorMessage}`);
      setPaperTradeStatus(`Auto paper trade failed: ${errorMessage}`);
    } finally {
      setIsScanning(false);
    }
  }

  useEffect(() => {
    loadScanHistory();
    loadPaperTrades();
  }, []);

  const aSetups = scans.filter((scan) => scan.setupGrade === "A").length;
  const watchList = scans.filter(
    (scan) => scan.decision === "WATCH_CLOSELY"
  ).length;
  const avoidList = scans.filter((scan) => scan.setupGrade === "AVOID").length;

  const bestSetup =
    scans.find((scan) => scan.setupGrade === "A") ||
    scans.find((scan) => scan.setupGrade === "B") ||
    scans[0];

  const tradePlan = bestSetup ? createTradePlan(bestSetup) : null;

  async function savePaperTrade() {
    if (!bestSetup) return;

    setIsSavingPaperTrade(true);
    setPaperTradeStatus("Saving paper trade...");

    try {
      await savePaperTradeFromScan(bestSetup);
    } catch (error) {
      console.error("Save paper trade failed:", error);

      setPaperTradeStatus(
        error instanceof Error
          ? `Paper trade save failed: ${error.message}`
          : "Paper trade save failed"
      );
    } finally {
      setIsSavingPaperTrade(false);
    }
  }

  const validPaperTrades = paperTrades.filter(
    (trade) => trade.status !== "DUPLICATE_CLOSED"
  );

  const openPaperTrades = validPaperTrades.filter(
    (trade) => trade.status === "OPEN"
  ).length;

  const closedPaperTrades = validPaperTrades.filter(
    (trade) => trade.status === "CLOSED"
  );

  const winningTrades = closedPaperTrades.filter(
    (trade) => trade.result === "WIN"
  ).length;

  const losingTrades = closedPaperTrades.filter(
    (trade) => trade.result === "LOSS"
  ).length;

  const breakevenTrades = closedPaperTrades.filter(
    (trade) => trade.result === "BREAKEVEN"
  ).length;

  const winRate =
    closedPaperTrades.length > 0
      ? Math.round((winningTrades / closedPaperTrades.length) * 100)
      : 0;

  const filteredScanHistory = scanHistory.filter((scan) => {
    if (historyFilter === "ALL") return true;
    if (historyFilter === "A") return scan.setup_grade === "A";
    if (historyFilter === "WATCH") return scan.decision === "WATCH_CLOSELY";
    if (historyFilter === "SKIP") {
      return scan.decision === "SKIP" || scan.setup_grade === "AVOID";
    }

    return true;
  });

  return (
    <main className="min-h-screen bg-[#070A12] text-white">
      <div className="mx-auto max-w-7xl px-6 py-8">
        <header className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="mb-2 text-sm font-medium uppercase tracking-[0.3em] text-blue-400">
              Road to Funded Account
            </p>

            <h1 className="text-4xl font-bold tracking-tight md:text-5xl">
              Trading Scanner Dashboard
            </h1>

            <p className="mt-3 max-w-2xl text-sm text-slate-400">
              A disciplined scanner built to grade setups, filter weak trades,
              and protect capital before risking real money.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-950/70 px-5 py-4 shadow-xl">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
              Current Mode
            </p>
            <p className="mt-1 text-lg font-semibold text-blue-400">
              Paper Trading
            </p>
          </div>
        </header>

        <section className="mb-8 grid gap-4 md:grid-cols-4">
          <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-5 shadow-xl">
            <p className="text-sm text-slate-400">Total Scans</p>
            <p className="mt-2 text-3xl font-bold">{scans.length}</p>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-5 shadow-xl">
            <p className="text-sm text-slate-400">A Setups</p>
            <p className="mt-2 text-3xl font-bold text-green-400">{aSetups}</p>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-5 shadow-xl">
            <p className="text-sm text-slate-400">Watch Closely</p>
            <p className="mt-2 text-3xl font-bold text-blue-400">{watchList}</p>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-5 shadow-xl">
            <p className="text-sm text-slate-400">Avoid / Skip</p>
            <p className="mt-2 text-3xl font-bold text-red-400">{avoidList}</p>
          </div>
        </section>

        {bestSetup && (
          <section className="mb-8 rounded-3xl border border-green-500/20 bg-gradient-to-br from-green-500/10 to-slate-950 p-6 shadow-2xl">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="mb-2 text-sm font-medium uppercase tracking-[0.25em] text-green-400">
                  Best Setup Right Now
                </p>

                <h2 className="text-3xl font-bold">
                  {bestSetup.ticker}{" "}
                  <span className="text-slate-400">— {bestSetup.company}</span>
                </h2>

                <p className="mt-3 max-w-3xl text-sm text-slate-300">
                  {bestSetup.reason}
                </p>
              </div>

              <div className="rounded-2xl border border-green-500/30 bg-black/30 px-6 py-4 text-center">
                <p className="text-sm text-slate-400">Decision</p>
                <p
                  className={`mt-1 text-2xl font-bold ${getDecisionStyle(
                    bestSetup.decision
                  )}`}
                >
                  {formatDecision(bestSetup.decision)}
                </p>
              </div>
            </div>
          </section>
        )}

        {tradePlan && (
          <section className="mb-8 rounded-3xl border border-blue-500/20 bg-slate-950/70 p-6 shadow-2xl">
            <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="mb-2 text-sm font-medium uppercase tracking-[0.25em] text-blue-400">
                  Trade Plan Preview
                </p>
                <h2 className="text-2xl font-bold">{tradePlan.ticker} Plan</h2>
                <p className="mt-2 text-sm text-slate-400">
                  This is a paper-trading plan generated from the current best
                  setup.
                </p>
              </div>

              <div className="flex flex-col gap-2 md:items-end">
                <div
                  className={`rounded-full border px-4 py-2 text-sm font-bold ${getRiskStyle(
                    tradePlan.riskLevel
                  )}`}
                >
                  {tradePlan.riskLevel} Risk
                </div>

                <button
                  onClick={savePaperTrade}
                  disabled={isSavingPaperTrade}
                  className="rounded-xl border border-green-500/30 bg-green-500/10 px-4 py-2 text-sm font-semibold text-green-400 transition hover:bg-green-500/20 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isSavingPaperTrade ? "Saving..." : "Add to Paper Trades"}
                </button>

                <p
                  className={`text-xs ${
                    paperTradeStatus.startsWith("Saved") ||
                    paperTradeStatus.includes("already in open paper trades") ||
                    paperTradeStatus.startsWith("Auto-checking")
                      ? "text-green-400"
                      : paperTradeStatus.startsWith("Paper trade save failed") ||
                        paperTradeStatus.startsWith("Auto paper trade failed")
                      ? "text-red-400"
                      : "text-slate-400"
                  }`}
                >
                  {paperTradeStatus}
                </p>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <div className="rounded-2xl border border-slate-800 bg-black/20 p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
                  Bias
                </p>
                <p className="mt-2 text-lg font-bold text-white">
                  {tradePlan.bias}
                </p>
              </div>

              <div className="rounded-2xl border border-slate-800 bg-black/20 p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
                  Action
                </p>
                <p className="mt-2 text-lg font-bold text-blue-400">
                  {tradePlan.action}
                </p>
              </div>

              <div className="rounded-2xl border border-slate-800 bg-black/20 p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
                  Entry Zone
                </p>
                <p className="mt-2 text-sm font-semibold text-slate-200">
                  {tradePlan.entryZone}
                </p>
              </div>

              <div className="rounded-2xl border border-slate-800 bg-black/20 p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
                  Stop Rule
                </p>
                <p className="mt-2 text-sm font-semibold text-slate-200">
                  {tradePlan.stopRule}
                </p>
              </div>

              <div className="rounded-2xl border border-slate-800 bg-black/20 p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
                  Profit Rule
                </p>
                <p className="mt-2 text-sm font-semibold text-slate-200">
                  {tradePlan.profitRule}
                </p>
              </div>

              <div className="rounded-2xl border border-slate-800 bg-black/20 p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
                  Notes
                </p>
                <p className="mt-2 text-sm font-semibold text-slate-200">
                  {tradePlan.notes}
                </p>
              </div>
            </div>
          </section>
        )}

        <section className="mb-8 rounded-3xl border border-purple-500/20 bg-slate-950/70 p-5 shadow-2xl">
          <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="mb-2 text-sm font-medium uppercase tracking-[0.25em] text-purple-400">
                Paper Trade Tracker
              </p>
              <h2 className="text-2xl font-bold">Open Paper Trades</h2>
              <p className="text-sm text-slate-400">
                Saved trade ideas pulled directly from Supabase.
              </p>
              <p
                className={`mt-1 text-sm ${
                  closeTradeStatus.startsWith("Paper trade closed")
                    ? "text-green-400"
                    : closeTradeStatus.startsWith("Close failed")
                    ? "text-red-400"
                    : "text-slate-400"
                }`}
              >
                {closeTradeStatus}
              </p>
            </div>

            <button
              onClick={loadPaperTrades}
              disabled={isLoadingPaperTrades}
              className="rounded-xl border border-slate-700 bg-slate-900 px-4 py-2 text-sm font-semibold text-slate-300 transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isLoadingPaperTrades ? "Loading..." : "Refresh Paper Trades"}
            </button>
          </div>

          <div className="mb-5 grid gap-4 md:grid-cols-6">
            <div className="rounded-2xl border border-slate-800 bg-black/20 p-4">
              <p className="text-sm text-slate-400">Total Trades</p>
              <p className="mt-2 text-2xl font-bold text-white">
                {validPaperTrades.length}
              </p>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-black/20 p-4">
              <p className="text-sm text-slate-400">Open Trades</p>
              <p className="mt-2 text-2xl font-bold text-purple-400">
                {openPaperTrades}
              </p>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-black/20 p-4">
              <p className="text-sm text-slate-400">Wins</p>
              <p className="mt-2 text-2xl font-bold text-green-400">
                {winningTrades}
              </p>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-black/20 p-4">
              <p className="text-sm text-slate-400">Losses</p>
              <p className="mt-2 text-2xl font-bold text-red-400">
                {losingTrades}
              </p>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-black/20 p-4">
              <p className="text-sm text-slate-400">Breakeven</p>
              <p className="mt-2 text-2xl font-bold text-yellow-400">
                {breakevenTrades}
              </p>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-black/20 p-4">
              <p className="text-sm text-slate-400">Win Rate</p>
              <p className="mt-2 text-2xl font-bold text-blue-400">
                {winRate}%
              </p>
            </div>
          </div>

          <div className="overflow-hidden rounded-2xl border border-slate-800">
            <table className="w-full border-collapse text-left text-sm">
              <thead className="bg-slate-900 text-xs uppercase tracking-[0.18em] text-slate-500">
                <tr>
                  <th className="px-4 py-4">Time</th>
                  <th className="px-4 py-4">Ticker</th>
                  <th className="px-4 py-4">Entry</th>
                  <th className="px-4 py-4">Grade</th>
                  <th className="px-4 py-4">Risk</th>
                  <th className="px-4 py-4">Status</th>
                  <th className="px-4 py-4">Result</th>
                  <th className="px-4 py-4">Actions</th>
                </tr>
              </thead>

              <tbody>
                {validPaperTrades.length === 0 ? (
                  <tr>
                    <td className="px-4 py-6 text-slate-400" colSpan={8}>
                      No paper trades saved yet.
                    </td>
                  </tr>
                ) : (
                  validPaperTrades.map((trade) => (
                    <tr
                      key={trade.id}
                      className="border-t border-slate-800 transition hover:bg-slate-900/70"
                    >
                      <td className="px-4 py-4 text-slate-400">
                        {new Date(trade.created_at).toLocaleTimeString()}
                      </td>

                      <td className="px-4 py-4">
                        <p className="font-bold text-white">
                          {trade.ticker || "Unknown"}
                        </p>
                        <p className="text-xs text-slate-500">
                          {trade.company || "Unknown company"}
                        </p>
                      </td>

                      <td className="px-4 py-4 font-medium">
                        {trade.entry_price !== null
                          ? `$${Number(trade.entry_price).toFixed(2)}`
                          : "—"}
                      </td>

                      <td className="px-4 py-4">
                        <span
                          className={`rounded-full border px-3 py-1 text-xs font-bold ${getGradeStyle(
                            trade.setup_grade
                          )}`}
                        >
                          {formatGrade(trade.setup_grade)}
                        </span>
                      </td>

                      <td className="px-4 py-4">
                        <span
                          className={`rounded-full border px-3 py-1 text-xs font-bold ${getRiskStyle(
                            trade.risk_level
                          )}`}
                        >
                          {trade.risk_level || "Unknown"}
                        </span>
                      </td>

                      <td className="px-4 py-4 font-bold text-purple-400">
                        {trade.status || "OPEN"}
                      </td>

                      <td className="px-4 py-4">
                        <span
                          className={`rounded-full border px-3 py-1 text-xs font-bold ${getResultStyle(
                            trade.result
                          )}`}
                        >
                          {trade.result || "Pending"}
                        </span>
                      </td>

                      <td className="px-4 py-4">
                        {trade.status === "OPEN" ? (
                          <div className="flex flex-wrap gap-2">
                            <button
                              onClick={() => closePaperTrade(trade.id, "WIN")}
                              disabled={closingTradeId === trade.id}
                              className="rounded-lg border border-green-500/30 bg-green-500/10 px-3 py-1 text-xs font-bold text-green-400 hover:bg-green-500/20 disabled:opacity-50"
                            >
                              Win
                            </button>

                            <button
                              onClick={() => closePaperTrade(trade.id, "LOSS")}
                              disabled={closingTradeId === trade.id}
                              className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-1 text-xs font-bold text-red-400 hover:bg-red-500/20 disabled:opacity-50"
                            >
                              Loss
                            </button>

                            <button
                              onClick={() =>
                                closePaperTrade(trade.id, "BREAKEVEN")
                              }
                              disabled={closingTradeId === trade.id}
                              className="rounded-lg border border-yellow-500/30 bg-yellow-500/10 px-3 py-1 text-xs font-bold text-yellow-400 hover:bg-yellow-500/20 disabled:opacity-50"
                            >
                              BE
                            </button>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-500">Closed</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className="mb-8 rounded-3xl border border-slate-800 bg-slate-950/70 p-5 shadow-2xl">
          <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-2xl font-bold">Market Scan Results</h2>
              <p className="text-sm text-slate-400">
                Last scan: <span className="text-slate-300">{lastScanTime}</span>
              </p>
              <p className="mt-1 text-sm text-slate-400">
                Save status:{" "}
                <span
                  className={
                    saveStatus.startsWith("Saved")
                      ? "text-green-400"
                      : saveStatus.startsWith("Save failed") ||
                        saveStatus.startsWith("Scan failed")
                      ? "text-red-400"
                      : "text-slate-300"
                  }
                >
                  {saveStatus}
                </span>
              </p>
            </div>

            <button
              onClick={handleGenerateScan}
              disabled={isScanning}
              className="rounded-xl border border-blue-500/30 bg-blue-500/10 px-4 py-2 text-sm font-semibold text-blue-400 transition hover:bg-blue-500/20 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isScanning ? "Scanning Market..." : "Generate Scan"}
            </button>
          </div>

          <div className="overflow-hidden rounded-2xl border border-slate-800">
            <table className="w-full border-collapse text-left text-sm">
              <thead className="bg-slate-900 text-xs uppercase tracking-[0.18em] text-slate-500">
                <tr>
                  <th className="px-4 py-4">Ticker</th>
                  <th className="px-4 py-4">Price</th>
                  <th className="px-4 py-4">Change</th>
                  <th className="px-4 py-4">Trend</th>
                  <th className="px-4 py-4">Volume</th>
                  <th className="px-4 py-4">RSI</th>
                  <th className="px-4 py-4">Grade</th>
                  <th className="px-4 py-4">Decision</th>
                </tr>
              </thead>

              <tbody>
                {scans.map((scan) => (
                  <tr
                    key={scan.id}
                    className="border-t border-slate-800 transition hover:bg-slate-900/70"
                  >
                    <td className="px-4 py-4">
                      <div>
                        <p className="font-bold text-white">{scan.ticker}</p>
                        <p className="text-xs text-slate-500">{scan.company}</p>
                      </div>
                    </td>

                    <td className="px-4 py-4 font-medium">
                      ${scan.price.toFixed(2)}
                    </td>

                    <td
                      className={`px-4 py-4 font-semibold ${
                        scan.changePercent >= 0
                          ? "text-green-400"
                          : "text-red-400"
                      }`}
                    >
                      {scan.changePercent >= 0 ? "+" : ""}
                      {scan.changePercent.toFixed(2)}%
                    </td>

                    <td className="px-4 py-4 text-slate-300">{scan.trend}</td>

                    <td className="px-4 py-4">
                      <div className="flex items-center gap-3">
                        <div className="h-2 w-20 overflow-hidden rounded-full bg-slate-800">
                          <div
                            className="h-full rounded-full bg-blue-500"
                            style={{ width: `${scan.volumeScore}%` }}
                          />
                        </div>
                        <span className="text-slate-300">{scan.volumeScore}</span>
                      </div>
                    </td>

                    <td className="px-4 py-4 text-slate-300">{scan.rsi}</td>

                    <td className="px-4 py-4">
                      <span
                        className={`rounded-full border px-3 py-1 text-xs font-bold ${getGradeStyle(
                          scan.setupGrade
                        )}`}
                      >
                        {formatGrade(scan.setupGrade)}
                      </span>
                    </td>

                    <td
                      className={`px-4 py-4 font-bold ${getDecisionStyle(
                        scan.decision
                      )}`}
                    >
                      {formatDecision(scan.decision)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="rounded-3xl border border-slate-800 bg-slate-950/70 p-5 shadow-2xl">
          <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-2xl font-bold">Scan History</h2>
              <p className="text-sm text-slate-400">
                Newest saved rows pulled directly from Supabase.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setHistoryFilter("ALL")}
                className={`rounded-xl border px-4 py-2 text-sm font-semibold transition ${
                  historyFilter === "ALL"
                    ? "border-blue-500/40 bg-blue-500/15 text-blue-400"
                    : "border-slate-700 bg-slate-900 text-slate-300 hover:bg-slate-800"
                }`}
              >
                All
              </button>

              <button
                onClick={() => setHistoryFilter("A")}
                className={`rounded-xl border px-4 py-2 text-sm font-semibold transition ${
                  historyFilter === "A"
                    ? "border-green-500/40 bg-green-500/15 text-green-400"
                    : "border-slate-700 bg-slate-900 text-slate-300 hover:bg-slate-800"
                }`}
              >
                A Setups
              </button>

              <button
                onClick={() => setHistoryFilter("WATCH")}
                className={`rounded-xl border px-4 py-2 text-sm font-semibold transition ${
                  historyFilter === "WATCH"
                    ? "border-blue-500/40 bg-blue-500/15 text-blue-400"
                    : "border-slate-700 bg-slate-900 text-slate-300 hover:bg-slate-800"
                }`}
              >
                Watch Closely
              </button>

              <button
                onClick={() => setHistoryFilter("SKIP")}
                className={`rounded-xl border px-4 py-2 text-sm font-semibold transition ${
                  historyFilter === "SKIP"
                    ? "border-red-500/40 bg-red-500/15 text-red-400"
                    : "border-slate-700 bg-slate-900 text-slate-300 hover:bg-slate-800"
                }`}
              >
                Skip / Avoid
              </button>

              <button
                onClick={loadScanHistory}
                disabled={isLoadingHistory}
                className="rounded-xl border border-slate-700 bg-slate-900 px-4 py-2 text-sm font-semibold text-slate-300 transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isLoadingHistory ? "Loading..." : "Refresh"}
              </button>
            </div>
          </div>

          <div className="overflow-hidden rounded-2xl border border-slate-800">
            <table className="w-full border-collapse text-left text-sm">
              <thead className="bg-slate-900 text-xs uppercase tracking-[0.18em] text-slate-500">
                <tr>
                  <th className="px-4 py-4">Time</th>
                  <th className="px-4 py-4">Ticker</th>
                  <th className="px-4 py-4">Price</th>
                  <th className="px-4 py-4">Grade</th>
                  <th className="px-4 py-4">Decision</th>
                  <th className="px-4 py-4">Reason</th>
                </tr>
              </thead>

              <tbody>
                {filteredScanHistory.length === 0 ? (
                  <tr>
                    <td className="px-4 py-6 text-slate-400" colSpan={6}>
                      No saved scan history matches this filter yet.
                    </td>
                  </tr>
                ) : (
                  filteredScanHistory.map((scan) => (
                    <tr
                      key={scan.id}
                      className="border-t border-slate-800 transition hover:bg-slate-900/70"
                    >
                      <td className="px-4 py-4 text-slate-400">
                        {new Date(scan.created_at).toLocaleTimeString()}
                      </td>

                      <td className="px-4 py-4">
                        <p className="font-bold text-white">{scan.ticker}</p>
                        <p className="text-xs text-slate-500">
                          {scan.company || "Unknown company"}
                        </p>
                      </td>

                      <td className="px-4 py-4 font-medium">
                        {scan.price !== null
                          ? `$${Number(scan.price).toFixed(2)}`
                          : "—"}
                      </td>

                      <td className="px-4 py-4">
                        <span
                          className={`rounded-full border px-3 py-1 text-xs font-bold ${getGradeStyle(
                            scan.setup_grade
                          )}`}
                        >
                          {formatGrade(scan.setup_grade)}
                        </span>
                      </td>

                      <td
                        className={`px-4 py-4 font-bold ${getDecisionStyle(
                          scan.decision
                        )}`}
                      >
                        {formatDecision(scan.decision)}
                      </td>

                      <td className="max-w-md px-4 py-4 text-xs text-slate-400">
                        {scan.reason || "No reason saved."}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  );
}