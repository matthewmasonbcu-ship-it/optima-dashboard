"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { supabase } from "../lib/supabaseClient";
import type { MarketCondition, ScanResult, VixRegime } from "../lib/scanner";
import type { RiskGuardCheck } from "../lib/preTradeChecks";

// ── Types ─────────────────────────────────────────────────────────────────────

type PendingApproval = {
  id: string;
  symbol: string | null;
  contract_symbol: string | null;
  contract_quality: string | null;
  max_risk_dollars: number | null;
  option_type: string | null;
};

type NewsItem = {
  headline: string;
  summary: string;
  source: string;
  datetime: number;
  url: string;
};

type MasterState = "NOMINAL" | "ACTION_NEEDED" | "ATTENTION";

export type CommandCenterPanelProps = {
  scannerResults: ScanResult[];
  marketCondition: MarketCondition;
  vixLevel: number | null;
  vixRegime: VixRegime;
  optionRiskCheckStatus: RiskGuardCheck["status"];
  dailyTradeCount: number;
  dailyLossCount: number;
  isScanning: boolean;
  onSwitchToAlerts: () => void;
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatTime(d: Date) {
  return d.toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
  });
}

function relativeTime(unix: number): string {
  const diffMs = Date.now() - unix * 1000;
  const diffMin = Math.floor(diffMs / 60_000);
  if (diffMin < 1) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `${diffH}h ago`;
  return `${Math.floor(diffH / 24)}d ago`;
}

function computeBlockReasonCounts(results: ScanResult[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const r of results) {
    const reasons = r.blockReasons ?? r.block_reasons ?? [];
    for (const reason of reasons) {
      counts.set(reason, (counts.get(reason) ?? 0) + 1);
    }
    if ((r.setupScore ?? 0) < 75 && reasons.length === 0) {
      const k = "Below score threshold";
      counts.set(k, (counts.get(k) ?? 0) + 1);
    }
  }
  return counts;
}

// ── Shared sub-components ─────────────────────────────────────────────────────

function Pill({
  label,
  tone,
  pulse,
}: {
  label: string;
  tone: "green" | "red" | "amber" | "muted";
  pulse?: boolean;
}) {
  const reduced = useReducedMotion() ?? false;
  const cls =
    tone === "green"
      ? "border-emerald-500/25 bg-emerald-500/[0.08] text-emerald-400"
      : tone === "red"
        ? "border-red-500/30 bg-red-500/10 text-red-400"
        : tone === "amber"
          ? "border-amber-500/25 bg-amber-500/[0.08] text-amber-400"
          : "border-slate-700/60 bg-slate-900/40 text-slate-500";
  const dotCls =
    tone === "green"
      ? "bg-emerald-400"
      : tone === "red"
        ? "bg-red-400"
        : tone === "amber"
          ? "bg-amber-400"
          : "bg-slate-600";
  // label token: 9px bold, tracking-[0.16em], tone color
  const pillCls = `inline-flex items-center gap-1.5 rounded-full border px-3 py-1 font-mono text-[9px] font-bold uppercase tracking-[0.16em] ${cls}`;
  const dot = <span className={`h-1 w-1 shrink-0 rounded-full ${dotCls}`} />;
  if (pulse && !reduced) {
    return (
      <motion.span
        className={pillCls}
        animate={{ opacity: [1, 0.45, 1] }}
        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
      >
        {dot}
        {label}
      </motion.span>
    );
  }
  return (
    <span className={pillCls}>
      {dot}
      {label}
    </span>
  );
}

// ── Scan sweep — ambient "watching" indicator ─────────────────────────────────

