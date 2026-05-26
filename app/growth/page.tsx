"use client";

import { useState } from "react";

export default function Growth() {
  const [startingBalance, setStartingBalance] = useState("10000");
  const [monthlyReturn, setMonthlyReturn] = useState("5");
  const [months, setMonths] = useState("12");

  const start = Number(startingBalance);
  const rate = Number(monthlyReturn) / 100;
  const monthCount = Number(months);

  const endingBalance =
    start > 0 && monthCount > 0
      ? start * Math.pow(1 + rate, monthCount)
      : 0;

  const totalGain = endingBalance - start;

  return (
    <main className="min-h-screen bg-black text-white p-8">
      <a href="/" className="text-blue-400">
        ← Back to Dashboard
      </a>

      <h1 className="mt-6 text-4xl font-bold">Growth Calculator</h1>

      <p className="mt-4 text-gray-300">
        Project possible account growth using monthly compounding.
      </p>

      <div className="mt-8 grid gap-4 md:grid-cols-3">
        <input
          className="rounded-lg bg-gray-800 p-3 text-white"
          placeholder="Starting Balance"
          value={startingBalance}
          onChange={(e) => setStartingBalance(e.target.value)}
        />

        <input
          className="rounded-lg bg-gray-800 p-3 text-white"
          placeholder="Monthly Return %"
          value={monthlyReturn}
          onChange={(e) => setMonthlyReturn(e.target.value)}
        />

        <input
          className="rounded-lg bg-gray-800 p-3 text-white"
          placeholder="Months"
          value={months}
          onChange={(e) => setMonths(e.target.value)}
        />
      </div>

      <div className="mt-8 grid gap-4 md:grid-cols-3">
        <div className="rounded-xl bg-gray-800 p-4">
          <p className="text-gray-400">Starting Balance</p>
          <h2 className="text-2xl font-bold">
            ${start.toLocaleString()}
          </h2>
        </div>

        <div className="rounded-xl bg-gray-800 p-4">
          <p className="text-gray-400">Projected Ending Balance</p>
          <h2 className="text-2xl font-bold text-green-400">
            ${endingBalance.toLocaleString(undefined, {
              maximumFractionDigits: 2,
            })}
          </h2>
        </div>

        <div className="rounded-xl bg-gray-800 p-4">
          <p className="text-gray-400">Projected Gain</p>
          <h2
            className={
              totalGain >= 0
                ? "text-2xl font-bold text-green-400"
                : "text-2xl font-bold text-red-400"
            }
          >
            ${totalGain.toLocaleString(undefined, {
              maximumFractionDigits: 2,
            })}
          </h2>
        </div>
      </div>

      <div className="mt-8 rounded-xl bg-gray-900 p-6">
        <h2 className="text-2xl font-bold">Reality Check</h2>
        <p className="mt-4 text-gray-300">
          This is only a projection. Trading returns are not consistent, and losses
          are possible. Use this as a planning tool, not a guarantee.
        </p>
      </div>
    </main>
  );
}