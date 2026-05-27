"use client";

import { useEffect, useMemo, useState } from "react";

type Signal = "BUY" | "HOLD" | "AVOID";

type MarketAsset = {
  symbol: string;
  name: string;
  price: number;
  changePercent: number;
  volume: number;
};

type Asset = MarketAsset & {
  trend: "Bullish" | "Neutral" | "Bearish";
  signal: Signal;
  confidence: number;
};

function scoreAsset(asset: MarketAsset): Asset {
  let signal: Signal = "HOLD";
  let trend: Asset["trend"] = "Neutral";
  let confidence = 55;

  if (asset.changePercent >= 1) {
    signal = "BUY";
    trend = "Bullish";
    confidence = Math.min(95, 70 + asset.changePercent * 4);
  } else if (asset.changePercent <= -1) {
    signal = "AVOID";
    trend = "Bearish";
    confidence = Math.min(95, 65 + Math.abs(asset.changePercent) * 4);
  }

  return {
    ...asset,
    signal,
    trend,
    confidence: Math.round(confidence),
  };
}

function formatVolume(volume: number) {
  if (volume >= 1_000_000) return `${(volume / 1_000_000).toFixed(1)}M`;
  if (volume >= 1_000) return `${(volume / 1_000).toFixed(1)}K`;
  return volume.toString();
}

export default function Home() {
  const [selectedSignal, setSelectedSignal] = useState<Signal | "ALL">("ALL");
  const [assets, setAssets] = useState<Asset[]>([]);
  const [updatedAt, setUpdatedAt] = useState<string>("Loading...");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadMarketData() {
      try {
        const response = await fetch("/api/market", {
          cache: "no-store",
        });

        const result = await response.json();

        if (!result.success) {
          throw new Error(result.error ?? "Failed to load market data");
        }

        const scoredAssets = result.data.map(scoreAsset);

        setAssets(scoredAssets);
        setUpdatedAt(new Date(result.updatedAt).toLocaleString());
      } catch (error) {
        console.error(error);
        setUpdatedAt("Market data failed to load");
      } finally {
        setIsLoading(false);
      }
    }

    loadMarketData();

    const interval = setInterval(loadMarketData, 60_000);

    return () => clearInterval(interval);
  }, []);

  const filteredAssets = useMemo(() => {
    if (selectedSignal === "ALL") return assets;
    return assets.filter((asset) => asset.signal === selectedSignal);
  }, [assets, selectedSignal]);

  const strongestAsset = useMemo(() => {
    if (assets.length === 0) return null;
    return [...assets].sort((a, b) => b.confidence - a.confidence)[0];
  }, [assets]);

  const buySignals = assets.filter((asset) => asset.signal === "BUY").length;

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="mx-auto max-w-7xl px-6 py-8">
        <section className="mb-8 rounded-3xl border border-white/10 bg-white/5 p-8 shadow-2xl">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="mb-2 text-sm font-semibold uppercase tracking-[0.3em] text-cyan-300">
                OPTIMA AUTO TRADER
              </p>
              <h1 className="text-4xl font-bold tracking-tight md:text-6xl">
                Market Command Center
              </h1>
              <p className="mt-4 max-w-2xl text-slate-300">
                Live market dashboard connected to real quote data. This is the
                foundation for paper trading automation.
              </p>
              <p className="mt-3 text-sm text-slate-400">
                Last updated: {updatedAt}
              </p>
            </div>

            <div className="rounded-2xl border border-cyan-400/30 bg-cyan-400/10 p-5">
              <p className="text-sm text-slate-300">Strongest setup</p>
              <p className="mt-1 text-3xl font-bold text-cyan-300">
                {strongestAsset ? strongestAsset.symbol : "---"}
              </p>
              <p className="text-sm text-slate-300">
                {strongestAsset ? `${strongestAsset.confidence}% confidence` : "Loading"}
              </p>
            </div>
          </div>
        </section>

        <section className="mb-8 grid gap-4 md:grid-cols-4">
          <StatCard label="Tracked Assets" value={assets.length.toString()} />
          <StatCard label="Buy Signals" value={buySignals.toString()} />
          <StatCard label="Risk Mode" value="Paper" />
          <StatCard label="Automation" value="Offline" />
        </section>

        <section className="rounded-3xl border border-white/10 bg-white/5 p-6">
          <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-2xl font-bold">Live Market Watchlist</h2>
              <p className="text-sm text-slate-400">
                Real quote data from your local API route.
              </p>
            </div>

            <div className="flex gap-2">
              {(["ALL", "BUY", "HOLD", "AVOID"] as const).map((signal) => (
                <button
                  key={signal}
                  onClick={() => setSelectedSignal(signal)}
                  className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                    selectedSignal === signal
                      ? "bg-cyan-300 text-slate-950"
                      : "bg-white/10 text-slate-300 hover:bg-white/20"
                  }`}
                >
                  {signal}
                </button>
              ))}
            </div>
          </div>

          <div className="overflow-hidden rounded-2xl border border-white/10">
            <table className="w-full border-collapse text-left">
              <thead className="bg-white/10 text-sm uppercase tracking-wide text-slate-300">
                <tr>
                  <th className="p-4">Asset</th>
                  <th className="p-4">Price</th>
                  <th className="p-4">Change</th>
                  <th className="p-4">Volume</th>
                  <th className="p-4">Trend</th>
                  <th className="p-4">Signal</th>
                  <th className="p-4">Confidence</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td className="p-4 text-slate-300" colSpan={7}>
                      Loading live market data...
                    </td>
                  </tr>
                ) : (
                  filteredAssets.map((asset) => (
                    <tr
                      key={asset.symbol}
                      className="border-t border-white/10 hover:bg-white/5"
                    >
                      <td className="p-4">
                        <p className="font-bold">{asset.symbol}</p>
                        <p className="text-sm text-slate-400">{asset.name}</p>
                      </td>
                      <td className="p-4 font-semibold">
                        ${asset.price.toFixed(2)}
                      </td>
                      <td
                        className={`p-4 font-semibold ${
                          asset.changePercent >= 0
                            ? "text-emerald-300"
                            : "text-red-300"
                        }`}
                      >
                        {asset.changePercent >= 0 ? "+" : ""}
                        {asset.changePercent.toFixed(2)}%
                      </td>
                      <td className="p-4 text-slate-300">
                        {formatVolume(asset.volume)}
                      </td>
                      <td className="p-4">{asset.trend}</td>
                      <td className="p-4">
                        <SignalBadge signal={asset.signal} />
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="h-2 w-24 rounded-full bg-white/10">
                            <div
                              className="h-2 rounded-full bg-cyan-300"
                              style={{ width: `${asset.confidence}%` }}
                            />
                          </div>
                          <span className="text-sm text-slate-300">
                            {asset.confidence}%
                          </span>
                        </div>
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

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
      <p className="text-sm text-slate-400">{label}</p>
      <p className="mt-2 text-3xl font-bold">{value}</p>
    </div>
  );
}

function SignalBadge({ signal }: { signal: Signal }) {
  const styles = {
    BUY: "bg-emerald-400/15 text-emerald-300 border-emerald-400/30",
    HOLD: "bg-yellow-400/15 text-yellow-300 border-yellow-400/30",
    AVOID: "bg-red-400/15 text-red-300 border-red-400/30",
  };

  return (
    <span
      className={`rounded-full border px-3 py-1 text-xs font-bold ${styles[signal]}`}
    >
      {signal}
    </span>
  );
}