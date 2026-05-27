"use client";

import { useEffect, useMemo, useState } from "react";

type Signal = "BUY" | "HOLD" | "AVOID";
type TradeStatus = "OPEN" | "WIN" | "LOSS";
type Bias = "LONG" | "NEUTRAL" | "RISK-OFF";

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
  bias: Bias;
  confidence: number;
  trendScore: number;
  momentumScore: number;
  volumeScore: number;
  riskScore: number;
  finalScore: number;
  grade: "A" | "B" | "C" | "D";
  reason: string;
  isTradable: boolean;
};

type PaperTrade = {
  id: string;
  symbol: string;
  entry: number;
  stopLoss: number;
  takeProfit: number;
  shares: number;
  riskAmount: number;
  potentialProfit: number;
  riskReward: string;
  confidence: number;
  finalScore: number;
  grade: string;
  reason: string;
  status: TradeStatus;
  pnl: number;
  createdAt: string;
};

const STARTING_BALANCE = 10000;
const RISK_PERCENT = 1;
const DEFAULT_WATCHLIST = ["SPY", "QQQ", "IWM", "SMR"];

function clampScore(score: number) {
  return Math.max(0, Math.min(100, Math.round(score)));
}

function getGrade(score: number): Asset["grade"] {
  if (score >= 85) return "A";
  if (score >= 70) return "B";
  if (score >= 55) return "C";
  return "D";
}

function getTradeReason(asset: MarketAsset, finalScore: number, grade: string) {
  const reasons = [];

  if (asset.changePercent > 1) {
    reasons.push("positive momentum");
  }

  if (asset.volume >= 10_000_000) {
    reasons.push("strong liquidity");
  }

  if (Math.abs(asset.changePercent) <= 3) {
    reasons.push("controlled volatility");
  }

  if (grade === "A" || grade === "B") {
    reasons.push("acceptable strategy grade");
  }

  if (reasons.length === 0) {
    return "Setup does not meet enough strategy requirements.";
  }

  return `Score ${finalScore}/100 because of ${reasons.join(", ")}.`;
}

function scoreAsset(asset: MarketAsset): Asset {
  const momentumScore = clampScore(50 + asset.changePercent * 12);

  const volumeScore = clampScore(
    asset.volume >= 50_000_000
      ? 90
      : asset.volume >= 10_000_000
      ? 75
      : asset.volume >= 1_000_000
      ? 60
      : 40
  );

  const riskScore = clampScore(
    Math.abs(asset.changePercent) <= 1.5
      ? 85
      : Math.abs(asset.changePercent) <= 3
      ? 65
      : 40
  );

  const trendScore = clampScore(
    asset.changePercent > 1 ? 85 : asset.changePercent > 0.25 ? 65 : asset.changePercent < -1 ? 30 : 50
  );

  const finalScore = clampScore(
    trendScore * 0.3 +
      momentumScore * 0.3 +
      volumeScore * 0.2 +
      riskScore * 0.2
  );

  const grade = getGrade(finalScore);

  let signal: Signal = "HOLD";
  let trend: Asset["trend"] = "Neutral";
  let bias: Bias = "NEUTRAL";

  const isStrongEnough = finalScore >= 70;
  const hasPositiveMomentum = asset.changePercent > 0;
  const hasEnoughVolume = asset.volume >= 1_000_000;
  const riskIsAcceptable = riskScore >= 60;
  const isTradable = isStrongEnough && hasPositiveMomentum && hasEnoughVolume && riskIsAcceptable;

  if (isTradable) {
    signal = "BUY";
    trend = "Bullish";
    bias = "LONG";
  } else if (finalScore <= 45 || asset.changePercent < -1.5) {
    signal = "AVOID";
    trend = "Bearish";
    bias = "RISK-OFF";
  }

  return {
    ...asset,
    signal,
    trend,
    bias,
    confidence: finalScore,
    trendScore,
    momentumScore,
    volumeScore,
    riskScore,
    finalScore,
    grade,
    reason: getTradeReason(asset, finalScore, grade),
    isTradable,
  };
}

function formatVolume(volume: number) {
  if (volume >= 1_000_000) return `${(volume / 1_000_000).toFixed(1)}M`;
  if (volume >= 1_000) return `${(volume / 1_000).toFixed(1)}K`;
  return volume.toString();
}

