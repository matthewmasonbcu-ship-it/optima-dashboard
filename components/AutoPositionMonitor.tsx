"use client";

import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";

type PaperTrade = {
  id: string;
  symbol: string;
  direction: string | null;
  entry_price: number | null;
  stop_loss: number | null;
  take_profit: number | null;
  exit_price: number | null;
  status: string | null;
  strategy: string | null;
  created_at: string;
};

type MonitorEvent = {
  id: string;
  message: string;
  type: "info" | "success" | "warning" | "error";
  time: string;
};

export default function AutoPositionMonitor() {
  const [openTrades, setOpenTrades] = useState<PaperTrade[]>([]);
  const [monitorEvents, setMonitorEvents] = useState<MonitorEvent[]>([]);
  const [loading, setLoading] = useState(false);

  function addEvent(
    message: string,
    type: "info" | "success" | "warning" | "error" = "info"
  ) {
    const newEvent: MonitorEvent = {
      id: crypto.randomUUID(),
      message,
      type,
      time: new Date().toLocaleTimeString(),
    };

    setMonitorEvents((prev) => [newEvent, ...prev].slice(0, 8));
  }

  async function loadOpenTrades() {
    setLoading(true);

    try {
      const { data, error } = await supabase
        .from("paper_trades")
        .select("*")
        .is("exit_price", null)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Auto Position Monitor load error:", error);
        addEvent(`Load failed: ${error.message}`, "error");
        setOpenTrades([]);
        return;
      }

      const trades = (data || []) as PaperTrade[];
      setOpenTrades(trades);

      if (trades.length === 0) {
        addEvent("No open paper trades found.", "info");
      } else {
        addEvent(`Found ${trades.length} open paper trade(s).`, "success");
      }
    } catch (err) {
      console.error("Unexpected monitor load error:", err);
      addEvent("Unexpected error while loading open trades.", "error");
      setOpenTrades([]);
    } finally {
      setLoading(false);
    }
  }

  async function closeTradeAtPrice(trade: PaperTrade, exitPrice: number) {
    if (!trade.id) {
      addEvent("Could not close trade because trade ID is missing.", "error");
      return;
    }

    if (!exitPrice || Number.isNaN(exitPrice)) {
      addEvent("Could not close trade because exit price is invalid.", "error");
      return;
    }

    try {
      const { error } = await supabase
        .from("paper_trades")
        .update({
          exit_price: exitPrice,
          status: "closed",
        })
        .eq("id", trade.id);

      if (error) {
        console.error("Auto close trade error:", error);
        addEvent(`Failed to close ${trade.symbol}: ${error.message}`, "error");
        return;
      }

      addEvent(
        `${trade.symbol} ${trade.direction || ""} closed at $${exitPrice.toFixed(
          2
        )}.`,
        "success"
      );

      window.dispatchEvent(new Event("paper-trades-updated"));

      await loadOpenTrades();
    } catch (err) {
      console.error("Unexpected close error:", err);
      addEvent(`Unexpected error closing ${trade.symbol}.`, "error");
    }
  }

  async function runMonitorNow() {
    setLoading(true);

    try {
      const { data, error } = await supabase
        .from("paper_trades")
        .select("*")
        .is("exit_price", null)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Run monitor error:", error);
        addEvent(`Monitor failed: ${error.message}`, "error");
        setOpenTrades([]);
        return;
      }

      const trades = (data || []) as PaperTrade[];
      setOpenTrades(trades);

      if (trades.length === 0) {
        addEvent("Monitor checked: no open paper trades right now.", "info");
        return;
      }

      addEvent(`Monitor checked ${trades.length} open trade(s).`, "success");

      window.dispatchEvent(new Event("paper-trades-updated"));
    } catch (err) {
      console.error("Unexpected monitor error:", err);
      addEvent("Unexpected error while running monitor.", "error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadOpenTrades();

    const handlePaperTradesUpdated = () => {
      loadOpenTrades();
    };

    window.addEventListener("paper-trades-updated", handlePaperTradesUpdated);

    return () => {
      window.removeEventListener(
        "paper-trades-updated",
        handlePaperTradesUpdated
      );
    };
  }, []);

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
          alignItems: "center",
          marginBottom: "14px",
        }}
      >
        <div>
          <h2 style={{ margin: 0 }}>Auto Position Monitor</h2>
          <p style={{ margin: "6px 0 0", color: "#aaa", fontSize: "14px" }}>
            Watches open paper trades where exit_price is empty.
          </p>
        </div>

        <button
          onClick={runMonitorNow}
          disabled={loading}
          style={{
            padding: "10px 14px",
            borderRadius: "8px",
            border: "none",
            cursor: loading ? "not-allowed" : "pointer",
            background: loading ? "#555" : "#2563eb",
            color: "white",
            fontWeight: 700,
          }}
        >
          {loading ? "Checking..." : "Run Monitor Now"}
        </button>
      </div>

      <div style={{ marginTop: "16px" }}>
        <h3 style={{ marginBottom: "10px" }}>Open Positions Being Watched</h3>

        {openTrades.length === 0 ? (
          <p style={{ color: "#aaa" }}>No open paper trades right now.</p>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                fontSize: "14px",
              }}
            >
              <thead>
                <tr style={{ borderBottom: "1px solid #333" }}>
                  <th style={thStyle}>Symbol</th>
                  <th style={thStyle}>Direction</th>
                  <th style={thStyle}>Entry</th>
                  <th style={thStyle}>Stop Loss</th>
                  <th style={thStyle}>Take Profit</th>
                  <th style={thStyle}>Status</th>
                  <th style={thStyle}>Strategy</th>
                  <th style={thStyle}>Opened</th>
                  <th style={thStyle}>Test Close</th>
                </tr>
              </thead>

              <tbody>
                {openTrades.map((trade) => (
                  <tr key={trade.id} style={{ borderBottom: "1px solid #222" }}>
                    <td style={tdStyle}>{trade.symbol}</td>
                    <td style={tdStyle}>{trade.direction || "-"}</td>
                    <td style={tdStyle}>{formatDollar(trade.entry_price)}</td>
                    <td style={tdStyle}>{formatDollar(trade.stop_loss)}</td>
                    <td style={tdStyle}>{formatDollar(trade.take_profit)}</td>
                    <td style={tdStyle}>{trade.status || "open"}</td>
                    <td style={tdStyle}>{trade.strategy || "-"}</td>
                    <td style={tdStyle}>
                      {trade.created_at
                        ? new Date(trade.created_at).toLocaleString()
                        : "-"}
                    </td>
                    <td style={tdStyle}>
                      <div style={{ display: "flex", gap: "6px" }}>
                        <button
                          onClick={() =>
                            closeTradeAtPrice(
                              trade,
                              Number(trade.take_profit || trade.entry_price || 0)
                            )
                          }
                          style={winButtonStyle}
                        >
                          TP
                        </button>

                        <button
                          onClick={() =>
                            closeTradeAtPrice(
                              trade,
                              Number(trade.stop_loss || trade.entry_price || 0)
                            )
                          }
                          style={lossButtonStyle}
                        >
                          SL
                        </button>

                        <button
                          onClick={() =>
                            closeTradeAtPrice(
                              trade,
                              Number(trade.entry_price || 0)
                            )
                          }
                          style={beButtonStyle}
                        >
                          BE
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div style={{ marginTop: "22px" }}>
        <h3 style={{ marginBottom: "10px" }}>Latest Monitor Events</h3>

        {monitorEvents.length === 0 ? (
          <p style={{ color: "#aaa" }}>
            No monitor events yet. Click Run Monitor Now.
          </p>
        ) : (
          <div style={{ display: "grid", gap: "8px" }}>
            {monitorEvents.map((event) => (
              <div
                key={event.id}
                style={{
                  padding: "10px",
                  borderRadius: "8px",
                  background: getEventBackground(event.type),
                  border: "1px solid #333",
                }}
              >
                <div style={{ fontSize: "14px", fontWeight: 700 }}>
                  {event.message}
                </div>
                <div
                  style={{ fontSize: "12px", color: "#aaa", marginTop: "4px" }}
                >
                  {event.time}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div
        style={{
          marginTop: "18px",
          padding: "12px",
          borderRadius: "8px",
          background: "#181818",
          color: "#bbb",
          fontSize: "13px",
          lineHeight: "1.5",
        }}
      >
        <strong style={{ color: "white" }}>Safety note:</strong> This monitor
        finds open trades using <code>exit_price IS NULL</code>. It does not
        auto-close using stock prices yet because your trades are option-price
        trades. Real automatic closing should use Tradier option contract prices
        once API access is approved.
      </div>
    </div>
  );
}

function formatDollar(value: number | null) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return "-";
  }

  return `$${Number(value).toFixed(2)}`;
}

const thStyle: React.CSSProperties = {
  textAlign: "left",
  padding: "10px",
  color: "#aaa",
  fontWeight: 700,
};

const tdStyle: React.CSSProperties = {
  padding: "10px",
  color: "white",
};

const winButtonStyle: React.CSSProperties = {
  padding: "6px 8px",
  borderRadius: "6px",
  border: "none",
  background: "#16a34a",
  color: "white",
  cursor: "pointer",
  fontWeight: 700,
};

const lossButtonStyle: React.CSSProperties = {
  padding: "6px 8px",
  borderRadius: "6px",
  border: "none",
  background: "#dc2626",
  color: "white",
  cursor: "pointer",
  fontWeight: 700,
};

const beButtonStyle: React.CSSProperties = {
  padding: "6px 8px",
  borderRadius: "6px",
  border: "none",
  background: "#6b7280",
  color: "white",
  cursor: "pointer",
  fontWeight: 700,
};

function getEventBackground(type: MonitorEvent["type"]) {
  if (type === "success") return "#052e16";
  if (type === "warning") return "#422006";
  if (type === "error") return "#450a0a";
  return "#1f2937";
}