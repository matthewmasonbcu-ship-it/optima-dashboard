"use client";

import { useState } from "react";

type WheelTrade = {
  action: string;
  ticker: string;
  strike: number;
  contracts: number;
  premiumPerContract: number;
  totalPremium: number;
  collateralRequired: number;
  outcome: "OPEN" | "ASSIGNED" | "EXPIRED";
};

export default function WheelBot() {
  const [cash, setCash] = useState(10000);
  const [premiumCollected, setPremiumCollected] = useState(0);
  const [ticker, setTicker] = useState("");
  const [strike, setStrike] = useState("");
  const [contracts, setContracts] = useState("");
  const [premium, setPremium] = useState("");
  const [trades, setTrades] = useState<WheelTrade[]>([]);
  const [isRunning, setIsRunning] = useState(false);

  const openCollateral = trades
    .filter((trade) => trade.outcome === "OPEN")
    .reduce((sum, trade) => sum + trade.collateralRequired, 0);

  const availableCash = cash - openCollateral;

  function resetInputs() {
    setTicker("");
    setStrike("");
    setContracts("");
    setPremium("");
  }

  function sellCashSecuredPut() {
    const cleanTicker = ticker.toUpperCase().trim();
    const strikePrice = Number(strike);
    const contractCount = Number(contracts);
    const premiumAmount = Number(premium);

    if (!cleanTicker || strikePrice <= 0 || contractCount <= 0 || premiumAmount <= 0) {
      alert("Enter ticker, strike, contracts, and premium.");
      return;
    }

    const collateralRequired = strikePrice * 100 * contractCount;
    const totalPremium = premiumAmount * 100 * contractCount;

    if (collateralRequired > availableCash) {
      alert("Not enough available cash for this cash-secured put.");
      return;
    }

    const newTrade: WheelTrade = {
      action: "SELL PUT",
      ticker: cleanTicker,
      strike: strikePrice,
      contracts: contractCount,
      premiumPerContract: premiumAmount,
      totalPremium,
      collateralRequired,
      outcome: "OPEN",
    };

    setTrades([newTrade, ...trades]);
    setCash(cash + totalPremium);
    setPremiumCollected(premiumCollected + totalPremium);
    resetInputs();
  }

  function expireTrade(index: number) {
    const updatedTrades = trades.map((trade, tradeIndex) => {
      if (tradeIndex === index) {
        return {
          ...trade,
          outcome: "EXPIRED" as const,
        };
      }

      return trade;
    });

    setTrades(updatedTrades);
  }

  function assignTrade(index: number) {
    const trade = trades[index];

    if (trade.outcome !== "OPEN") {
      alert("This trade is already closed.");
      return;
    }

    const updatedTrades = trades.map((currentTrade, tradeIndex) => {
      if (tradeIndex === index) {
        return {
          ...currentTrade,
          outcome: "ASSIGNED" as const,
        };
      }

      return currentTrade;
    });

    setTrades(updatedTrades);
  }

  function resetBot() {
    setCash(10000);
    setPremiumCollected(0);
    setTicker("");
    setStrike("");
    setContracts("");
    setPremium("");
    setTrades([]);
    setIsRunning(false);
  }

  return (
    <main className="min-h-screen bg-black text-white p-8">
      <a href="/" className="text-blue-400">
        ← Back to Dashboard
      </a>

      <div className="mt-6 flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold">Wheel Bot Simulator</h1>
          <p className="mt-4 text-gray-300">
            Practice selling cash-secured puts before risking real money.
          </p>
        </div>

        <button
          onClick={resetBot}
          className="rounded-lg bg-red-600 px-4 py-2 font-bold hover:bg-red-500"
        >
          Reset
        </button>
      </div>

      <div className="mt-8 grid gap-4 md:grid-cols-5">
        <div className="rounded-xl bg-gray-800 p-4">
          <p className="text-gray-400">Bot Status</p>
          <h2
            className={
              isRunning
                ? "text-2xl font-bold text-green-400"
                : "text-2xl font-bold text-yellow-400"
            }
          >
            {isRunning ? "Running" : "Paused"}
          </h2>
        </div>

        <div className="rounded-xl bg-gray-800 p-4">
          <p className="text-gray-400">Cash</p>
          <h2 className="text-2xl font-bold">${cash.toLocaleString()}</h2>
        </div>

        <div className="rounded-xl bg-gray-800 p-4">
          <p className="text-gray-400">Available Cash</p>
          <h2 className="text-2xl font-bold">
            ${availableCash.toLocaleString()}
          </h2>
        </div>

        <div className="rounded-xl bg-gray-800 p-4">
          <p className="text-gray-400">Collateral Locked</p>
          <h2 className="text-2xl font-bold text-yellow-400">
            ${openCollateral.toLocaleString()}
          </h2>
        </div>

        <div className="rounded-xl bg-gray-800 p-4">
          <p className="text-gray-400">Premium Collected</p>
          <h2 className="text-2xl font-bold text-green-400">
            ${premiumCollected.toLocaleString()}
          </h2>
        </div>
      </div>

      <div className="mt-8 rounded-xl bg-gray-900 p-6">
        <h2 className="text-2xl font-bold">Bot Controls</h2>

        <button
          onClick={() => setIsRunning(!isRunning)}
          className="mt-4 rounded-lg bg-green-600 px-6 py-3 font-bold hover:bg-green-500"
        >
          {isRunning ? "Pause Bot" : "Start Bot"}
        </button>

        <p className="mt-4 text-gray-400">
          Start the bot first, then enter a simulated cash-secured put trade.
        </p>
      </div>

      <div className="mt-8 rounded-xl bg-gray-900 p-6">
        <h2 className="text-2xl font-bold">Sell Cash-Secured Put</h2>

        <div className="mt-4 grid gap-4 md:grid-cols-5">
          <input
            className="rounded-lg bg-gray-800 p-3 text-white"
            placeholder="Ticker: AAPL"
            value={ticker}
            onChange={(e) => setTicker(e.target.value)}
          />

          <input
            className="rounded-lg bg-gray-800 p-3 text-white"
            placeholder="Strike: 90"
            value={strike}
            onChange={(e) => setStrike(e.target.value)}
          />

          <input
            className="rounded-lg bg-gray-800 p-3 text-white"
            placeholder="Contracts: 1"
            value={contracts}
            onChange={(e) => setContracts(e.target.value)}
          />

          <input
            className="rounded-lg bg-gray-800 p-3 text-white"
            placeholder="Premium: 1.25"
            value={premium}
            onChange={(e) => setPremium(e.target.value)}
          />

          <button
            onClick={sellCashSecuredPut}
            disabled={!isRunning}
            className="rounded-lg bg-blue-600 p-3 font-bold hover:bg-blue-500 disabled:bg-gray-700 disabled:text-gray-400"
          >
            Sell Put
          </button>
        </div>

        <div className="mt-4 rounded-lg bg-gray-800 p-4 text-gray-300">
          Example: 1 contract at a $90 strike requires $9,000 collateral.
          A $1.25 premium pays $125.
        </div>
      </div>

      <div className="mt-8 rounded-xl bg-gray-900 p-6">
        <h2 className="text-2xl font-bold">Risk Rules</h2>

        <ul className="mt-4 space-y-2 text-gray-300">
          <li>✅ This is simulation only</li>
          <li>✅ 1 options contract controls 100 shares</li>
          <li>✅ Collateral = strike × 100 × contracts</li>
          <li>✅ If assigned, you must buy 100 shares per contract</li>
          <li>✅ Never use real money until paper testing is consistent</li>
        </ul>
      </div>

      <div className="mt-8 rounded-xl bg-gray-900 p-6">
        <h2 className="text-2xl font-bold">Wheel Trade Log</h2>

        {trades.length === 0 ? (
          <p className="mt-4 text-gray-400">No wheel trades yet.</p>
        ) : (
          <div className="mt-4 space-y-3">
            {trades.map((trade, index) => (
              <div
                key={index}
                className="rounded-lg bg-gray-800 p-4"
              >
                <div className="flex justify-between">
                  <div>
                    <p className="font-bold text-green-400">
                      {trade.action} {trade.ticker}
                    </p>

                    <p className="text-gray-400">
                      {trade.contracts} contract(s) @ ${trade.strike} strike
                    </p>

                    <p className="text-gray-400">
                      Premium: ${trade.totalPremium.toLocaleString()}
                    </p>

                    <p className="text-gray-400">
                      Collateral: ${trade.collateralRequired.toLocaleString()}
                    </p>

                    <p
                      className={
                        trade.outcome === "OPEN"
                          ? "mt-2 font-bold text-yellow-400"
                          : trade.outcome === "EXPIRED"
                          ? "mt-2 font-bold text-green-400"
                          : "mt-2 font-bold text-red-400"
                      }
                    >
                      Status: {trade.outcome}
                    </p>
                  </div>

                  {trade.outcome === "OPEN" && (
                    <div className="flex flex-col gap-2">
                      <button
                        onClick={() => expireTrade(index)}
                        className="rounded-lg bg-green-600 px-4 py-2 font-bold hover:bg-green-500"
                      >
                        Mark Expired
                      </button>

                      <button
                        onClick={() => assignTrade(index)}
                        className="rounded-lg bg-red-600 px-4 py-2 font-bold hover:bg-red-500"
                      >
                        Mark Assigned
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}