"use client";

import { useState } from "react";

type Status = "Not Started" | "In Progress" | "Passed" | "Failed";

type Firm = {
  name: string;
  accountSize: number;
  profitTarget: number;
  maxDailyLoss: number;
  maxTotalLoss: number;
  status: Status;
};

const startingFirms: Firm[] = [
  {
    name: "Topstep",
    accountSize: 50000,
    profitTarget: 3000,
    maxDailyLoss: 1000,
    maxTotalLoss: 2000,
    status: "Not Started",
  },
  {
    name: "Apex Trader Funding",
    accountSize: 50000,
    profitTarget: 3000,
    maxDailyLoss: 0,
    maxTotalLoss: 2500,
    status: "Not Started",
  },
  {
    name: "FTMO",
    accountSize: 100000,
    profitTarget: 10000,
    maxDailyLoss: 5000,
    maxTotalLoss: 10000,
    status: "Not Started",
  },
  {
    name: "MyFundedFutures",
    accountSize: 50000,
    profitTarget: 3000,
    maxDailyLoss: 1200,
    maxTotalLoss: 2500,
    status: "Not Started",
  },
  {
    name: "Tradeify",
    accountSize: 50000,
    profitTarget: 3000,
    maxDailyLoss: 1500,
    maxTotalLoss: 2500,
    status: "Not Started",
  },
];

function formatMoney(value: number) {
  return value.toLocaleString(undefined, {
    maximumFractionDigits: 2,
  });
}

