"use client";

// ─── UI ONLY — no trading logic, no props changed ───────────────────────────

type ControlStatus = "SAFE" | "LOCKED" | "WAITING" | "CAUTION";

type ControlItem = {
  label: string;
  value: string;
  status: ControlStatus;
  detail: string;
};

// ─── Status styling helpers — untouched logic ───────────────────────────────
function getStatusClass(status: ControlStatus) {
  if (status === "SAFE") return "border-emerald-500/40 bg-emerald-500/10 text-emerald-300";
  if (status === "LOCKED") return "border-blue-500/40 bg-blue-500/10 text-blue-300";
  if (status === "WAITING") return "border-yellow-500/40 bg-yellow-500/10 text-yellow-300";
  return "border-orange-500/40 bg-orange-500/10 text-orange-300";
}

function getDotClass(status: ControlStatus) {
  if (status === "SAFE") return "bg-emerald-400";
  if (status === "LOCKED") return "bg-blue-400";
  if (status === "WAITING") return "bg-yellow-400";
  return "bg-orange-400";
}

function getPulse(status: ControlStatus) {
  if (status === "SAFE") return true;
  if (status === "WAITING") return true;
  return false;
}

function getAccentBar(status: ControlStatus) {
  if (status === "SAFE") return "bg-emerald-500";
  if (status === "LOCKED") return "bg-blue-500";
  if (status === "WAITING") return "bg-yellow-400";
  return "bg-orange-400";
}

function getValueColor(status: ControlStatus) {
  if (status === "SAFE") return "text-emerald-300";
  if (status === "LOCKED") return "text-red-400";
  if (status === "WAITING") return "text-yellow-300";
  return "text-orange-300";
}

function getRingColor(status: ControlStatus) {
  if (status === "SAFE") return "ring-emerald-500/10";
  if (status === "LOCKED") return "ring-red-500/10";
  if (status === "WAITING") return "ring-yellow-500/10";
  return "ring-orange-500/10";
}

