"use client";

import { useState } from "react";

type WatchlistManagerProps = {
  watchlist?: string[];
  onAddSymbol?: (symbol: string) => void;
  onRemoveSymbol?: (symbol: string) => void;
  protectedSymbols?: string[];
};

export default function WatchlistManager({
  watchlist = [],
  onAddSymbol,
  onRemoveSymbol,
  protectedSymbols = ["SPY"],
}: WatchlistManagerProps) {
  const [newSymbol, setNewSymbol] = useState("");
  const safeWatchlist = Array.isArray(watchlist) ? watchlist : [];
  const safeProtectedSymbols = Array.isArray(protectedSymbols)
    ? protectedSymbols
    : ["SPY"];

  function addSymbol() {
    if (!onAddSymbol) return;

    const cleaned = newSymbol.toUpperCase().trim();

    if (!cleaned) return;

    if (safeWatchlist.includes(cleaned)) {
      setNewSymbol("");
      return;
    }

    onAddSymbol(cleaned);
    setNewSymbol("");
  }

  function removeSymbol(symbol: string) {
    if (!onRemoveSymbol) return;

    if (safeProtectedSymbols.includes(symbol)) {
      alert(`${symbol} is protected because it powers the market filter.`);
      return;
    }

    onRemoveSymbol(symbol);
  }

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
      <h2 style={{ marginTop: 0 }}>Watchlist Control</h2>

      <p style={{ color: "#aaa", fontSize: "14px", marginTop: "-4px" }}>
        Add or remove scanner symbols. SPY is protected because it powers the
        market filter.
      </p>

      <div
        style={{
          display: "flex",
          gap: "10px",
          flexWrap: "wrap",
          marginTop: "14px",
          marginBottom: "16px",
        }}
      >
        <input
          value={newSymbol}
          onChange={(e) => setNewSymbol(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") addSymbol();
          }}
          placeholder="Add symbol, example: META"
          style={{
            padding: "10px",
            borderRadius: "8px",
            border: "1px solid #444",
            background: "#050505",
            color: "white",
            minWidth: "220px",
          }}
        />

        <button
          onClick={addSymbol}
          style={{
            padding: "10px 14px",
            borderRadius: "8px",
            border: "none",
            background: "#2563eb",
            color: "white",
            cursor: "pointer",
            fontWeight: 700,
          }}
        >
          Add Symbol
        </button>
      </div>

      {safeWatchlist.length === 0 ? (
        <p style={{ color: "#aaa" }}>No symbols in watchlist.</p>
      ) : (
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
          {safeWatchlist.map((symbol) => {
            const isProtected = safeProtectedSymbols.includes(symbol);

            return (
              <div
                key={symbol}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  padding: "8px 10px",
                  borderRadius: "999px",
                  background: isProtected ? "#312e81" : "#1f2937",
                  border: "1px solid #374151",
                }}
              >
                <span style={{ fontWeight: 700 }}>{symbol}</span>

                {isProtected ? (
                  <span style={{ color: "#c4b5fd", fontSize: "12px" }}>
                    Protected
                  </span>
                ) : (
                  <button
                    onClick={() => removeSymbol(symbol)}
                    style={{
                      border: "none",
                      background: "#dc2626",
                      color: "white",
                      borderRadius: "999px",
                      cursor: "pointer",
                      fontSize: "12px",
                      padding: "3px 7px",
                      fontWeight: 700,
                    }}
                  >
                    X
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}