function formatMoney(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(value);
}

function cleanSymbol(symbol: string) {
  return symbol.trim().toUpperCase().replace(/[^A-Z.-]/g, "");
}

function createPaperTrade(asset: Asset, currentBalance: number): PaperTrade {
  const entry = asset.price;
  const stopLoss = entry * 0.985;
  const takeProfit = entry * 1.03;

  const riskAmount = currentBalance * (RISK_PERCENT / 100);
  const riskPerShare = entry - stopLoss;
  const shares = Math.max(1, Math.floor(riskAmount / riskPerShare));
  const actualRiskAmount = shares * riskPerShare;
  const potentialProfit = shares * (takeProfit - entry);

  return {
    id: crypto.randomUUID(),
    symbol: asset.symbol,
    entry,
    stopLoss,
    takeProfit,
    shares,
    riskAmount: actualRiskAmount,
    potentialProfit,
    riskReward: "1:2",
    confidence: asset.confidence,
    finalScore: asset.finalScore,
    grade: asset.grade,
    reason: asset.reason,
    status: "OPEN",
    pnl: 0,
    createdAt: new Date().toLocaleString(),
  };
}

export default function Home() {
  const [selectedSignal, setSelectedSignal] = useState<Signal | "ALL">("ALL");
  const [assets, setAssets] = useState<Asset[]>([]);
  const [watchlist, setWatchlist] = useState<string[]>(DEFAULT_WATCHLIST);
  const [newSymbol, setNewSymbol] = useState("");
  const [updatedAt, setUpdatedAt] = useState<string>("Loading...");
  const [isLoading, setIsLoading] = useState(true);
  const [paperTrades, setPaperTrades] = useState<PaperTrade[]>([]);
  const [tradeMessage, setTradeMessage] = useState("");

  useEffect(() => {
    const savedTrades = localStorage.getItem("optima-paper-trades-v4");
    const savedWatchlist = localStorage.getItem("optima-watchlist-v2");

    if (savedTrades) {
      setPaperTrades(JSON.parse(savedTrades));
    }

    if (savedWatchlist) {
      setWatchlist(JSON.parse(savedWatchlist));
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(
      "optima-paper-trades-v4",
      JSON.stringify(paperTrades)
    );
  }, [paperTrades]);

  useEffect(() => {
    localStorage.setItem("optima-watchlist-v2", JSON.stringify(watchlist));
  }, [watchlist]);

  useEffect(() => {
    async function loadMarketData() {
      try {
        setIsLoading(true);

        const symbols = watchlist.join(",");
        const response = await fetch(`/api/market?symbols=${symbols}`, {
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
  }, [watchlist]);

  const totalPnl = useMemo(() => {
    return paperTrades.reduce((sum, trade) => sum + trade.pnl, 0);
  }, [paperTrades]);

  const currentBalance = STARTING_BALANCE + totalPnl;

  const closedTrades = paperTrades.filter((trade) => trade.status !== "OPEN");
  const winningTrades = paperTrades.filter((trade) => trade.status === "WIN");
  const openTrades = paperTrades.filter((trade) => trade.status === "OPEN");

  const winRate =
    closedTrades.length === 0
      ? 0
      : Math.round((winningTrades.length / closedTrades.length) * 100);

  const filteredAssets = useMemo(() => {
    if (selectedSignal === "ALL") return assets;
    return assets.filter((asset) => asset.signal === selectedSignal);
  }, [assets, selectedSignal]);

  const strongestAsset = useMemo(() => {
    if (assets.length === 0) return null;
    return [...assets].sort((a, b) => b.finalScore - a.finalScore)[0];
  }, [assets]);

  const bestBuySetup = useMemo(() => {
    const buySignals = assets.filter((asset) => asset.signal === "BUY" && asset.isTradable);
    if (buySignals.length === 0) return null;
    return [...buySignals].sort((a, b) => b.finalScore - a.finalScore)[0];
  }, [assets]);

  const buySignals = assets.filter((asset) => asset.signal === "BUY").length;
  const tradableSetups = assets.filter((asset) => asset.isTradable).length;

  function handleAddSymbol() {
    const symbol = cleanSymbol(newSymbol);

    if (!symbol) return;

    if (watchlist.includes(symbol)) {
      setNewSymbol("");
      return;
    }

    if (watchlist.length >= 12) {
      alert("Watchlist limit is 12 symbols for now.");
      return;
    }

    setWatchlist((currentWatchlist) => [...currentWatchlist, symbol]);
    setNewSymbol("");
  }

  function handleRemoveSymbol(symbol: string) {
    setWatchlist((currentWatchlist) =>
      currentWatchlist.filter((item) => item !== symbol)
    );
  }

  function handleResetWatchlist() {
    setWatchlist(DEFAULT_WATCHLIST);
  }

  function handleCreatePaperTrade() {
    if (!bestBuySetup) {
      setTradeMessage("No A/B grade tradable setup available right now.");
      return;
    }

    const alreadyOpen = paperTrades.some(
      (trade) => trade.symbol === bestBuySetup.symbol && trade.status === "OPEN"
    );

    if (alreadyOpen) {
      setTradeMessage(`Blocked duplicate trade: ${bestBuySetup.symbol} is already open.`);
      return;
    }

    const newTrade = createPaperTrade(bestBuySetup, currentBalance);

    setPaperTrades((currentTrades) => [newTrade, ...currentTrades]);
    setTradeMessage(`Logged ${bestBuySetup.symbol} paper trade with Grade ${bestBuySetup.grade}.`);
  }

  function handleUpdateTradeStatus(id: string, status: TradeStatus) {
    setPaperTrades((currentTrades) =>
      currentTrades.map((trade) => {
        if (trade.id !== id) return trade;

        let pnl = 0;

        if (status === "WIN") {
          pnl = trade.potentialProfit;
        } else if (status === "LOSS") {
          pnl = -trade.riskAmount;
        }

        return {
          ...trade,
          status,
          pnl,
        };
      })
    );
  }

  function handleClearTrades() {
    setPaperTrades([]);
    setTradeMessage("Paper trade log cleared.");
  }

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
                Strategy Command Center
              </h1>
              <p className="mt-4 max-w-2xl text-slate-300">
                Live quote data, custom watchlists, strategy scoring, duplicate
                trade protection, paper trades, and performance tracking.
              </p>
              <p className="mt-3 text-sm text-slate-400">
                Last updated: {updatedAt}
              </p>
            </div>

            <div className="rounded-2xl border border-cyan-400/30 bg-cyan-400/10 p-5">
              <p className="text-sm text-slate-300">Top strategy setup</p>
              <p className="mt-1 text-3xl font-bold text-cyan-300">
                {strongestAsset ? strongestAsset.symbol : "---"}
              </p>
              <p className="text-sm text-slate-300">
                {strongestAsset
                  ? `${strongestAsset.finalScore}/100 · Grade ${strongestAsset.grade}`
                  : "Loading"}
              </p>
            </div>
          </div>
        </section>

        <section className="mb-8 grid gap-4 md:grid-cols-4">
          <StatCard label="Paper Balance" value={formatMoney(currentBalance)} />
          <StatCard label="Total P/L" value={formatMoney(totalPnl)} />
          <StatCard label="Open Trades" value={openTrades.length.toString()} />
          <StatCard label="Win Rate" value={`${winRate}%`} />
        </section>

        <section className="mb-8 grid gap-4 md:grid-cols-4">
          <StatCard label="Tracked Assets" value={assets.length.toString()} />
          <StatCard label="Buy Signals" value={buySignals.toString()} />
          <StatCard label="Tradable Setups" value={tradableSetups.toString()} />
          <StatCard label="Strategy Engine" value="v2" />
        </section>

        <section className="mb-8 rounded-3xl border border-white/10 bg-white/5 p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h2 className="text-2xl font-bold">Watchlist v2</h2>
              <p className="mt-2 text-sm text-slate-400">
                Add up to 12 tickers. Saved in your browser.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <input
                value={newSymbol}
                onChange={(event) => setNewSymbol(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") handleAddSymbol();
                }}
                placeholder="Add ticker: NVDA"
                className="rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 font-semibold text-white outline-none placeholder:text-slate-500 focus:border-cyan-300"
              />
              <button
                onClick={handleAddSymbol}
                className="rounded-2xl bg-cyan-300 px-5 py-3 font-bold text-slate-950 transition hover:bg-cyan-200"
              >
                Add Ticker
              </button>
              <button
                onClick={handleResetWatchlist}
                className="rounded-2xl bg-white/10 px-5 py-3 font-bold text-slate-300 transition hover:bg-white/20"
              >
                Reset
              </button>
            </div>
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            {watchlist.map((symbol) => (
              <button
                key={symbol}
                onClick={() => handleRemoveSymbol(symbol)}
                className="rounded-full border border-white/10 bg-slate-950 px-4 py-2 text-sm font-bold text-slate-200 hover:border-red-300/50 hover:text-red-300"
                title="Click to remove"
              >
                {symbol} ×
              </button>
            ))}
          </div>
        </section>

        <section className="mb-8 grid gap-6 lg:grid-cols-2">
          <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
            <h2 className="text-2xl font-bold">Strategy Engine v2</h2>
            <p className="mt-2 text-sm text-slate-400">
              Only A/B grade setups with positive momentum, enough volume, and
              acceptable risk can be logged.
            </p>

            <div className="mt-6 rounded-2xl border border-white/10 bg-slate-950/60 p-5">
              {bestBuySetup ? (
                <>
                  <p className="text-sm text-slate-400">Best tradable setup</p>
                  <div className="mt-2 flex items-end justify-between gap-4">
                    <div>
                      <p className="text-4xl font-bold text-cyan-300">
                        {bestBuySetup.symbol}
                      </p>
                      <p className="mt-1 text-sm text-slate-300">
                        {bestBuySetup.name}
                      </p>
                    </div>
                    <GradeBadge grade={bestBuySetup.grade} />
                  </div>

                  <p className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-slate-300">
                    {bestBuySetup.reason}
                  </p>

                  <div className="mt-6 grid gap-3 md:grid-cols-4">
                    <ScoreMetric label="Trend" value={bestBuySetup.trendScore} />
                    <ScoreMetric label="Momentum" value={bestBuySetup.momentumScore} />
                    <ScoreMetric label="Volume" value={bestBuySetup.volumeScore} />
                    <ScoreMetric label="Risk" value={bestBuySetup.riskScore} />
                  </div>

                  <div className="mt-4 grid gap-3 md:grid-cols-3">
                    <TradeMetric label="Entry" value={formatMoney(bestBuySetup.price)} />
                    <TradeMetric label="Stop Loss" value={formatMoney(bestBuySetup.price * 0.985)} />
                    <TradeMetric label="Take Profit" value={formatMoney(bestBuySetup.price * 1.03)} />
                  </div>

                  <button
                    onClick={handleCreatePaperTrade}
                    className="mt-6 w-full rounded-2xl bg-cyan-300 px-5 py-3 font-bold text-slate-950 transition hover:bg-cyan-200"
                  >
                    Log Strategy Paper Trade
                  </button>
                </>
              ) : (
                <p className="text-slate-300">
                  No A/B grade tradable setup available right now.
                </p>
              )}

              {tradeMessage && (
                <p className="mt-4 rounded-2xl border border-cyan-400/20 bg-cyan-400/10 p-4 text-sm text-cyan-200">
                  {tradeMessage}
                </p>
              )}
            </div>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold">Paper Trade Log</h2>
                <p className="mt-2 text-sm text-slate-400">
                  Mark trades as wins or losses to track performance.
                </p>
              </div>

              <button
                onClick={handleClearTrades}
                className="rounded-full bg-white/10 px-4 py-2 text-sm font-semibold text-slate-300 hover:bg-white/20"
              >
                Clear
              </button>
            </div>

            <div className="mt-6 max-h-[560px] space-y-3 overflow-y-auto pr-2">
              {paperTrades.length === 0 ? (
                <p className="rounded-2xl border border-white/10 bg-slate-950/60 p-5 text-slate-400">
                  No paper trades logged yet.
                </p>
              ) : (
                paperTrades.map((trade) => (
                  <div
                    key={trade.id}
                    className="rounded-2xl border border-white/10 bg-slate-950/60 p-5"
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <p className="text-2xl font-bold text-cyan-300">
                          {trade.symbol}
                        </p>
                        <p className="text-sm text-slate-400">
                          {trade.createdAt}
                        </p>
                      </div>
                      <StatusBadge status={trade.status} />
                    </div>

                    <p className="mt-4 rounded-xl bg-white/5 p-3 text-sm text-slate-300">
                      {trade.reason}
                    </p>

                    <div className="mt-4 grid gap-3 md:grid-cols-4">
                      <TradeMetric label="Entry" value={formatMoney(trade.entry)} />
                      <TradeMetric label="Shares" value={trade.shares.toString()} />
                      <TradeMetric label="Risk" value={formatMoney(trade.riskAmount)} />
                      <TradeMetric label="P/L" value={formatMoney(trade.pnl)} />
                    </div>

                    <div className="mt-4 grid gap-3 md:grid-cols-4">
                      <TradeMetric label="Stop" value={formatMoney(trade.stopLoss)} />
                      <TradeMetric label="Target" value={formatMoney(trade.takeProfit)} />
                      <TradeMetric label="Score" value={`${trade.finalScore}/100`} />
                      <TradeMetric label="Grade" value={trade.grade} />
                    </div>

                    <div className="mt-4 flex gap-2">
                      <button
                        onClick={() => handleUpdateTradeStatus(trade.id, "OPEN")}
                        className="rounded-full bg-white/10 px-4 py-2 text-sm font-semibold hover:bg-white/20"
                      >
                        Open
                      </button>
                      <button
                        onClick={() => handleUpdateTradeStatus(trade.id, "WIN")}
                        className="rounded-full bg-emerald-400/15 px-4 py-2 text-sm font-semibold text-emerald-300 hover:bg-emerald-400/25"
                      >
                        Win
                      </button>
                      <button
                        onClick={() => handleUpdateTradeStatus(trade.id, "LOSS")}
                        className="rounded-full bg-red-400/15 px-4 py-2 text-sm font-semibold text-red-300 hover:bg-red-400/25"
                      >
                        Loss
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </section>

        <section className="rounded-3xl border border-white/10 bg-white/5 p-6">
          <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-2xl font-bold">Live Strategy Watchlist</h2>
              <p className="text-sm text-slate-400">
                Real quote data ranked by strategy score.
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
                  <th className="p-4">Bias</th>
                  <th className="p-4">Signal</th>
                  <th className="p-4">Grade</th>
                  <th className="p-4">Final Score</th>
                  <th className="p-4">Volume</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td className="p-4 text-slate-300" colSpan={8}>
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
                        {formatMoney(asset.price)}
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
                      <td className="p-4">{asset.bias}</td>
                      <td className="p-4">
                        <SignalBadge signal={asset.signal} />
                      </td>
                      <td className="p-4">
                        <GradeBadge grade={asset.grade} />
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="h-2 w-24 rounded-full bg-white/10">
                            <div
                              className="h-2 rounded-full bg-cyan-300"
                              style={{ width: `${asset.finalScore}%` }}
                            />
                          </div>
                          <span className="text-sm text-slate-300">
                            {asset.finalScore}/100
                          </span>
                        </div>
                      </td>
                      <td className="p-4 text-slate-300">
                        {formatVolume(asset.volume)}
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

function TradeMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-white/5 p-3">
      <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 font-bold">{value}</p>
    </div>
  );
}

function ScoreMetric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl bg-white/5 p-3">
      <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-xl font-bold">{value}/100</p>
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

function StatusBadge({ status }: { status: TradeStatus }) {
  const styles = {
    OPEN: "bg-cyan-400/15 text-cyan-300 border-cyan-400/30",
    WIN: "bg-emerald-400/15 text-emerald-300 border-emerald-400/30",
    LOSS: "bg-red-400/15 text-red-300 border-red-400/30",
  };

  return (
    <span
      className={`rounded-full border px-3 py-1 text-xs font-bold ${styles[status]}`}
    >
      {status}
    </span>
  );
}

function GradeBadge({ grade }: { grade: Asset["grade"] | string }) {
  const styles = {
    A: "bg-emerald-400/15 text-emerald-300 border-emerald-400/30",
    B: "bg-cyan-400/15 text-cyan-300 border-cyan-400/30",
    C: "bg-yellow-400/15 text-yellow-300 border-yellow-400/30",
    D: "bg-red-400/15 text-red-300 border-red-400/30",
  };

  const gradeStyle = styles[grade as keyof typeof styles] ?? styles.D;

  return (
    <span
      className={`rounded-full border px-3 py-1 text-xs font-bold ${gradeStyle}`}
    >
      Grade {grade}
    </span>
  );
}