"use client";

import type {
  IntelligentScanResult,
  MarketCondition,
} from "./scannerIntelligence";

type TradeQualityChecklistProps = {
  setup: IntelligentScanResult | null;
  marketCondition: MarketCondition;
};

type ChecklistItem = {
  label: string;
  status: "pass" | "warning" | "fail";
  detail: string;
};

export default function TradeQualityChecklist({
  setup,
  marketCondition,
}: TradeQualityChecklistProps) {
  if (!setup) {
    return (
      <div
        style={{
          border: "1px solid #333",
          borderRadius: "12px",
          padding: "18px",
          marginTop: "20px",
          background: "#111",
          color: "white",
        }}
      >
        <h2 style={{ marginTop: 0 }}>Trade Quality Checklist</h2>
        <p style={{ color: "#aaa" }}>
          Run the scanner to see the checklist for the best setup.
        </p>
      </div>
    );
  }

  const checklist = buildChecklist(setup, marketCondition);

  const passed = checklist.filter((item) => item.status === "pass").length;
  const warnings = checklist.filter((item) => item.status === "warning").length;
  const failed = checklist.filter((item) => item.status === "fail").length;

  return (
    <div
      style={{
        border: "1px solid #333",
        borderRadius: "12px",
        padding: "18px",
        marginTop: "20px",
        background: "#111",
        color: "white",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: "12px",
          flexWrap: "wrap",
          alignItems: "center",
          marginBottom: "14px",
        }}
      >
        <div>
          <h2 style={{ margin: 0 }}>Trade Quality Checklist</h2>
          <p style={{ margin: "6px 0 0", color: "#aaa", fontSize: "14px" }}>
            Best setup:{" "}
            <strong style={{ color: "white" }}>
              {setup.symbol} {setup.direction}
            </strong>
          </p>
        </div>

        <div
          style={{
            display: "flex",
            gap: "8px",
            flexWrap: "wrap",
          }}
        >
          <Badge label={`${passed} Passed`} background="#064e3b" />
          <Badge label={`${warnings} Warnings`} background="#78350f" />
          <Badge label={`${failed} Failed`} background="#7f1d1d" />
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gap: "10px",
        }}
      >
        {checklist.map((item) => (
          <div
            key={item.label}
            style={{
              padding: "12px",
              borderRadius: "10px",
              background: getItemBackground(item.status),
              border: "1px solid #333",
              display: "grid",
              gap: "4px",
            }}
          >
            <div
              style={{
                display: "flex",
                gap: "8px",
                alignItems: "center",
                fontWeight: 800,
              }}
            >
              <span>{getIcon(item.status)}</span>
              <span>{item.label}</span>
            </div>

            <div style={{ color: "#ddd", fontSize: "14px", lineHeight: "1.4" }}>
              {item.detail}
            </div>
          </div>
        ))}
      </div>

      <div
        style={{
          marginTop: "14px",
          padding: "12px",
          borderRadius: "10px",
          background: "#1f2937",
          border: "1px solid #374151",
          color: "white",
          lineHeight: "1.5",
          fontSize: "14px",
        }}
      >
        <strong>Bot summary:</strong> {setup.tradeSummary}
      </div>

      {setup.blockReason && (
        <div
          style={{
            marginTop: "10px",
            padding: "12px",
            borderRadius: "10px",
            background: "#450a0a",
            border: "1px solid #7f1d1d",
            color: "white",
            lineHeight: "1.5",
            fontSize: "14px",
            fontWeight: 700,
          }}
        >
          Auto trade block reason: {setup.blockReason}
        </div>
      )}
    </div>
  );
}

function buildChecklist(
  setup: IntelligentScanResult,
  marketCondition: MarketCondition
): ChecklistItem[] {
  return [
    {
      label: "Market Condition",
      status: marketCondition === "CHOPPY" ? "fail" : "pass",
      detail:
        marketCondition === "CHOPPY"
          ? "Market is choppy, so normal auto trading should be blocked."
          : `Market is ${marketCondition}, so auto trading is allowed if the setup passes the other rules.`,
    },
    {
      label: "Market Alignment",
      status:
        setup.marketAlignment === "ALIGNED"
          ? "pass"
          : setup.marketAlignment === "NEUTRAL"
          ? "warning"
          : "fail",
      detail:
        setup.marketAlignment === "ALIGNED"
          ? "Setup direction matches the broader market condition."
          : setup.marketAlignment === "NEUTRAL"
          ? "Setup is not strongly aligned or against the market."
          : "Setup goes against the broader market condition.",
    },
    {
      label: "Direction Confirmed",
      status: setup.direction === "NONE" ? "fail" : "pass",
      detail:
        setup.direction === "NONE"
          ? "The scanner does not have a clear CALL or PUT direction."
          : `Scanner has a clear ${setup.direction} direction.`,
    },
    {
      label: "Score Requirement",
      status: setup.score >= 70 ? "pass" : setup.score >= 60 ? "warning" : "fail",
      detail:
        setup.score >= 70
          ? `Score is ${setup.score}, which passes the auto-trade threshold.`
          : setup.score >= 60
          ? `Score is ${setup.score}. This is watchlist quality, not automatic trade quality.`
          : `Score is ${setup.score}, which is too low for auto trading.`,
    },
    {
      label: "Confidence Level",
      status:
        setup.confidence === "HIGH"
          ? "pass"
          : setup.confidence === "MEDIUM"
          ? "warning"
          : "fail",
      detail: `Confidence is ${setup.confidence}.`,
    },
    {
      label: "Trend Strength",
      status:
        setup.trendStrength === "STRONG"
          ? "pass"
          : setup.trendStrength === "MODERATE"
          ? "warning"
          : "fail",
      detail: `Trend strength is ${setup.trendStrength}.`,
    },
    {
      label: "Volume Confirmation",
      status:
        setup.volumeConfirmation === "CONFIRMED"
          ? "pass"
          : setup.volumeConfirmation === "NEUTRAL"
          ? "warning"
          : "fail",
      detail:
        setup.volumeConfirmation === "CONFIRMED"
          ? "Volume proxy confirms the move."
          : setup.volumeConfirmation === "NEUTRAL"
          ? "Volume proxy is neutral. Later this should use real candle volume."
          : "Volume proxy is weak. This setup should be blocked.",
    },
    {
      label: "Risk/Reward",
      status:
        setup.riskReward >= 1.5
          ? "pass"
          : setup.riskReward >= 1.2
          ? "warning"
          : "fail",
      detail:
        setup.riskReward >= 1.5
          ? `Risk/reward is ${setup.riskReward}, which passes.`
          : `Risk/reward is ${setup.riskReward}, which is not strong enough for normal auto trading.`,
    },
  ];
}

function Badge({
  label,
  background,
}: {
  label: string;
  background: string;
}) {
  return (
    <span
      style={{
        padding: "6px 10px",
        borderRadius: "999px",
        background,
        color: "white",
        fontSize: "12px",
        fontWeight: 800,
      }}
    >
      {label}
    </span>
  );
}

function getIcon(status: ChecklistItem["status"]) {
  if (status === "pass") return "✅";
  if (status === "warning") return "⚠️";
  return "❌";
}

function getItemBackground(status: ChecklistItem["status"]) {
  if (status === "pass") return "#052e16";
  if (status === "warning") return "#422006";
  return "#450a0a";
}