function ScanSweep({ sweepRevision }: { sweepRevision: number }) {
  const reduced = useReducedMotion();
  if (reduced) return null;
  return (
    <div
      className="pointer-events-none absolute inset-0 overflow-hidden"
      aria-hidden="true"
    >
      {/* Ambient layer — gentle, always looping, "system is watching" */}
      <motion.div
        className="absolute inset-x-0 h-[72px]"
        style={{
          top: -72,
          background:
            "linear-gradient(to bottom, transparent 0%, rgba(139,92,246,0.09) 50%, transparent 100%)",
        }}
        animate={{ y: [0, 380] }}
        transition={{ duration: 4, repeat: Infinity, ease: "linear", repeatDelay: 6 }}
      />
      {/* Radar-lock layer — one deliberate pass per real scan event, then silence */}
      {sweepRevision > 0 && (
        <motion.div
          key={sweepRevision}
          className="absolute inset-x-0"
          style={{
            top: -100,
            height: 100,
            background:
              "linear-gradient(to bottom, transparent 0%, rgba(139,92,246,0.07) 25%, rgba(139,92,246,0.28) 55%, rgba(139,92,246,0.08) 80%, transparent 100%)",
          }}
          animate={{ y: [0, 430] }}
          transition={{ duration: 1.8, ease: "easeIn" }}
        />
      )}
    </div>
  );
}

// ── Zone 1 — System Status ────────────────────────────────────────────────────

