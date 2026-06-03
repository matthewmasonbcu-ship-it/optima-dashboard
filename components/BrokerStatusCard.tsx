"use client";

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

export default function BrokerStatusCard() {
  const [statuses, setStatuses] = useState<BrokerStatuses>(DEFAULT_STATUSES);
  const [loading, setLoading] = useState(false);

  async function fetchJson(url: string): Promise<RouteStatus> {
    const response = await fetch(url, {
      cache: "no-store",
    });

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

      setStatuses({
        profile,
        balances,
        positions,
        expirations,
        chain,
      });
    } catch (error) {
      console.error("Failed to load broker statuses:", error);

      setStatuses({
        profile: {
          success: false,
          connected: false,
          status: "ERROR",
          message: "Could not load Tradier profile status.",
          ordersEnabled: false,
          liveTradingEnabled: false,
        },
        balances: {
          success: false,
          connected: false,
          status: "ERROR",
          message: "Could not load Tradier balances status.",
          ordersEnabled: false,
          liveTradingEnabled: false,
        },
        positions: {
          success: false,
          connected: false,
          status: "ERROR",
          message: "Could not load Tradier positions status.",
          ordersEnabled: false,
          liveTradingEnabled: false,
        },
        expirations: {
          success: false,
          connected: false,
          status: "ERROR",
          message: "Could not load Tradier expirations status.",
          ordersEnabled: false,
          liveTradingEnabled: false,
        },
        chain: {
          success: false,
          connected: false,
          status: "ERROR",
          message: "Could not load Tradier option chain status.",
          ordersEnabled: false,
          liveTradingEnabled: false,
        },
      });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadBrokerStatuses();
  }, []);

  const profileStatus = statuses.profile;
  const mode = profileStatus?.mode || "sandbox";

  const anyOrdersEnabled = Object.values(statuses).some(
    (status) => status?.ordersEnabled === true
  );

  const anyLiveTradingEnabled = Object.values(statuses).some(
    (status) => status?.liveTradingEnabled === true
  );

  const allRoutesLoaded = Object.values(statuses).every(Boolean);

  return (
    <div className="rounded-[1.75rem] border border-slate-800 bg-slate-950/85 p-5 shadow-xl shadow-black/30 backdrop-blur">
      <div className="mb-5 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">
            Broker Connection
          </p>

          <h2 className="mt-1 text-xl font-black text-white">
            Broker Status
          </h2>

          <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-400">
            Read-only Tradier preparation panel. This checks connection routes
            without allowing broker orders.
          </p>
        </div>

        <button
          type="button"
          onClick={loadBrokerStatuses}
          disabled={loading}
          className="rounded-2xl border border-slate-700 bg-slate-900 px-4 py-2 text-sm font-black text-slate-200 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? "Checking..." : "Refresh Broker"}
        </button>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
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
          label="Current Option Chain"
          value="Mock Data"
          tone="yellow"
          subtext="Real chain route prepared"
        />

        <RouteStatusPill
          label="Profile Route"
          status={statuses.profile}
          availableLabel="Connected"
        />

        <RouteStatusPill
          label="Balances Route"
          status={statuses.balances}
          availableLabel="Balances Available"
        />

        <RouteStatusPill
          label="Positions Route"
          status={statuses.positions}
          availableLabel="Positions Available"
        />

        <RouteStatusPill
          label="Expirations Route"
          status={statuses.expirations}
          availableLabel="Expirations Available"
        />

        <RouteStatusPill
          label="Option Chain Route"
          status={statuses.chain}
          availableLabel="Chain Available"
        />

        <StatusPill
          label="Order Execution"
          value={anyOrdersEnabled ? "Enabled" : "Disabled"}
          tone={anyOrdersEnabled ? "red" : "green"}
          subtext="Must stay disabled"
        />

        <StatusPill
          label="Live Trading"
          value={anyLiveTradingEnabled ? "Enabled" : "Disabled"}
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

      <div className="mt-5 rounded-2xl border border-emerald-900/60 bg-emerald-950/30 p-4 text-sm text-emerald-200">
        Safety lock active: broker order execution and live trading are disabled.
        The dashboard can prepare routes and read statuses, but it cannot place
        real broker orders.
      </div>

      {profileStatus?.message && (
        <div className="mt-3 rounded-2xl border border-slate-800 bg-slate-900/80 p-4 text-sm text-slate-300">
          {profileStatus.message}
        </div>
      )}
    </div>
  );
}

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

  let tone: "green" | "yellow" | "red" | "blue" = "yellow";

  if (routeStatus === "CONNECTED" || isAvailable) {
    tone = "green";
  } else if (routeStatus === "ERROR" || status.success === false) {
    tone = "red";
  } else if (
    routeStatus === "WAITING_VERIFICATION" ||
    routeStatus === "WAITING_ACCOUNT_ID"
  ) {
    tone = "yellow";
  }

  return (
    <StatusPill
      label={label}
      value={isAvailable ? availableLabel : formatStatus(routeStatus)}
      tone={tone}
      subtext={status.route || "Tradier route"}
    />
  );
}

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
  const toneClass =
    tone === "green"
      ? "border-emerald-900/70 bg-emerald-950/40 text-emerald-200"
      : tone === "yellow"
      ? "border-yellow-900/70 bg-yellow-950/40 text-yellow-200"
      : tone === "red"
      ? "border-red-900/70 bg-red-950/40 text-red-200"
      : "border-blue-900/70 bg-blue-950/40 text-blue-200";

  return (
    <div className={`rounded-2xl border p-4 ${toneClass}`}>
      <div className="text-[10px] font-black uppercase tracking-[0.18em] opacity-70">
        {label}
      </div>

      <div className="mt-1 text-sm font-black">{value}</div>

      {subtext && <div className="mt-1 text-xs opacity-70">{subtext}</div>}
    </div>
  );
}

function formatStatus(status: string) {
  return status.replaceAll("_", " ");
}