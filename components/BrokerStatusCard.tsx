"use client";

// ─── UI ONLY — all fetch logic, route checks, safety logic untouched ─────────

import { useEffect, useState } from "react";

type RouteStatus = {
  success: boolean;
  connected?: boolean;
  route?: string;
  mode?: string;
  status?: string;
  message?: string;
  ordersEnabled?: boolean;
  liveTradingEnabled?: boolean;
  balancesAvailable?: boolean;
  positionsAvailable?: boolean;
  expirationsAvailable?: boolean;
  chainAvailable?: boolean;
  symbol?: string;
  expiration?: string | null;
};

type BrokerRouteKey =
  | "profile"
  | "balances"
  | "positions"
  | "expirations"
  | "chain";

type BrokerStatuses = Record<BrokerRouteKey, RouteStatus | null>;

const DEFAULT_STATUSES: BrokerStatuses = {
  profile: null,
  balances: null,
  positions: null,
  expirations: null,
  chain: null,
};

// ─── Tone helpers for StatusPill ─────────────────────────────────────────────
function getToneClasses(tone: "green" | "yellow" | "red" | "blue") {
  if (tone === "green")
    return {
      border: "border-slate-700/60",
      ring: "ring-emerald-500/10",
      bar: "bg-emerald-500",
      dot: "bg-emerald-400",
      label: "text-slate-500",
      value: "text-emerald-300",
      sub: "text-slate-600",
      pulse: true,
    };
  if (tone === "yellow")
    return {
      border: "border-slate-700/60",
      ring: "ring-yellow-500/10",
      bar: "bg-yellow-400",
      dot: "bg-yellow-400",
      label: "text-slate-500",
      value: "text-yellow-300",
      sub: "text-slate-600",
      pulse: true,
    };
  if (tone === "red")
    return {
      border: "border-slate-700/60",
      ring: "ring-red-500/15",
      bar: "bg-red-500",
      dot: "bg-red-400",
      label: "text-slate-500",
      value: "text-red-400",
      sub: "text-slate-600",
      pulse: false,
    };
  // blue
  return {
    border: "border-slate-700/60",
    ring: "ring-blue-500/10",
    bar: "bg-blue-500",
    dot: "bg-blue-400",
    label: "text-slate-500",
    value: "text-blue-300",
    sub: "text-slate-600",
    pulse: false,
  };
}

// ─── formatStatus — untouched logic ──────────────────────────────────────────
function formatStatus(status: string) {
  return status.replaceAll("_", " ");
}