export default function PropFirmTracker() {
  const [firms, setFirms] = useState<Firm[]>(startingFirms);
  const [selectedFirm, setSelectedFirm] = useState(startingFirms[0].name);
  const [currentProfit, setCurrentProfit] = useState("");
  const [currentDrawdown, setCurrentDrawdown] = useState("");

  const firm = firms.find((item) => item.name === selectedFirm) ?? firms[0];

  const profit = Number(currentProfit) || 0;
  const drawdown = Number(currentDrawdown) || 0;

  const profitProgress =
    firm.profitTarget > 0
      ? Math.min(Math.max((profit / firm.profitTarget) * 100, 0), 100)
      : 0;

  const drawdownUsed =
    firm.maxTotalLoss > 0
      ? Math.min(Math.max((drawdown / firm.maxTotalLoss) * 100, 0), 100)
      : 0;

  const remainingToTarget = Math.max(firm.profitTarget - profit, 0);
  const remainingDrawdown = Math.max(firm.maxTotalLoss - drawdown, 0);

  function updateStatus(newStatus: Status) {
    setFirms((previousFirms) =>
      previousFirms.map((item) =>
        item.name === selectedFirm
          ? {
              ...item,
              status: newStatus,
            }
          : item
      )
    );
  }

  function resetInputs() {
    setCurrentProfit("");
    setCurrentDrawdown("");
  }

  return (
    <main className="min-h-screen bg-black p-8 text-white">
      <a href="/" className="text-blue-400">
        ← Back to Dashboard
      </a>

      <div className="mt-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-4xl font-bold">Prop Firm Tracker</h1>
          <p className="mt-4 max-w-3xl text-gray-300">
            Track evaluation rules, profit targets, and drawdown risk before
            taking a funded account challenge.
          </p>
        </div>

        <button
          onClick={resetInputs}
          className="rounded-lg bg-red-600 px-4 py-2 font-bold hover:bg-red-500"
        >
          Reset Inputs
        </button>
      </div>

      <div className="mt-8 rounded-xl bg-gray-900 p-6">
        <h2 className="text-2xl font-bold">Choose Firm</h2>

        <select
          className="mt-4 w-full rounded-lg bg-gray-800 p-3 text-white"
          value={selectedFirm}
          onChange={(event) => setSelectedFirm(event.target.value)}
        >
          {firms.map((item) => (
            <option key={item.name} value={item.name}>
              {item.name}
            </option>
          ))}
        </select>
      </div>

      <div className="mt-8 grid gap-4 md:grid-cols-5">
        <div className="rounded-xl bg-gray-800 p-4">
          <p className="text-gray-400">Firm</p>
          <h2 className="text-2xl font-bold">{firm.name}</h2>
        </div>

        <div className="rounded-xl bg-gray-800 p-4">
          <p className="text-gray-400">Account Size</p>
          <h2 className="text-2xl font-bold">
            ${formatMoney(firm.accountSize)}
          </h2>
        </div>

        <div className="rounded-xl bg-gray-800 p-4">
          <p className="text-gray-400">Profit Target</p>
          <h2 className="text-2xl font-bold text-green-400">
            ${formatMoney(firm.profitTarget)}
          </h2>
        </div>

        <div className="rounded-xl bg-gray-800 p-4">
          <p className="text-gray-400">Max Total Loss</p>
          <h2 className="text-2xl font-bold text-red-400">
            ${formatMoney(firm.maxTotalLoss)}
          </h2>
        </div>

        <div className="rounded-xl bg-gray-800 p-4">
          <p className="text-gray-400">Status</p>
          <h2
            className={
              firm.status === "Passed"
                ? "text-2xl font-bold text-green-400"
                : firm.status === "Failed"
                ? "text-2xl font-bold text-red-400"
                : firm.status === "In Progress"
                ? "text-2xl font-bold text-yellow-400"
                : "text-2xl font-bold text-gray-300"
            }
          >
            {firm.status}
          </h2>
        </div>
      </div>

      <div className="mt-8 grid gap-4 md:grid-cols-3">
        <div className="rounded-xl bg-gray-900 p-6">
          <p className="text-gray-400">Daily Loss Limit</p>
          <h2 className="mt-2 text-2xl font-bold text-red-400">
            {firm.maxDailyLoss > 0
              ? `$${formatMoney(firm.maxDailyLoss)}`
              : "N/A"}
          </h2>
        </div>

        <div className="rounded-xl bg-gray-900 p-6">
          <p className="text-gray-400">Remaining To Target</p>
          <h2 className="mt-2 text-2xl font-bold text-green-400">
            ${formatMoney(remainingToTarget)}
          </h2>
        </div>

        <div className="rounded-xl bg-gray-900 p-6">
          <p className="text-gray-400">Remaining Drawdown Buffer</p>
          <h2 className="mt-2 text-2xl font-bold text-yellow-400">
            ${formatMoney(remainingDrawdown)}
          </h2>
        </div>
      </div>

      <div className="mt-8 rounded-xl bg-gray-900 p-6">
        <h2 className="text-2xl font-bold">Evaluation Progress</h2>

        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <input
            className="rounded-lg bg-gray-800 p-3 text-white"
            placeholder="Current Profit: 1500"
            value={currentProfit}
            onChange={(event) => setCurrentProfit(event.target.value)}
          />

          <input
            className="rounded-lg bg-gray-800 p-3 text-white"
            placeholder="Current Drawdown Used: 500"
            value={currentDrawdown}
            onChange={(event) => setCurrentDrawdown(event.target.value)}
          />
        </div>

        <div className="mt-6">
          <div className="flex justify-between">
            <p className="font-bold">Profit Target Progress</p>
            <p className="font-bold text-green-400">
              {profitProgress.toFixed(1)}%
            </p>
          </div>

          <div className="mt-2 h-4 rounded-full bg-gray-700">
            <div
              className="h-4 rounded-full bg-green-500"
              style={{ width: `${profitProgress}%` }}
            ></div>
          </div>

          <p className="mt-2 text-gray-400">
            ${formatMoney(remainingToTarget)} left to reach target.
          </p>
        </div>

        <div className="mt-6">
          <div className="flex justify-between">
            <p className="font-bold">Drawdown Used</p>
            <p className="font-bold text-red-400">
              {drawdownUsed.toFixed(1)}%
            </p>
          </div>

          <div className="mt-2 h-4 rounded-full bg-gray-700">
            <div
              className="h-4 rounded-full bg-red-500"
              style={{ width: `${drawdownUsed}%` }}
            ></div>
          </div>

          <p className="mt-2 text-gray-400">
            ${formatMoney(remainingDrawdown)} drawdown buffer remaining.
          </p>
        </div>
      </div>

      <div className="mt-8 rounded-xl bg-gray-900 p-6">
        <h2 className="text-2xl font-bold">Update Status</h2>

        <div className="mt-4 flex flex-wrap gap-3">
          <button
            onClick={() => updateStatus("Not Started")}
            className="rounded-lg bg-gray-700 px-4 py-2 font-bold hover:bg-gray-600"
          >
            Not Started
          </button>

          <button
            onClick={() => updateStatus("In Progress")}
            className="rounded-lg bg-yellow-600 px-4 py-2 font-bold hover:bg-yellow-500"
          >
            In Progress
          </button>

          <button
            onClick={() => updateStatus("Passed")}
            className="rounded-lg bg-green-600 px-4 py-2 font-bold hover:bg-green-500"
          >
            Passed
          </button>

          <button
            onClick={() => updateStatus("Failed")}
            className="rounded-lg bg-red-600 px-4 py-2 font-bold hover:bg-red-500"
          >
            Failed
          </button>
        </div>
      </div>

      <div className="mt-8 rounded-xl border border-yellow-700 bg-yellow-950 p-6">
        <h2 className="text-2xl font-bold text-yellow-400">
          Prop Firm Reminder
        </h2>

        <p className="mt-4 text-gray-300">
          Always verify current prop firm rules on the official firm website
          before buying an evaluation. Rules, drawdown systems, fees, payout
          requirements, and allowed instruments can change.
        </p>
      </div>
    </main>
  );
}