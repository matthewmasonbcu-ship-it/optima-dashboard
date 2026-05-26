"use client";

import { useState } from "react";

type Task = {
  id: number;
  phase: string;
  title: string;
  description: string;
};

const tasks: Task[] = [
  {
    id: 1,
    phase: "Today",
    title: "Get Next.js app running",
    description: "Set up the OPTIMA project locally and confirm localhost works.",
  },
  {
    id: 2,
    phase: "Today",
    title: "Build homepage",
    description: "Create the main dashboard with links to every OPTIMA page.",
  },
  {
    id: 3,
    phase: "Today",
    title: "Build Paper Trading",
    description: "Add buy, sell, positions, realized gains, and performance stats.",
  },
  {
    id: 4,
    phase: "Today",
    title: "Build Wheel Bot",
    description: "Simulate cash-secured puts, premium, collateral, and outcomes.",
  },
  {
    id: 5,
    phase: "Today",
    title: "Build Growth Calculator",
    description: "Add monthly compound growth projections.",
  },
  {
    id: 6,
    phase: "Today",
    title: "Build Roadmap",
    description: "Create this checklist so progress is easy to track.",
  },

  {
    id: 7,
    phase: "Week 1",
    title: "Build Prop Firm Tracker",
    description: "Track firm rules, targets, drawdown, and evaluation progress.",
  },
  {
    id: 8,
    phase: "Week 1",
    title: "Improve homepage design",
    description: "Make the dashboard cleaner and easier to navigate.",
  },
  {
    id: 9,
    phase: "Week 1",
    title: "Add AI Coach page",
    description: "Create a strategy coach page with questions and trading rules.",
  },
  {
    id: 10,
    phase: "Week 1",
    title: "Add Alpaca page",
    description: "Create a safe placeholder page before adding real broker keys.",
  },
  {
    id: 11,
    phase: "Week 1",
    title: "Add Moonshot page",
    description: "Create a high-risk scanner page for speculative ideas.",
  },

  {
    id: 12,
    phase: "Week 2",
    title: "Add local storage",
    description: "Save trades, roadmap progress, and tracker data after refresh.",
  },
  {
    id: 13,
    phase: "Week 2",
    title: "Add trade journal",
    description: "Let each trade include notes, reasoning, and screenshots later.",
  },
  {
    id: 14,
    phase: "Week 2",
    title: "Add risk settings",
    description: "Create max loss, position size, and daily trade limits.",
  },
  {
    id: 15,
    phase: "Week 2",
    title: "Add daily checklist",
    description: "Make a pre-trade checklist to prevent emotional trades.",
  },
  {
    id: 16,
    phase: "Week 2",
    title: "Clean navigation",
    description: "Make every page easy to access from the dashboard.",
  },

  {
    id: 17,
    phase: "Month 1",
    title: "Create GitHub repo",
    description: "Save your code online and track versions.",
  },
  {
    id: 18,
    phase: "Month 1",
    title: "Deploy to Vercel",
    description: "Put OPTIMA online with a real website link.",
  },
  {
    id: 19,
    phase: "Month 1",
    title: "Add Supabase",
    description: "Prepare a real database for accounts, trades, and settings.",
  },
  {
    id: 20,
    phase: "Month 1",
    title: "Add login system",
    description: "Create secure user login before saving real user data.",
  },
  {
    id: 21,
    phase: "Month 1",
    title: "Save trades to database",
    description: "Move from browser-only storage to database storage.",
  },

  {
    id: 22,
    phase: "Month 2",
    title: "Connect Alpaca paper account",
    description: "Use paper trading API only, not live money.",
  },
  {
    id: 23,
    phase: "Month 2",
    title: "Pull paper account balance",
    description: "Display real paper account data from Alpaca.",
  },
  {
    id: 24,
    phase: "Month 2",
    title: "Pull paper positions",
    description: "Display paper positions inside OPTIMA.",
  },
  {
    id: 25,
    phase: "Month 2",
    title: "Add paper order execution",
    description: "Send simulated paper orders through the broker API.",
  },
  {
    id: 26,
    phase: "Month 2",
    title: "Add manual approval button",
    description: "Require human approval before any simulated order is sent.",
  },

  {
    id: 27,
    phase: "Month 3",
    title: "Backtest strategies",
    description: "Test ideas on historical data before trusting them.",
  },
  {
    id: 28,
    phase: "Month 3",
    title: "Add strategy scorecard",
    description: "Grade trades by setup quality, risk, and discipline.",
  },
  {
    id: 29,
    phase: "Month 3",
    title: "Add news summary",
    description: "Summarize market news without automatically trading on it.",
  },
  {
    id: 30,
    phase: "Month 3",
    title: "Paper test for consistency",
    description: "Test for weeks or months before considering real capital.",
  },
  {
    id: 31,
    phase: "Month 3",
    title: "Decide if live trading is worth it",
    description: "Only consider real money after consistent paper results.",
  },
];

