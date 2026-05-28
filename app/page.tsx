"use client";

import { useEffect, useState } from "react";
import { mockScans, type MarketScan } from "@/lib/mockScans";
import { gradeScan } from "@/lib/gradeScan";
import { createTradePlan } from "@/lib/createTradePlan";
import type {
  SavedScan,
  PaperTrade,
  HistoryFilter,
  TradeResult,
} from "@/lib/dashboardTypes";

import StatCard from "@/components/StatCard";
import BestSetupCard from "@/components/BestSetupCard";
import TradePlanPreview from "@/components/TradePlanPreview";
import PaperTradeTracker from "@/components/PaperTradeTracker";
import MarketScanTable from "@/components/MarketScanTable";
import ScanHistoryTable from "@/components/ScanHistoryTable";

function slightlyRandomizeScans(scans: MarketScan[]): MarketScan[] {
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
  const [isSavingPaperTrade, setIsSavingPaperTrade] = useState(false);

  const [lastScanTime, setLastScanTime] = useState<string>("Not scanned yet");
  const [saveStatus, setSaveStatus] = useState<string>("No scans saved yet");
  const [historyFilter, setHistoryFilter] = useState<HistoryFilter>("ALL");

  const [paperTradeStatus, setPaperTradeStatus] = useState<string>(
    "No paper trade saved yet"
  );

  const [closingTradeId, setClosingTradeId] = useState<string | null>(null);
  const [closeTradeStatus, setCloseTradeStatus] = useState<string>(
    "No paper trades closed yet"
  );

  const [autoPaperTrading, setAutoPaperTrading] = useState(true);

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

  async function savePaperTradeFromScan(
    scan: MarketScan,
    statusPrefix?: string
  ) {
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

    setPaperTradeStatus(
      result.message || `Saved ${scan.ticker} to paper trades`
    );

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

      if (autoPaperTrading) {
        const bestASetup = updatedScans.find((scan) => scan.setupGrade === "A");

        if (bestASetup) {
          await savePaperTradeFromScan(
            bestASetup,
            `Auto-checking ${bestASetup.ticker} for paper trade...`
          );
        } else {
          setPaperTradeStatus("No A Setup found for auto paper trade");
        }
      } else {
        setPaperTradeStatus(
          "Auto paper trading is OFF. Manual approval required."
        );
      }
    } catch (error) {
      console.error("Scan failed:", error);

      const message =
        error instanceof Error ? error.message : "Something went wrong";

      setSaveStatus(`Scan failed: ${message}`);
      setPaperTradeStatus(`Auto paper trade failed: ${message}`);
    } finally {
      setIsScanning(false);
    }
  }

  async function savePaperTrade() {
    const bestSetup =
      scans.find((scan) => scan.setupGrade === "A") ||
      scans.find((scan) => scan.setupGrade === "B") ||
      scans[0];

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

  const validPaperTrades = paperTrades.filter(
    (trade) => trade.status !== "DUPLICATE_CLOSED"
  );

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
          <StatCard label="Total Scans" value={scans.length} />

          <StatCard
            label="A Setups"
            value={aSetups}
            valueClassName="text-green-400"
          />

          <StatCard
            label="Watch Closely"
            value={watchList}
            valueClassName="text-blue-400"
          />

          <StatCard
            label="Avoid / Skip"
            value={avoidList}
            valueClassName="text-red-400"
          />
        </section>

        <section className="mb-8 rounded-3xl border border-blue-500/20 bg-slate-950/70 p-5 shadow-2xl">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="mb-2 text-sm font-medium uppercase tracking-[0.25em] text-blue-400">
                Automation Control
              </p>

              <h2 className="text-2xl font-bold">Auto Paper Trading</h2>

              <p className="mt-2 max-w-2xl text-sm text-slate-400">
                When enabled, the dashboard will automatically add the best A
                Setup to open paper trades after each scan. When disabled, you
                must manually approve trades with the Add to Paper Trades
                button.
              </p>
            </div>

            <button
              onClick={() => setAutoPaperTrading((current) => !current)}
              className={`rounded-2xl border px-6 py-4 text-left transition ${
                autoPaperTrading
                  ? "border-green-500/30 bg-green-500/10 text-green-400"
                  : "border-red-500/30 bg-red-500/10 text-red-400"
              }`}
            >
              <p className="text-xs uppercase tracking-[0.2em] opacity-80">
                Current Status
              </p>
              <p className="mt-1 text-2xl font-bold">
                {autoPaperTrading ? "ON" : "OFF"}
              </p>
            </button>
          </div>
        </section>

        {bestSetup && <BestSetupCard bestSetup={bestSetup} />}

        {tradePlan && (
          <TradePlanPreview
            tradePlan={tradePlan}
            isSavingPaperTrade={isSavingPaperTrade}
            paperTradeStatus={paperTradeStatus}
            onSavePaperTrade={savePaperTrade}
          />
        )}

        <PaperTradeTracker
          validPaperTrades={validPaperTrades}
          isLoadingPaperTrades={isLoadingPaperTrades}
          closeTradeStatus={closeTradeStatus}
          closingTradeId={closingTradeId}
          onLoadPaperTrades={loadPaperTrades}
          onClosePaperTrade={closePaperTrade}
        />

        <MarketScanTable
          scans={scans}
          isScanning={isScanning}
          lastScanTime={lastScanTime}
          saveStatus={saveStatus}
          onGenerateScan={handleGenerateScan}
        />

        <ScanHistoryTable
          scanHistory={scanHistory}
          historyFilter={historyFilter}
          isLoadingHistory={isLoadingHistory}
          onSetFilter={setHistoryFilter}
          onRefresh={loadScanHistory}
        />
      </div>
    </main>
  );
}