export default function PaperTradingControlCenter() {
  // ─── Control data — unchanged ─────────────────────────────────────────────
  const controls: ControlItem[] = [
    {
      label: "Trading Mode",
      value: "PAPER ONLY",
      status: "SAFE",
      detail: "Dashboard is being used for paper testing and system validation.",
    },
    {
      label: "Live Trading",
      value: "DISABLED",
      status: "LOCKED",
      detail: "Real money trading stays off until the system proves itself.",
    },
    {
      label: "Order Execution",
      value: "DISABLED",
      status: "LOCKED",
      detail: "No real broker orders can be placed from the dashboard right now.",
    },
    {
      label: "Option Data",
      value: "MOCK CHAIN",
      status: "CAUTION",
      detail: "Mock contracts are active until Tradier option-chain access is ready.",
    },
    {
      label: "Tradier",
      value: "WAITING",
      status: "WAITING",
      detail: "Verification/token still pending. Safe prep routes are online.",
    },
    {
      label: "Testing Override",
      value: "MANUAL ONLY",
      status: "CAUTION",
      detail: "Override should only be used to test blocked trades and audit trails.",
    },
  ];

  return (
    <section className="relative overflow-hidden rounded-2xl border border-slate-700/50 bg-slate-950 shadow-2xl shadow-black/60">

      {/* ── Background layers — matches header language ──────────────── */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 70% 50% at 0% 50%, rgba(139,92,246,0.05) 0%, transparent 55%), radial-gradient(ellipse 50% 70% at 100% 50%, rgba(37,99,235,0.05) 0%, transparent 55%)",
        }}
      />
      {/* Scanline texture */}
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
            "linear-gradient(90deg, transparent 0%, #8b5cf6 30%, #3b82f6 70%, transparent 100%)",
        }}
      />

      <div className="relative px-6 py-6">

        {/* ── HEADER ROW ──────────────────────────────────────────────── */}
        <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">

          {/* Left — section identity */}
          <div>
            <p className="mb-1 font-mono text-[10px] font-bold uppercase tracking-[0.3em] text-violet-600">
              OPTIMA-SYS · Control Panel
            </p>
            <h2 className="text-2xl font-black tracking-tight text-white">
              Paper Trading{" "}
              <span
                style={{
                  background: "linear-gradient(135deg, #8b5cf6 0%, #60a5fa 100%)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                }}
              >
                Control Center
              </span>
            </h2>
            <p className="mt-1.5 max-w-lg font-mono text-[10px] leading-5 text-slate-500">
              Operating mode is locked before every scanner, contract, or paper-trade action.
            </p>
          </div>

          {/* Right — master status badge */}
          <div className="relative overflow-hidden rounded-xl border border-emerald-500/25 bg-emerald-500/5 px-5 py-4 ring-1 ring-emerald-500/10">
            {/* Left accent bar */}
            <div className="absolute inset-y-0 left-0 w-[3px] bg-emerald-500" />
            <div className="pl-1">
              <div className="mb-1 flex items-center gap-2">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
                </span>
                <p className="font-mono text-[9px] font-bold uppercase tracking-[0.28em] text-emerald-500">
                  System Status
                </p>
              </div>
              <p className="font-mono text-lg font-black tracking-tight text-emerald-300">
                SAFE TO PAPER TEST
              </p>
            </div>
          </div>
        </div>

        {/* ── CONTROL GRID ────────────────────────────────────────────── */}
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {controls.map((item) => (
            <div
              key={item.label}
              className={`relative overflow-hidden rounded-xl border border-slate-700/60 bg-slate-900/70 p-4 ring-1 ${getRingColor(item.status)}`}
            >
              {/* Left accent bar */}
              <div className={`absolute inset-y-0 left-0 w-[3px] ${getAccentBar(item.status)}`} />

              <div className="pl-1">
                {/* Label row */}
                <div className="mb-3 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    {getPulse(item.status) ? (
                      <span className="relative flex h-1.5 w-1.5 shrink-0">
                        <span className={`absolute inline-flex h-full w-full animate-ping rounded-full ${getDotClass(item.status)} opacity-70`} />
                        <span className={`relative inline-flex h-1.5 w-1.5 rounded-full ${getDotClass(item.status)}`} />
                      </span>
                    ) : (
                      <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${getDotClass(item.status)}`} />
                    )}
                    <p className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-slate-400">
                      {item.label}
                    </p>
                  </div>

                  <span
                    className={`rounded border px-2 py-0.5 font-mono text-[9px] font-bold uppercase tracking-[0.18em] ${getStatusClass(item.status)}`}
                  >
                    {item.status}
                  </span>
                </div>

                {/* Value — large and prominent */}
                <p className={`font-mono text-xl font-black tracking-tight ${getValueColor(item.status)}`}>
                  {item.value}
                </p>

                {/* Detail text */}
                <p className="mt-2 text-[11px] leading-5 text-slate-500">
                  {item.detail}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* ── RULE RAIL — bottom status bar ───────────────────────────── */}
        <div
          className="relative mt-4 overflow-hidden rounded-lg border border-slate-800 bg-black/40"
          style={{ borderTop: "1px solid rgba(139,92,246,0.10)" }}
        >
          {/* Rail top accent */}
          <div
            className="absolute inset-x-0 top-0 h-px opacity-40"
            style={{
              background: "linear-gradient(90deg, transparent, #8b5cf6, transparent)",
            }}
          />
          <div className="flex flex-col gap-0.5 px-5 py-3 sm:flex-row sm:items-center sm:gap-3">
            <span className="font-mono text-[9px] font-bold uppercase tracking-[0.28em] text-violet-600">
              Trade Rule
            </span>
            <span className="hidden text-slate-700 sm:block">›</span>
            <p className="font-mono text-[10px] leading-5 text-slate-400">
              Clean trades save only when scanner setup, contract quality, Risk Guard, and Pre-Trade Checklist all agree.
              Blocked trades require{" "}
              <span className="text-orange-400">Testing Override</span>{" "}
              and are fully audited.
            </p>
          </div>
        </div>
      </div>

      {/* Bottom neon edge line */}
      <div
        className="absolute inset-x-0 bottom-0 h-px opacity-20"
        style={{
          background: "linear-gradient(90deg, transparent, #3b82f6, #8b5cf6, transparent)",
        }}
      />
    </section>
  );
}