// ─── StatusPill — redesigned visually, props unchanged ───────────────────────
function StatusPill({
  label,
  value,
  tone,
  subtext,
}: {
  label: string;
  value: string;
  tone: "green" | "yellow" | "red" | "blue";
  subtext?: string;
}) {
  const t = getToneClasses(tone);

  return (
    <div
      className={`relative overflow-hidden rounded-xl border ${t.border} bg-slate-900/70 p-4 ring-1 ${t.ring}`}
    >
      {/* Left accent bar */}
      <div className={`absolute inset-y-0 left-0 w-[3px] ${t.bar}`} />

      <div className="pl-1">
        {/* Label row */}
        <div className="mb-2 flex items-center gap-1.5">
          {t.pulse ? (
            <span className="relative flex h-1.5 w-1.5 shrink-0">
              <span
                className={`absolute inline-flex h-full w-full animate-ping rounded-full ${t.dot} opacity-60`}
              />
              <span
                className={`relative inline-flex h-1.5 w-1.5 rounded-full ${t.dot}`}
              />
            </span>
          ) : (
            <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${t.dot}`} />
          )}
          <p
            className={`font-mono text-[9px] font-bold uppercase tracking-[0.22em] ${t.label}`}
          >
            {label}
          </p>
        </div>

        {/* Value */}
        <p className={`font-mono text-sm font-black tracking-tight ${t.value}`}>
          {value}
        </p>

        {/* Subtext */}
        {subtext && (
          <p className={`mt-1 text-[10px] leading-4 ${t.sub}`}>{subtext}</p>
        )}
      </div>
    </div>
  );
}

// ─── RouteStatusPill — logic untouched, visual upgraded ──────────────────────
function RouteStatusPill({
  label,
  status,
  availableLabel,
}: {
  label: string;
  status: RouteStatus | null;
  availableLabel: string;
}) {
  if (!status) {
    return (
      <StatusPill
        label={label}
        value="Checking"
        tone="yellow"
        subtext="Loading route"
      />
    );
  }

  const routeStatus = status.status || "UNKNOWN";
  const connected = status.connected === true;

  const isAvailable =
    status.balancesAvailable === true ||
    status.positionsAvailable === true ||
    status.expirationsAvailable === true ||
    status.chainAvailable === true ||
    connected;

  // ─── tone logic untouched ────────────────────────────────────────────────
  let tone: "green" | "yellow" | "red" | "blue" = "yellow";
  if (routeStatus === "CONNECTED" || isAvailable) tone = "green";
  else if (routeStatus === "ERROR" || status.success === false) tone = "red";
  else if (
    routeStatus === "WAITING_VERIFICATION" ||
    routeStatus === "WAITING_ACCOUNT_ID"
  )
    tone = "yellow";

  return (
    <StatusPill
      label={label}
      value={isAvailable ? availableLabel : formatStatus(routeStatus)}
      tone={tone}
      subtext={status.route || "Tradier route"}
    />
  );
}

// ─── Main component — fetch logic and safety logic 100% untouched ─────────────
export default function BrokerStatusCard() {
  const [statuses, setStatuses] = useState<BrokerStatuses>(DEFAULT_STATUSES);
  const [loading, setLoading] = useState(false);

  async function fetchJson(url: string): Promise<RouteStatus> {
    const response = await fetch(url, { cache: "no-store" });
    const data = await response.json();
    return data;
  }

  async function loadBrokerStatuses() {
    try {
      setLoading(true);
      const [profile, balances, positions, expirations, chain] =
        await Promise.all([
          fetchJson("/api/tradier/profile"),
          fetchJson("/api/tradier/balances"),
          fetchJson("/api/tradier/positions"),
          fetchJson("/api/tradier/options/expirations?symbol=NVDA"),
          fetchJson(
            "/api/tradier/options/chain?symbol=NVDA&expiration=2026-06-19"
          ),
        ]);
      setStatuses({ profile, balances, positions, expirations, chain });
    } catch (error) {
      console.error("Failed to load broker statuses:", error);
      const errStatus = (msg: string): RouteStatus => ({
        success: false,
        connected: false,
        status: "ERROR",
        message: msg,
        ordersEnabled: false,
        liveTradingEnabled: false,
      });
      setStatuses({
        profile: errStatus("Could not load Tradier profile status."),
        balances: errStatus("Could not load Tradier balances status."),
        positions: errStatus("Could not load Tradier positions status."),
        expirations: errStatus("Could not load Tradier expirations status."),
        chain: errStatus("Could not load Tradier option chain status."),
      });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadBrokerStatuses();
  }, []);

  // ─── Derived safety values — untouched ────────────────────────────────────
  const profileStatus = statuses.profile;
  const mode = profileStatus?.mode || "sandbox";
  const anyOrdersEnabled = Object.values(statuses).some(
    (s) => s?.ordersEnabled === true
  );
  const anyLiveTradingEnabled = Object.values(statuses).some(
    (s) => s?.liveTradingEnabled === true
  );
  const allRoutesLoaded = Object.values(statuses).every(Boolean);

  // ─── Route rows for the grid ──────────────────────────────────────────────
  const routeRows = [
    { key: "profile" as BrokerRouteKey, label: "Profile Route", available: "Connected" },
    { key: "balances" as BrokerRouteKey, label: "Balances Route", available: "Balances Available" },
    { key: "positions" as BrokerRouteKey, label: "Positions Route", available: "Positions Available" },
    { key: "expirations" as BrokerRouteKey, label: "Expirations Route", available: "Expirations Available" },
    { key: "chain" as BrokerRouteKey, label: "Option Chain Route", available: "Chain Available" },
  ];

  return (
    <div className="relative overflow-hidden rounded-2xl border border-slate-700/50 bg-slate-950 shadow-2xl shadow-black/60">

      {/* ── Background layers — matches suite ───────────────────────────── */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 55% 50% at 5% 50%, rgba(6,182,212,0.04) 0%, transparent 55%), radial-gradient(ellipse 45% 55% at 95% 50%, rgba(37,99,235,0.04) 0%, transparent 55%)",
        }}
      />
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.025]"
        style={{
          backgroundImage:
            "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,0.8) 2px, rgba(255,255,255,0.8) 3px)",
        }}
      />
      {/* Top neon accent line */}
      <div
        className="absolute inset-x-0 top-0 h-[2px]"
        style={{
          background:
            "linear-gradient(90deg, transparent 0%, #06b6d4 30%, #3b82f6 70%, transparent 100%)",
        }}
      />

      <div className="relative px-6 py-6">

        {/* ── HEADER ROW ────────────────────────────────────────────────── */}
        <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="mb-1 font-mono text-[10px] font-bold uppercase tracking-[0.3em] text-cyan-600">
              OPTIMA-SYS · Broker Connection
            </p>
            <h2 className="text-2xl font-black tracking-tight text-white">
              Broker{" "}
              <span
                style={{
                  background:
                    "linear-gradient(135deg, #06b6d4 0%, #60a5fa 100%)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                }}
              >
                Status
              </span>
            </h2>
            <p className="mt-1.5 max-w-lg font-mono text-[10px] leading-5 text-slate-500">
              Read-only Tradier preparation panel. Checks connection routes without allowing broker orders.
            </p>
          </div>

          {/* Refresh button */}
          <button
            type="button"
            onClick={loadBrokerStatuses}
            disabled={loading}
            className="group relative self-start overflow-hidden rounded-lg border border-slate-700/80 bg-slate-900/80 px-4 py-2 font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-slate-300 transition-all hover:border-cyan-500/40 hover:bg-slate-800/80 hover:text-cyan-300 disabled:cursor-not-allowed disabled:opacity-40 lg:self-auto"
          >
            <span
              className="pointer-events-none absolute inset-x-0 top-0 h-px opacity-0 transition-opacity group-hover:opacity-100"
              style={{
                background:
                  "linear-gradient(90deg, transparent, #06b6d4, transparent)",
              }}
            />
            {loading ? (
              <span className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 animate-ping rounded-full bg-cyan-400" />
                Checking...
              </span>
            ) : (
              "⟳ Refresh Broker"
            )}
          </button>
        </div>

        {/* ── SECTION: Core system status ──────────────────────────────── */}
        <p className="mb-2 font-mono text-[9px] font-bold uppercase tracking-[0.28em] text-slate-600">
          System Status
        </p>
        <div className="mb-5 grid grid-cols-2 gap-3 md:grid-cols-4">
          <StatusPill
            label="Trading Mode"
            value="Safe Paper Mode"
            tone="green"
            subtext="Dashboard-only paper trading"
          />
          <StatusPill
            label="Tradier Mode"
            value={mode.toUpperCase()}
            tone="blue"
            subtext="Sandbox first"
          />
          <StatusPill
            label="Stock Quotes"
            value="Finnhub Live"
            tone="green"
            subtext="Real stock quote feed"
          />
          <StatusPill
            label="Option Chain"
            value="Mock Data"
            tone="yellow"
            subtext="Real chain route prepared"
          />
        </div>

        {/* ── SECTION: Route health grid ───────────────────────────────── */}
        <p className="mb-2 font-mono text-[9px] font-bold uppercase tracking-[0.28em] text-slate-600">
          Tradier Route Health
        </p>
        <div className="mb-5 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
          {routeRows.map((r) => (
            <RouteStatusPill
              key={r.key}
              label={r.label}
              status={statuses[r.key]}
              availableLabel={r.available}
            />
          ))}
        </div>

        {/* ── SECTION: Safety locks ────────────────────────────────────── */}
        <p className="mb-2 font-mono text-[9px] font-bold uppercase tracking-[0.28em] text-slate-600">
          Safety Locks
        </p>
        <div className="mb-5 grid grid-cols-2 gap-3 md:grid-cols-3">
          <StatusPill
            label="Order Execution"
            value={anyOrdersEnabled ? "ENABLED" : "DISABLED"}
            tone={anyOrdersEnabled ? "red" : "green"}
            subtext="Must stay disabled"
          />
          <StatusPill
            label="Live Trading"
            value={anyLiveTradingEnabled ? "ENABLED" : "DISABLED"}
            tone={anyLiveTradingEnabled ? "red" : "green"}
            subtext="Locked off"
          />
          <StatusPill
            label="Route Health"
            value={allRoutesLoaded ? "Online" : "Checking"}
            tone={allRoutesLoaded ? "green" : "yellow"}
            subtext="Read-only status routes"
          />
        </div>

        {/* ── Safety lock banner ──────────────────────────────────────── */}
        <div
          className="relative overflow-hidden rounded-lg border border-emerald-500/15 bg-emerald-500/5"
          style={{ borderTop: "1px solid rgba(6,182,212,0.10)" }}
        >
          <div
            className="absolute inset-x-0 top-0 h-px opacity-40"
            style={{
              background:
                "linear-gradient(90deg, transparent, #06b6d4, transparent)",
            }}
          />
          <div className="absolute inset-y-0 left-0 w-[3px] bg-emerald-500" />
          <div className="flex flex-col gap-0.5 px-5 py-3 sm:flex-row sm:items-center sm:gap-3">
            <span className="font-mono text-[9px] font-bold uppercase tracking-[0.28em] text-emerald-600">
              Safety Lock
            </span>
            <span className="hidden text-slate-700 sm:block">›</span>
            <p className="font-mono text-[10px] leading-5 text-slate-400">
              Broker order execution and live trading are disabled. Routes can be prepared and read,
              but{" "}
              <span className="text-emerald-400">
                no real broker orders can be placed.
              </span>
            </p>
          </div>
        </div>

        {/* ── Profile message — conditional, untouched logic ──────────── */}
        {profileStatus?.message && (
          <div
            className="relative mt-3 overflow-hidden rounded-lg border border-slate-800 bg-black/30"
          >
            <div className="absolute inset-y-0 left-0 w-[3px] bg-blue-500" />
            <div className="px-5 py-3">
              <span className="font-mono text-[9px] font-bold uppercase tracking-[0.22em] text-blue-600">
                Profile Message
              </span>
              <p className="mt-1 font-mono text-[10px] leading-5 text-slate-400">
                {profileStatus.message}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Bottom neon edge */}
      <div
        className="absolute inset-x-0 bottom-0 h-px opacity-20"
        style={{
          background:
            "linear-gradient(90deg, transparent, #3b82f6, #06b6d4, transparent)",
        }}
      />
    </div>
  );
}