export default function Roadmap() {
  const [completed, setCompleted] = useState<number[]>([]);
  const [selectedPhase, setSelectedPhase] = useState("Today");

  const phases = ["Today", "Week 1", "Week 2", "Month 1", "Month 2", "Month 3"];

  const filteredTasks = tasks.filter((task) => task.phase === selectedPhase);

  const completedInPhase = filteredTasks.filter((task) =>
    completed.includes(task.id)
  ).length;

  const progress = Math.round((completed.length / tasks.length) * 100);

  const phaseProgress =
    filteredTasks.length > 0
      ? Math.round((completedInPhase / filteredTasks.length) * 100)
      : 0;

  function toggleTask(id: number) {
    if (completed.includes(id)) {
      setCompleted(completed.filter((taskId) => taskId !== id));
    } else {
      setCompleted([...completed, id]);
    }
  }

  function resetRoadmap() {
    setCompleted([]);
  }

  return (
    <main className="min-h-screen bg-black p-8 text-white">
      <a href="/" className="text-blue-400">
        ← Back to Dashboard
      </a>

      <div className="mt-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-4xl font-bold">OPTIMA Roadmap</h1>
          <p className="mt-4 max-w-3xl text-gray-300">
            Track your build progress from beginner setup to a paper-tested
            trading platform. Keep this in simulation mode until your system is
            consistent.
          </p>
        </div>

        <button
          onClick={resetRoadmap}
          className="rounded-lg bg-red-600 px-4 py-2 font-bold hover:bg-red-500"
        >
          Reset Roadmap
        </button>
      </div>

      <div className="mt-8 grid gap-4 md:grid-cols-3">
        <div className="rounded-xl bg-gray-900 p-6">
          <p className="text-gray-400">Overall Progress</p>
          <h2 className="mt-2 text-3xl font-bold text-green-400">
            {progress}%
          </h2>
          <p className="mt-2 text-gray-400">
            {completed.length} of {tasks.length} tasks complete.
          </p>
        </div>

        <div className="rounded-xl bg-gray-900 p-6">
          <p className="text-gray-400">Current Phase</p>
          <h2 className="mt-2 text-3xl font-bold">{selectedPhase}</h2>
          <p className="mt-2 text-gray-400">
            {completedInPhase} of {filteredTasks.length} phase tasks complete.
          </p>
        </div>

        <div className="rounded-xl bg-gray-900 p-6">
          <p className="text-gray-400">Mode</p>
          <h2 className="mt-2 text-3xl font-bold text-yellow-400">
            Paper Only
          </h2>
          <p className="mt-2 text-gray-400">
            No real-money automation until testing is consistent.
          </p>
        </div>
      </div>

      <div className="mt-8 rounded-xl bg-gray-900 p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">Overall Build Progress</h2>
          <p className="font-bold text-green-400">{progress}%</p>
        </div>

        <div className="mt-4 h-4 rounded-full bg-gray-700">
          <div
            className="h-4 rounded-full bg-green-500"
            style={{ width: `${progress}%` }}
          ></div>
        </div>
      </div>

      <div className="mt-8 flex flex-wrap gap-3">
        {phases.map((phase) => (
          <button
            key={phase}
            onClick={() => setSelectedPhase(phase)}
            className={
              selectedPhase === phase
                ? "rounded-lg bg-green-600 px-4 py-2 font-bold"
                : "rounded-lg bg-gray-800 px-4 py-2 font-bold hover:bg-gray-700"
            }
          >
            {phase}
          </button>
        ))}
      </div>

      <div className="mt-8 rounded-xl bg-gray-900 p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">{selectedPhase} Tasks</h2>
          <p className="font-bold text-green-400">
            {phaseProgress}% Complete
          </p>
        </div>

        <div className="mt-4 h-3 rounded-full bg-gray-700">
          <div
            className="h-3 rounded-full bg-green-500"
            style={{ width: `${phaseProgress}%` }}
          ></div>
        </div>

        <div className="mt-6 space-y-3">
          {filteredTasks.map((task) => {
            const isDone = completed.includes(task.id);

            return (
              <button
                key={task.id}
                onClick={() => toggleTask(task.id)}
                className={
                  isDone
                    ? "w-full rounded-lg bg-green-950 p-4 text-left text-green-300 line-through"
                    : "w-full rounded-lg bg-gray-800 p-4 text-left hover:bg-gray-700"
                }
              >
                <div className="flex gap-3">
                  <span>{isDone ? "✅" : "⬜"}</span>

                  <div>
                    <p className="font-bold">{task.title}</p>
                    <p className="mt-1 text-sm text-gray-400">
                      {task.description}
                    </p>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-8 rounded-xl border border-yellow-700 bg-yellow-950 p-6">
        <h2 className="text-2xl font-bold text-yellow-400">
          Roadmap Rule
        </h2>

        <p className="mt-4 text-gray-300">
          Build the platform first, paper test second, and only consider live
          money after your strategy, risk rules, and review process are
          consistent.
        </p>
      </div>
    </main>
  );
}