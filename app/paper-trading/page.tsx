"use client";

import { useState } from "react";

type Trade = {
  type: "BUY" | "SELL";
  ticker: string;
  quantity: number;
  price: number;
  total: number;
  realizedGain?: number;
};

type Position = {
  ticker: string;
  quantity: number;
  averagePrice: number;
};

export default function PaperTrading() {
  const [balance, setBalance] = useState(10000);
  const [realizedGains, setRealizedGains] = useState(0);
  const [ticker, setTicker] = useState("");
  const [quantity, setQuantity] = useState("");
  const [price, setPrice] = useState("");
  const [trades, setTrades] = useState<Trade[]>([]);
  const [positions, setPositions] = useState<Position[]>([]);

  const investedValue = positions.reduce(
    (sum, position) => sum + position.quantity * position.averagePrice,
    0
  );

  const accountValue = balance + investedValue;

  const sellTrades = trades.filter((trade) => trade.type === "SELL");

  const winningTrades = sellTrades.filter(
    (trade) => (trade.realizedGain ?? 0) > 0
  );

  const losingTrades = sellTrades.filter(
    (trade) => (trade.realizedGain ?? 0) < 0
  );

  const netPLPercent = (realizedGains / 10000) * 100;

  const winRate =
    sellTrades.length > 0
      ? (winningTrades.length / sellTrades.length) * 100
      : 0;

  const averageWin =
    winningTrades.length > 0
      ? winningTrades.reduce(
          (sum, trade) => sum + (trade.realizedGain ?? 0),
          0
        ) / winningTrades.length
      : 0;

  const averageLoss =
    losingTrades.length > 0
      ? losingTrades.reduce(
          (sum, trade) => sum + (trade.realizedGain ?? 0),
          0
        ) / losingTrades.length
      : 0;

  const bestTrade =
    sellTrades.length > 0
      ? Math.max(...sellTrades.map((trade) => trade.realizedGain ?? 0))
      : 0;

  const worstTrade =
    sellTrades.length > 0
      ? Math.min(...sellTrades.map((trade) => trade.realizedGain ?? 0))
      : 0;

  function resetInputs() {
    setTicker("");
    setQuantity("");
    setPrice("");
  }

  function simulateBuy() {
    const cleanTicker = ticker.toUpperCase().trim();
    const qty = Number(quantity);
    const tradePrice = Number(price);
    const total = qty * tradePrice;

    if (!cleanTicker || qty <= 0 || tradePrice <= 0) {
      alert("Enter a ticker, quantity, and price.");
      return;
    }

    if (total > balance) {
      alert("Not enough paper money for this trade.");
      return;
    }

    const existingPosition = positions.find(
      (position) => position.ticker === cleanTicker
    );

    let updatedPositions: Position[];

    if (existingPosition) {
      updatedPositions = positions.map((position) => {
        if (position.ticker === cleanTicker) {
          const oldTotal = position.quantity * position.averagePrice;
          const newTotal = qty * tradePrice;
          const newQuantity = position.quantity + qty;
          const newAveragePrice = (oldTotal + newTotal) / newQuantity;

          return {
            ticker: cleanTicker,
            quantity: newQuantity,
            averagePrice: newAveragePrice,
          };
        }

        return position;
      });
    } else {
      updatedPositions = [
        ...positions,
        {
          ticker: cleanTicker,
          quantity: qty,
          averagePrice: tradePrice,
        },
      ];
    }

    const newTrade: Trade = {
      type: "BUY",
      ticker: cleanTicker,
      quantity: qty,
      price: tradePrice,
      total,
    };

    setPositions(updatedPositions);
    setTrades([newTrade, ...trades]);
    setBalance(balance - total);
    resetInputs();
  }

  function simulateSell() {
    const cleanTicker = ticker.toUpperCase().trim();
    const qty = Number(quantity);
    const tradePrice = Number(price);
    const total = qty * tradePrice;

    if (!cleanTicker || qty <= 0 || tradePrice <= 0) {
      alert("Enter a ticker, quantity, and price.");
      return;
    }

    const existingPosition = positions.find(
      (position) => position.ticker === cleanTicker
    );

    if (!existingPosition) {
      alert("You do not own this stock.");
      return;
    }

    if (qty > existingPosition.quantity) {
      alert("You cannot sell more shares than you own.");
      return;
    }

    const realizedGain = (tradePrice - existingPosition.averagePrice) * qty;

    const updatedPositions = positions
      .map((position) => {
        if (position.ticker === cleanTicker) {
          return {
            ...position,
            quantity: position.quantity - qty,
          };
        }

        return position;
      })
      .filter((position) => position.quantity > 0);

    const newTrade: Trade = {
      type: "SELL",
      ticker: cleanTicker,
      quantity: qty,
      price: tradePrice,
      total,
      realizedGain,
    };

    setPositions(updatedPositions);
    setTrades([newTrade, ...trades]);
    setBalance(balance + total);
    setRealizedGains(realizedGains + realizedGain);
    resetInputs();
  }

  function resetAccount() {
    setBalance(10000);
    setRealizedGains(0);
    setTicker("");
    setQuantity("");
    setPrice("");
    setTrades([]);
    setPositions([]);
  }

  return (
    <main className="min-h-screen bg-black text-white p-8">
      <a href="/" className="text-blue-400">
        ← Back to Dashboard
      </a>

      <div className="mt-6 flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold">Paper Trading</h1>
          <p className="mt-4 text-gray-300">
            Practice fake trades before risking real money.
          </p>
        </div>

        <button
          onClick={resetAccount}
          className="rounded-lg bg-red-600 px-4 py-2 font-bold hover:bg-red-500"
        >
          Reset
        </button>
      </div>

      <div className="mt-8 grid gap-4 md:grid-cols-5">
        <div className="rounded-xl bg-gray-800 p-4">
          <p className="text-gray-400">Cash Balance</p>
          <h2 className="text-2xl font-bold">${balance.toLocaleString()}</h2>
        </div>

        <div className="rounded-xl bg-gray-800 p-4">
          <p className="text-gray-400">Invested Value</p>
          <h2 className="text-2xl font-bold">
            ${investedValue.toLocaleString()}
          </h2>
        </div>

        <div className="rounded-xl bg-gray-800 p-4">
          <p className="text-gray-400">Account Value</p>
          <h2 className="text-2xl font-bold">
            ${accountValue.toLocaleString()}
          </h2>
        </div>

        <div className="rounded-xl bg-gray-800 p-4">
          <p className="text-gray-400">Realized Gains</p>
          <h2
            className={
              realizedGains >= 0
                ? "text-2xl font-bold text-green-400"
                : "text-2xl font-bold text-red-400"
            }
          >
            ${realizedGains.toFixed(2)}
          </h2>
        </div>

        <div className="rounded-xl bg-gray-800 p-4">
          <p className="text-gray-400">Total Trades</p>
          <h2 className="text-2xl font-bold">{trades.length}</h2>
        </div>
      </div>

      <div className="mt-8 rounded-xl bg-gray-900 p-6">
        <h2 className="text-2xl font-bold">Performance</h2>

        <div className="mt-4 grid gap-4 md:grid-cols-6">
          <div className="rounded-xl bg-gray-800 p-4">
            <p className="text-gray-400">Net P&L %</p>
            <h3
              className={
                netPLPercent >= 0
                  ? "text-xl font-bold text-green-400"
                  : "text-xl font-bold text-red-400"
              }
            >
              {netPLPercent.toFixed(2)}%
            </h3>
          </div>

          <div className="rounded-xl bg-gray-800 p-4">
            <p className="text-gray-400">Win Rate</p>
            <h3 className="text-xl font-bold">{winRate.toFixed(1)}%</h3>
          </div>

          <div className="rounded-xl bg-gray-800 p-4">
            <p className="text-gray-400">Average Win</p>
            <h3 className="text-xl font-bold text-green-400">
              ${averageWin.toFixed(2)}
            </h3>
          </div>

          <div className="rounded-xl bg-gray-800 p-4">
            <p className="text-gray-400">Average Loss</p>
            <h3 className="text-xl font-bold text-red-400">
              ${averageLoss.toFixed(2)}
            </h3>
          </div>

          <div className="rounded-xl bg-gray-800 p-4">
            <p className="text-gray-400">Best Trade</p>
            <h3 className="text-xl font-bold text-green-400">
              ${bestTrade.toFixed(2)}
            </h3>
          </div>

          <div className="rounded-xl bg-gray-800 p-4">
            <p className="text-gray-400">Worst Trade</p>
            <h3 className="text-xl font-bold text-red-400">
              ${worstTrade.toFixed(2)}
            </h3>
          </div>
        </div>
      </div>

      <div className="mt-8 rounded-xl bg-gray-900 p-6">
        <h2 className="text-2xl font-bold">Trade Simulator</h2>

        <div className="mt-4 grid gap-4 md:grid-cols-5">
          <input
            className="rounded-lg bg-gray-800 p-3 text-white"
            placeholder="Ticker: AAPL"
            value={ticker}
            onChange={(e) => setTicker(e.target.value)}
          />

          <input
            className="rounded-lg bg-gray-800 p-3 text-white"
            placeholder="Quantity"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
          />

          <input
            className="rounded-lg bg-gray-800 p-3 text-white"
            placeholder="Price"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
          />

          <button
            onClick={simulateBuy}
            className="rounded-lg bg-green-600 p-3 font-bold hover:bg-green-500"
          >
            Buy
          </button>

          <button
            onClick={simulateSell}
            className="rounded-lg bg-blue-600 p-3 font-bold hover:bg-blue-500"
          >
            Sell
          </button>
        </div>
      </div>

      <div className="mt-8 grid gap-6 md:grid-cols-2">
        <div className="rounded-xl bg-gray-900 p-6">
          <h2 className="text-2xl font-bold">Open Positions</h2>

          {positions.length === 0 ? (
            <p className="mt-4 text-gray-400">No open positions yet.</p>
          ) : (
            <div className="mt-4 space-y-3">
              {positions.map((position) => (
                <div
                  key={position.ticker}
                  className="rounded-lg bg-gray-800 p-4"
                >
                  <div className="flex justify-between">
                    <p className="font-bold">{position.ticker}</p>
                    <p>{position.quantity} shares</p>
                  </div>

                  <p className="mt-2 text-gray-400">
                    Avg Price: ${position.averagePrice.toFixed(2)}
                  </p>

                  <p className="text-gray-400">
                    Value: $
                    {(position.quantity * position.averagePrice).toLocaleString()}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-xl bg-gray-900 p-6">
          <h2 className="text-2xl font-bold">Trade History</h2>

          {trades.length === 0 ? (
            <p className="mt-4 text-gray-400">No trades yet.</p>
          ) : (
            <div className="mt-4 space-y-3">
              {trades.map((trade, index) => (
                <div
                  key={index}
                  className="flex justify-between rounded-lg bg-gray-800 p-4"
                >
                  <div>
                    <p
                      className={
                        trade.type === "BUY"
                          ? "font-bold text-green-400"
                          : "font-bold text-blue-400"
                      }
                    >
                      {trade.type} {trade.ticker}
                    </p>

                    <p className="text-gray-400">
                      {trade.quantity} shares @ ${trade.price}
                    </p>

                    {trade.type === "SELL" && (
                      <p
                        className={
                          (trade.realizedGain ?? 0) >= 0
                            ? "text-green-400"
                            : "text-red-400"
                        }
                      >
                        Realized Gain: ${trade.realizedGain?.toFixed(2)}
                      </p>
                    )}
                  </div>

                  <p className="font-bold">${trade.total.toLocaleString()}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}