function Zone1SystemStatus({
  masterState,
  sandboxOrderUnlocked,
  liveOrderEnabled,
  marketCondition,
  vixLevel,
  vixRegime,
  optionRiskCheckStatus,
  lastUpdated,
  loading,
  onRefresh,
  sweepRevision,
}: {
  masterState: MasterState;
  sandboxOrderUnlocked: boolean | null;
  liveOrderEnabled: boolean | null;
  marketCondition: MarketCondition;
  vixLevel: number | null;
  vixRegime: VixRegime;
  optionRiskCheckStatus: RiskGuardCheck["status"];
  lastUpdated: Date | null;
  loading: boolean;
  onRefresh: () => void;
  sweepRevision: number;
}) {
  const masterLabel =
    masterState === "ATTENTION"
      ? "ATTENTION"
      : masterState === "ACTION_NEEDED"
        ? "ACTION NEEDED"
        : "SYSTEM NOMINAL";

  const masterColor =
    masterState === "ATTENTION"
      ? "text-red-400"
      : masterState === "ACTION_NEEDED"
        ? "text-violet-300/80"
        : "text-emerald-400";

  const masterBarColor =
    masterState === "ATTENTION"
      ? "bg-red-500"
      : masterState === "ACTION_NEEDED"
        ? "bg-violet-500"
        : "bg-emerald-500";

  const masterBorder =
    masterState === "ATTENTION"
      ? "border-red-500/20"
      : masterState === "ACTION_NEEDED"
        ? "border-violet-500/15"
        : "border-slate-700/50";

  const executionTone: "green" | "red" =
    sandboxOrderUnlocked === true ? "red" : "green";
  const executionLabel =
    sandboxOrderUnlocked === true ? "EXECUTION UNLOCKED" : "EXECUTION LOCKED";

  const liveTone: "green" | "red" =
    liveOrderEnabled === true ? "red" : "green";
  const liveLabel =
    liveOrderEnabled === true ? "LIVE TRADING ON" : "LIVE TRADING OFF";

  const vixLabel =
    vixRegime === "HIGH_RISK"
      ? "VIX: HIGH RISK"
      : vixRegime === "ELEVATED"
        ? "VIX: ELEVATED"
        : vixRegime === "CALM"
          ? "VIX: CALM"
          : "VIX: UNKNOWN";
  const vixTone: "green" | "amber" | "red" | "muted" =
    vixRegime === "HIGH_RISK"
      ? "red"
      : vixRegime === "ELEVATED"
        ? "amber"
        : vixRegime === "CALM"
          ? "green"
          : "muted";

  const marketTone: "green" | "amber" | "red" | "muted" =
    marketCondition === "BULLISH"
      ? "green"
      : marketCondition === "BEARISH"
        ? "red"
        : marketCondition === "CHOPPY"
          ? "amber"
          : "muted";

  return (
    <div
      className={`relative overflow-hidden rounded-2xl border ${masterBorder} bg-slate-950/80 shadow-xl shadow-black/40`}
    >
      <ScanSweep sweepRevision={sweepRevision} />
      <div className={`absolute inset-x-0 top-0 h-[2px] ${masterBarColor} opacity-60`} />

      <div className="px-5 py-4 sm:px-6">
        {/* Header row */}
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div>
              {/* eyebrow token: 9px bold, tracking-[0.25em], slate-600 (dim — recedes) */}
              <p className="mb-1 font-mono text-[9px] font-bold uppercase tracking-[0.25em] text-slate-600">
                GENTRADR · COMMAND CENTER
              </p>
              <div className="flex items-center gap-2">
                <span
                  className={`h-2 w-2 shrink-0 rounded-full ${
                    masterState === "ATTENTION"
                      ? "bg-red-500"
                      : masterState === "ACTION_NEEDED"
                        ? "bg-violet-400/70"
                        : "bg-emerald-500"
                  }`}
                />
                {/* value token: text-xs black, tracking-[0.08em] */}
                <span
                  className={`font-mono text-xs font-black uppercase tracking-[0.08em] ${masterColor}`}
                >
                  {masterLabel}
                </span>
                {masterState === "ATTENTION" && (
                  // label token, dimmed red — qualifier, not primary signal
                  <span className="font-mono text-[9px] font-bold uppercase tracking-[0.16em] text-red-500/60">
                    · safety lock breach
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start">
            {loading && (
              // label token
              <span className="flex items-center gap-1.5 font-mono text-[9px] font-bold uppercase tracking-[0.16em] text-slate-600">
                <span className="h-1 w-1 animate-ping rounded-full bg-violet-400 opacity-60" />
                Refreshing
              </span>
            )}
            {lastUpdated && !loading && (
              // dim metadata — no uppercase, compact tracking
              <span className="font-mono text-[9px] tracking-[0.08em] text-slate-600">
                {formatTime(lastUpdated)}
              </span>
            )}
            <button
              type="button"
              onClick={onRefresh}
              disabled={loading}
              className="rounded-lg border border-slate-800 bg-slate-900/60 px-3 py-1 font-mono text-[9px] font-bold uppercase tracking-[0.16em] text-slate-600 transition hover:border-slate-700 hover:text-slate-400 disabled:cursor-not-allowed disabled:opacity-40"
            >
              ⟳
            </button>
          </div>
        </div>

        {/* Status pills */}
        <div className="flex flex-wrap gap-2">
          <Pill label={executionLabel} tone={executionTone} />
          <Pill label={liveLabel} tone={liveTone} />
          <Pill label="PAPER MODE" tone="green" />
          <Pill label={`MARKET: ${marketCondition}`} tone={marketTone} />
          <Pill
            label={vixLevel !== null ? `${vixLabel} · ${vixLevel.toFixed(1)}` : vixLabel}
            tone={vixTone}
          />
          <Pill
            label={`RISK GUARD: ${optionRiskCheckStatus}`}
            tone={
              optionRiskCheckStatus === "APPROVED"
                ? "green"
                : optionRiskCheckStatus === "BLOCKED"
                  ? "red"
                  : "amber"
            }
            pulse={optionRiskCheckStatus === "BLOCKED"}
          />
        </div>
      </div>

      <div
        className="absolute inset-x-0 bottom-0 h-px opacity-10"
        style={{ background: "linear-gradient(90deg, transparent, #8b5cf6, transparent)" }}
      />
    </div>
  );
}

// ── Zone 2 — Action (the ONE loud thing) ──────────────────────────────────────

function Zone2Action({
  pendingApprovals,
  loading,
  onSwitchToAlerts,
}: {
  pendingApprovals: PendingApproval[];
  loading: boolean;
  onSwitchToAlerts: () => void;
}) {
  const reduced = useReducedMotion() ?? false;
  const top = pendingApprovals[0] ?? null;

  if (loading && pendingApprovals.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center rounded-2xl border border-slate-800/60 bg-slate-950/40 px-5 py-8">
        {/* body token */}
        <span className="flex items-center gap-2 font-mono text-[11px] text-slate-600">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-slate-600" />
          Checking queue…
        </span>
      </div>
    );
  }

  if (!top) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 rounded-2xl border border-slate-800/50 bg-slate-950/40 px-5 py-8 text-center">
        <span className="h-1.5 w-1.5 rounded-full bg-slate-700" />
        {/* body token */}
        <span className="font-mono text-[11px] text-slate-600">
          No trades awaiting approval.
        </span>
        {/* dim metadata */}
        <span className="font-mono text-[9px] tracking-[0.08em] text-slate-700">
          Pipeline runs daily at 9:30 ET.
        </span>
      </div>
    );
  }

  const gradeColor =
    top.contract_quality === "A+" || top.contract_quality === "A"
      ? "text-emerald-400 border-emerald-500/40 bg-emerald-500/10"
      : top.contract_quality === "B"
        ? "text-sky-400 border-sky-500/40 bg-sky-500/10"
        : "text-slate-400 border-slate-700 bg-slate-900";

  return (
    <div className="relative flex h-full flex-col overflow-hidden rounded-2xl border border-violet-500/40 bg-violet-950/30 shadow-lg shadow-violet-900/20">
      {/* The ONE loud glow */}
      <div
        className="pointer-events-none absolute inset-0 rounded-2xl"
        style={{ boxShadow: "inset 0 0 40px rgba(139,92,246,0.08)" }}
      />
      <div
        className="absolute inset-x-0 top-0 h-[2px]"
        style={{
          background:
            "linear-gradient(90deg, transparent 0%, #8b5cf6 40%, #a78bfa 60%, transparent 100%)",
        }}
      />
      <div className="absolute inset-y-0 left-0 w-[3px] bg-violet-500" />

      <motion.div
        key={top.id}
        initial={reduced ? false : { opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
        className="relative flex flex-1 flex-col justify-between px-5 py-4"
      >
        <div>
          {/* eyebrow token — violet context, dimmed */}
          <p className="mb-3 font-mono text-[9px] font-bold uppercase tracking-[0.25em] text-violet-500/60">
            AWAITING APPROVAL · {pendingApprovals.length} QUEUED
          </p>

          <div className="mb-3 flex flex-wrap items-center gap-3">
            {/* hero token: 2xl black tight — dominates the zone */}
            <span className="font-mono text-2xl font-black tracking-tight text-white">
              {top.symbol ?? "—"}
            </span>
            {top.option_type && (
              // value token badge
              <span className="rounded-md border border-violet-500/40 bg-violet-500/15 px-2.5 py-1 font-mono text-xs font-black uppercase tracking-[0.16em] text-violet-300">
                {top.option_type}
              </span>
            )}
            {top.contract_quality && (
              // value token badge
              <span
                className={`rounded-md border px-2.5 py-1 font-mono text-xs font-black uppercase tracking-[0.16em] ${gradeColor}`}
              >
                Grade {top.contract_quality}
              </span>
            )}
          </div>

          {top.contract_symbol && (
            // body token
            <p className="mb-3 font-mono text-[11px] text-slate-500">
              {top.contract_symbol}
            </p>
          )}
        </div>

        <motion.button
          type="button"
          onClick={onSwitchToAlerts}
          whileHover={reduced ? undefined : { y: -1 }}
          whileTap={reduced ? undefined : { scale: 0.98 }}
          transition={{ duration: 0.15 }}
          // value token on button
          className="inline-flex items-center gap-2 self-start rounded-xl border border-violet-500/50 bg-violet-500/20 px-5 py-2.5 font-mono text-xs font-black uppercase tracking-[0.16em] text-violet-200 transition hover:border-violet-400/70 hover:bg-violet-500/30 hover:text-white"
        >
          Review &amp; Approve
          <span aria-hidden>→</span>
        </motion.button>
      </motion.div>
    </div>
  );
}

// ── Zone 3 — Scanner discipline log ──────────────────────────────────────────

function Zone3WhyIdle({
  scannerResults,
  isScanning,
  hasPendingAction,
}: {
  scannerResults: ScanResult[];
  isScanning: boolean;
  hasPendingAction: boolean;
}) {
  const total = scannerResults.length;
  const passed = scannerResults.filter(
    (r) =>
      (r.setupScore ?? 0) >= 75 &&
      r.direction !== "NO TRADE" &&
      r.tradeDirection !== "NO TRADE"
  ).length;
  const blockCounts = computeBlockReasonCounts(scannerResults);

  const borderCls = hasPendingAction
    ? "border-slate-800/50"
    : "border-slate-700/50";

  return (
    <div
      className={`relative flex h-full flex-col overflow-hidden rounded-2xl border ${borderCls} bg-slate-950/60`}
    >
      <div className="absolute inset-y-0 left-0 w-[3px] bg-slate-700/50" />

      <div className="flex flex-1 flex-col px-5 py-4">
        {/* eyebrow token */}
        <p className="mb-3 font-mono text-[9px] font-bold uppercase tracking-[0.25em] text-slate-600">
          SCANNER · DISCIPLINE LOG
        </p>

        {isScanning ? (
          <div className="flex flex-1 items-center gap-2">
            <span className="h-1.5 w-1.5 animate-ping rounded-full bg-violet-400" />
            {/* body token */}
            <span className="font-mono text-[11px] text-slate-500">Scanner running…</span>
          </div>
        ) : total === 0 ? (
          // body token
          <p className="flex-1 py-2 font-mono text-[11px] text-slate-600">
            No scan data yet. Run the scanner from the Trade tab.
          </p>
        ) : (
          <div className="flex flex-1 flex-col">
            {/* value token — primary data read */}
            <p className="mb-4 font-mono text-xs font-black text-slate-300">
              {passed > 0
                ? `${passed} of ${total} passed · ready for contract check`
                : `0 of ${total} passed all rules`}
            </p>

            {blockCounts.size > 0 && (
              <div className="mb-4 space-y-1.5">
                {Array.from(blockCounts.entries()).map(([reason, count]) => (
                  <div key={reason} className="flex items-baseline gap-3">
                    {/* value token for counts */}
                    <span className="w-4 shrink-0 text-right font-mono text-xs font-black text-slate-500">
                      {count}
                    </span>
                    {/* body token for reason text */}
                    <span className="font-mono text-[11px] text-slate-600">
                      {reason.toLowerCase()}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* value token — discipline verdict */}
            <p className="mb-3 font-mono text-xs font-black uppercase tracking-[0.08em] text-slate-500">
              {passed === 0
                ? "Discipline holding. No qualifying setups."
                : `${passed} setup${passed !== 1 ? "s" : ""} passed scanner. Contract checks next.`}
            </p>

            {/* dim metadata footer */}
            <p className="mt-auto font-mono text-[9px] leading-4 tracking-[0.08em] text-slate-700">
              Scanner-level reasons only — delta, DTE, and grade checks run after a setup qualifies.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Zone 4 — Discipline strip ─────────────────────────────────────────────────

function Stat({
  label,
  value,
  warn,
  crit,
  reduced,
}: {
  label: string;
  value: string;
  warn?: boolean;
  crit?: boolean;
  reduced: boolean;
}) {
  const prevRef = useRef(value);
  const hasChanged = prevRef.current !== value;
  useEffect(() => { prevRef.current = value; });

  const color = crit
    ? "text-red-400"
    : warn
      ? "text-amber-300"
      : "text-slate-400";
  return (
    <div className="flex flex-col gap-1">
      {/* label token: 9px bold tracking-[0.16em] — full label contrast */}
      <span className="font-mono text-[9px] font-bold uppercase tracking-[0.16em] text-slate-600">
        {label}
      </span>
      {/* value token: text-xs black tracking-[0.08em] */}
      <motion.span
        key={value}
        initial={reduced || !hasChanged ? false : { opacity: 0, scale: 0.85 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.25, ease: "easeOut" }}
        className={`font-mono text-xs font-black tracking-[0.08em] ${color}`}
      >
        {value}
      </motion.span>
    </div>
  );
}

function Zone4Discipline({
  dailyTradeCount,
  dailyLossCount,
  dailyDrawdown,
  tradingDayCount,
}: {
  dailyTradeCount: number;
  dailyLossCount: number;
  dailyDrawdown: number;
  tradingDayCount: number;
}) {
  const reduced = useReducedMotion() ?? false;

  return (
    <div className="flex flex-wrap items-center gap-5 rounded-xl border border-slate-800/50 bg-slate-950/40 px-5 py-3">
      <Stat
        label="Trades today"
        value={`${dailyTradeCount} / 3`}
        warn={dailyTradeCount >= 2}
        crit={dailyTradeCount >= 3}
        reduced={reduced}
      />
      <Stat
        label="Losses today"
        value={`${dailyLossCount} / 2`}
        warn={dailyLossCount >= 1}
        crit={dailyLossCount >= 2}
        reduced={reduced}
      />
      <Stat
        label="Daily drawdown"
        value={`$${dailyDrawdown.toFixed(0)} / $2,500`}
        warn={dailyDrawdown >= 2000}
        crit={dailyDrawdown >= 2500}
        reduced={reduced}
      />
      <Stat
        label="Trading day"
        value={`Day ${tradingDayCount} / 30`}
        warn={tradingDayCount >= 25}
        reduced={reduced}
      />
    </div>
  );
}

// ── Zone 5 — Market news feed ─────────────────────────────────────────────────

function Zone5News() {
  const reduced = useReducedMotion() ?? false;
  const [items, setItems] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastFetched, setLastFetched] = useState<Date | null>(null);

  const loadNews = useCallback(async () => {
    try {
      const res = await fetch("/api/news/market");
      const data = await res.json();
      if (!data.success) throw new Error(data.error ?? "Failed to load news");
      setItems((data.items as NewsItem[]).slice(0, 8));
      setLastFetched(new Date());
      setError(null);
    } catch (err: any) {
      setError(err?.message ?? "Could not load market news.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadNews();
    const interval = setInterval(() => void loadNews(), 15 * 60 * 1000);
    return () => clearInterval(interval);
  }, [loadNews]);

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-800/50 bg-slate-950/40">
      <div className="flex items-center justify-between border-b border-slate-800/40 px-5 py-3">
        {/* eyebrow token */}
        <p className="font-mono text-[9px] font-bold uppercase tracking-[0.25em] text-slate-600">
          MARKET NEWS
        </p>
        {lastFetched && (
          // dim metadata
          <span className="font-mono text-[9px] tracking-[0.08em] text-slate-700">
            updated {relativeTime(Math.floor(lastFetched.getTime() / 1000))}
          </span>
        )}
      </div>

      {loading && items.length === 0 && (
        <div className="flex items-center gap-2 px-5 py-4">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-slate-700" />
          {/* body token */}
          <span className="font-mono text-[11px] text-slate-600">Loading market news…</span>
        </div>
      )}

      {error && !loading && (
        <div className="px-5 py-4">
          {/* body token */}
          <span className="font-mono text-[11px] text-slate-600">{error}</span>
        </div>
      )}

      {items.length > 0 && (
        <div className="divide-y divide-slate-800/40">
          {items.map((item, i) => (
            <motion.a
              key={i}
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              whileHover={reduced ? undefined : { x: 2 }}
              transition={{ duration: 0.15, ease: "easeOut" }}
              className="block px-5 py-3 transition-colors hover:bg-slate-900/40"
            >
              <div className="mb-1 flex items-center gap-2">
                {/* label token — source name */}
                <span className="font-mono text-[9px] font-bold uppercase tracking-[0.16em] text-slate-500">
                  {item.source}
                </span>
                <span className="text-slate-800">·</span>
                {/* dim metadata — timestamp */}
                <span className="font-mono text-[9px] tracking-[0.08em] text-slate-700">
                  {relativeTime(item.datetime)}
                </span>
              </div>
              {/* body token — headline is content, not label */}
              <p className="font-mono text-[11px] leading-[1.45] text-slate-200">
                {item.headline}
              </p>
            </motion.a>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Root component ────────────────────────────────────────────────────────────

export default function CommandCenterPanel({
  scannerResults,
  marketCondition,
  vixLevel,
  vixRegime,
  optionRiskCheckStatus,
  dailyTradeCount,
  dailyLossCount,
  isScanning,
  onSwitchToAlerts,
}: CommandCenterPanelProps) {
  const [loading, setLoading] = useState(false);
  const [sandboxOrderUnlocked, setSandboxOrderUnlocked] = useState<boolean | null>(null);
  const [liveOrderEnabled, setLiveOrderEnabled] = useState<boolean | null>(null);
  const [pendingApprovals, setPendingApprovals] = useState<PendingApproval[]>([]);
  const [dailyDrawdown, setDailyDrawdown] = useState(0);
  const [tradingDayCount, setTradingDayCount] = useState(0);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // Sweep revision — increments on each real scan event to key the radar-lock animation.
  const [sweepRevision, setSweepRevision] = useState(0);
  // null sentinel: first observation sets the baseline without firing.
  const prevApprovalCountRef = useRef<number | null>(null);
  const prevScanningRef = useRef(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);

      const [
        sandboxResult,
        submittedResult,
        liveResult,
        pendingResult,
        closedTodayResult,
        allTradesResult,
      ] = await Promise.all([
        supabase
          .from("paper_order_previews")
          .select("id")
          .eq("approved_for_sandbox_order", true)
          .limit(1),
        supabase
          .from("paper_order_previews")
          .select("id")
          .eq("submitted_to_broker", true)
          .limit(1),
        supabase
          .from("paper_order_previews")
          .select("id")
          .eq("approved_for_live_order", true)
          .limit(1),
        supabase
          .from("paper_order_previews")
          .select("id, symbol, contract_symbol, contract_quality, max_risk_dollars, option_type")
          .eq("sandbox_preview_validation_status", "PASSED")
          .eq("sandbox_preview_human_review_decision", "WATCH")
          .eq("approved_for_sandbox_order", false)
          .eq("approved_for_live_order", false)
          .eq("submitted_to_broker", false)
          .order("sandbox_preview_human_reviewed_at", { ascending: false, nullsFirst: false })
          .limit(5),
        supabase
          .from("paper_trades")
          .select("id")
          .eq("status", "closed")
          .gte("closed_at", startOfDay.toISOString()),
        supabase.from("paper_trades").select("created_at"),
      ]);

      setSandboxOrderUnlocked(
        (sandboxResult.data ?? []).length > 0 || (submittedResult.data ?? []).length > 0
      );
      setLiveOrderEnabled((liveResult.data ?? []).length > 0);
      setPendingApprovals((pendingResult.data ?? []) as PendingApproval[]);

      const closedIds = (closedTodayResult.data ?? []).map((r: { id: string }) => r.id);
      if (closedIds.length > 0) {
        const { data: pnlData } = await supabase
          .from("option_trade_details")
          .select("option_pnl")
          .in("paper_trade_id", closedIds);
        const dailyPnl = (pnlData ?? []).reduce(
          (sum: number, r: { option_pnl: number }) => sum + (r.option_pnl ?? 0),
          0
        );
        setDailyDrawdown(Math.max(0, -dailyPnl));
      } else {
        setDailyDrawdown(0);
      }

      const allDates = (allTradesResult.data ?? []).map(
        (r: { created_at: string }) => r.created_at.substring(0, 10)
      );
      setTradingDayCount(new Set(allDates).size);
    } catch (err) {
      console.error("CommandCenterPanel loadData error:", err);
    } finally {
      setLoading(false);
      setLastUpdated(new Date());
    }
  }, []);

  useEffect(() => {
    const t = window.setTimeout(() => void loadData(), 0);
    const interval = window.setInterval(() => void loadData(), 60_000);
    return () => {
      window.clearTimeout(t);
      window.clearInterval(interval);
    };
  }, [loadData]);

  // Edge: pendingApprovals count increasing → cron or manual scan queued a trade.
  // null baseline prevents a spurious fire on first poll.
  useEffect(() => {
    const count = pendingApprovals.length;
    if (prevApprovalCountRef.current !== null && count > prevApprovalCountRef.current) {
      setSweepRevision((n) => n + 1);
    }
    prevApprovalCountRef.current = count;
  }, [pendingApprovals.length]);

  // Edge: isScanning true → false → manual scan just finished in-browser.
  useEffect(() => {
    if (prevScanningRef.current && !isScanning) {
      setSweepRevision((n) => n + 1);
    }
    prevScanningRef.current = isScanning;
  }, [isScanning]);

  const reduced = useReducedMotion() ?? false;

  const masterState: MasterState =
    sandboxOrderUnlocked === true || liveOrderEnabled === true
      ? "ATTENTION"
      : pendingApprovals.length > 0
        ? "ACTION_NEEDED"
        : "NOMINAL";

  return (
    <div className="relative isolate h-full">
      <div className="h-full overflow-y-auto">
        {/* py-4 both sides — symmetric, on 4px grid */}
        <div className="flex flex-col gap-4 py-4">

          {/* Zone 1 — System Status */}
          <motion.div
            initial={reduced ? false : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: "easeOut", delay: 0 }}
          >
            <Zone1SystemStatus
              masterState={masterState}
              sandboxOrderUnlocked={sandboxOrderUnlocked}
              liveOrderEnabled={liveOrderEnabled}
              marketCondition={marketCondition}
              vixLevel={vixLevel}
              vixRegime={vixRegime}
              optionRiskCheckStatus={optionRiskCheckStatus}
              lastUpdated={lastUpdated}
              loading={loading}
              onRefresh={() => void loadData()}
              sweepRevision={sweepRevision}
            />
          </motion.div>

          {/* Zones 2 + 3 — equal-height columns on large screens */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:items-stretch">
            <motion.div
              initial={reduced ? false : { opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, ease: "easeOut", delay: 0.08 }}
            >
              <Zone2Action
                pendingApprovals={pendingApprovals}
                loading={loading}
                onSwitchToAlerts={onSwitchToAlerts}
              />
            </motion.div>
            <motion.div
              initial={reduced ? false : { opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, ease: "easeOut", delay: 0.16 }}
            >
              <Zone3WhyIdle
                scannerResults={scannerResults}
                isScanning={isScanning}
                hasPendingAction={pendingApprovals.length > 0}
              />
            </motion.div>
          </div>

          {/* Zone 4 — Discipline strip */}
          <motion.div
            initial={reduced ? false : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: "easeOut", delay: 0.24 }}
          >
            <Zone4Discipline
              dailyTradeCount={dailyTradeCount}
              dailyLossCount={dailyLossCount}
              dailyDrawdown={dailyDrawdown}
              tradingDayCount={tradingDayCount}
            />
          </motion.div>

          {/* Zone 5 — Market news */}
          <motion.div
            initial={reduced ? false : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: "easeOut", delay: 0.32 }}
          >
            <Zone5News />
          </motion.div>

        </div>
      </div>
    </div>
  );
}
