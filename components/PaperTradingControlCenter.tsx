"use client";

type ControlStatus = "SAFE" | "LOCKED" | "WAITING" | "CAUTION";

type ControlItem = {
  label: string;
  value: string;
  status: ControlStatus;
  detail: string;
};

function getStatusClass(status: ControlStatus) {
  if (status === "SAFE") {
    return "border-emerald-500/40 bg-emerald-500/10 text-emerald-300";
  }

  if (status === "LOCKED") {
    return "border-blue-500/40 bg-blue-500/10 text-blue-300";
  }

  if (status === "WAITING") {
    return "border-yellow-500/40 bg-yellow-500/10 text-yellow-300";
  }

  return "border-orange-500/40 bg-orange-500/10 text-orange-300";
}

function getDotClass(status: ControlStatus) {
  if (status === "SAFE") return "bg-emerald-400";
  if (status === "LOCKED") return "bg-blue-400";
  if (status === "WAITING") return "bg-yellow-400";
  return "bg-orange-400";
}

export default function PaperTradingControlCenter() {
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
    <section className="rounded-2xl border border-slate-800 bg-gradient-to-br from-slate-950 via-slate-950 to-slate-900 p-5 shadow-lg">
      <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">
            Paper Trading Control
          </p>
          <h2 className="mt-1 text-2xl font-bold text-slate-100">
            Control Center
          </h2>
          <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-400">
            This panel keeps the operating mode obvious before any scanner,
            contract, or paper-trade action.
          </p>
        </div>

        <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-5 py-3">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-300">
            System Status
          </p>
          <p className="mt-1 text-lg font-black text-emerald-200">
            SAFE TO PAPER TEST
          </p>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {controls.map((item) => (
          <div
            key={item.label}
            className="rounded-xl border border-slate-800 bg-slate-900/70 p-4"
          >
            <div className="mb-3 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span
                  className={`h-2.5 w-2.5 rounded-full ${getDotClass(
                    item.status
                  )}`}
                />
                <p className="text-sm font-semibold text-slate-300">
                  {item.label}
                </p>
              </div>

              <span
                className={`rounded-full border px-2.5 py-1 text-[10px] font-bold ${getStatusClass(
                  item.status
                )}`}
              >
                {item.status}
              </span>
            </div>

            <p className="text-xl font-black text-slate-100">{item.value}</p>
            <p className="mt-2 text-sm leading-6 text-slate-400">
              {item.detail}
            </p>
          </div>
        ))}
      </div>

      <div className="mt-5 rounded-xl border border-slate-800 bg-slate-900/60 p-4">
        <p className="text-sm font-semibold text-slate-200">
          Current Rule Before Every Trade
        </p>
        <p className="mt-1 text-sm leading-6 text-slate-400">
          Clean trades should be saved only when the scanner setup, contract
          quality, Risk Guard, and Pre-Trade Checklist all agree. Blocked trades
          can only be saved with Testing Override for audit/testing purposes.
        </p>
      </div>
    </section>
  );
}