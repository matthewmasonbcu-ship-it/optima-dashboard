"use client";

import { useEffect, useState } from "react";
import { mockScans, type MarketScan } from "@/lib/mockScans";
import { gradeScan } from "@/lib/gradeScan";

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
  const [isScanning, setIsScanning] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [lastScanTime, setLastScanTime] = useState<string>("Not scanned yet");
  const [saveStatus, setSaveStatus] = useState<string>("No scans saved yet");

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
    } catch (error) {
      console.error("Scan failed:", error);
      setSaveStatus(
        error instanceof Error ? `Save failed: ${error.message}` : "Save failed"
      );
    } finally {
      setIsScanning(false);
    }
  }

  useEffect(() => {
    loadScanHistory();
  }, []);

  const aSetups = scans.filter((scan) => scan.setupGrade === "A").length;
  const watchList = scans.filter((scan) => scan.decision === "WATCH_CLOSELY").length;
  const avoidList = scans.filter((scan) => scan.setupGrade === "AVOID").length;

  const bestSetup =
    scans.find((scan) => scan.setupGrade === "A") ||
    scans.find((scan) => scan.setupGrade === "B") ||
    scans[0];

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

        <section className="mb-8 rounded-3xl border border-slate-800 bg-slate-950/70 p-5 shadow-2xl">
          <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-2xl font-bold">Market Scan Results</h2>
              <p className="text-sm text-slate-400">
                Last scan:{" "}
                <span className="text-slate-300">{lastScanTime}</span>
              </p>
              <p className="mt-1 text-sm text-slate-400">
                Save status:{" "}
                <span
                  className={
                    saveStatus.startsWith("Saved")
                      ? "text-green-400"
                      : saveStatus.startsWith("Save failed")
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
                        <span className="text-slate-300">
                          {scan.volumeScore}
                        </span>
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
          <div className="mb-5 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-2xl font-bold">Scan History</h2>
              <p className="text-sm text-slate-400">
                Newest saved rows pulled directly from Supabase.
              </p>
            </div>

            <button
              onClick={loadScanHistory}
              disabled={isLoadingHistory}
              className="rounded-xl border border-slate-700 bg-slate-900 px-4 py-2 text-sm font-semibold text-slate-300 transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isLoadingHistory ? "Loading..." : "Refresh History"}
            </button>
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
                {scanHistory.length === 0 ? (
                  <tr>
                    <td className="px-4 py-6 text-slate-400" colSpan={6}>
                      No saved scan history loaded yet.
                    </td>
                  </tr>
                ) : (
                  scanHistory.map((scan) => (
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
                        {scan.price !== null ? `$${Number(scan.price).toFixed(2)}` : "—"}
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