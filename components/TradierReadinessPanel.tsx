export default function TradierReadinessPanel() {
  const readinessItems = [
    {
      label: "Tradier API",
      status: "Pending",
      detail: "Waiting for account/API approval.",
      ready: false,
    },
    {
      label: "Option Chains",
      status: "Not connected",
      detail: "Will connect after Tradier API access is approved.",
      ready: false,
    },
    {
      label: "Real Option Pricing",
      status: "Not connected",
      detail: "Current system still uses stock quote-based paper trades.",
      ready: false,
    },
    {
      label: "Live Orders",
      status: "Disabled",
      detail: "Do not enable live orders until months of paper testing.",
      ready: false,
    },
    {
      label: "Funding",
      status: "Do not fund yet",
      detail: "Wait until the system is proven and broker setup is finalized.",
      ready: false,
    },
    {
      label: "Paper Trading",
      status: "Active",
      detail: "Scanner, paper trade saving, and position monitor are working.",
      ready: true,
    },
  ];

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-yellow-800 bg-yellow-950 p-4 text-yellow-200">
        <p className="text-xs uppercase tracking-wide opacity-70">
          Broker Safety Status
        </p>
        <h3 className="mt-1 text-xl font-bold">Tradier Not Live Yet</h3>
        <p className="mt-2 text-sm">
          Keep building and testing with paper trades. Do not fund Tradier yet.
        </p>
      </div>

      <div className="space-y-3">
        {readinessItems.map((item) => (
          <div
            key={item.label}
            className="rounded-xl border border-slate-800 bg-slate-950 p-4"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-semibold text-white">{item.label}</p>
                <p className="mt-1 text-sm text-slate-400">{item.detail}</p>
              </div>

              <span
                className={`rounded-full border px-3 py-1 text-xs font-semibold ${
                  item.ready
                    ? "border-green-700 bg-green-950 text-green-300"
                    : "border-yellow-700 bg-yellow-950 text-yellow-300"
                }`}
              >
                {item.status}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}