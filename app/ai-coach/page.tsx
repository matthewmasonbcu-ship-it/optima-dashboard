"use client";

import { useState } from "react";

type Message = {
  role: "user" | "coach";
  text: string;
};

const quickPrompts = [
  "Should I take this trade?",
  "How do I control risk?",
  "Explain the wheel strategy",
  "How do I pass a prop firm challenge?",
  "What should I do after a losing trade?",
];

function getCoachResponse(question: string) {
  const lower = question.toLowerCase();

  if (lower.includes("risk") || lower.includes("loss") || lower.includes("stop")) {
    return "Risk comes first. Before any trade, define your max loss, position size, stop level, and reason for entering. If you cannot explain the risk clearly, do not take the trade.";
  }

  if (lower.includes("wheel") || lower.includes("put") || lower.includes("covered call")) {
    return "The wheel strategy starts by selling cash-secured puts on a stock you are willing to own. If assigned, you own 100 shares per contract. Then you may sell covered calls. The danger is thinking premium is free money while ignoring collateral and downside risk.";
  }

  if (lower.includes("prop") || lower.includes("funded") || lower.includes("challenge")) {
    return "For prop firms, survival matters more than fast profits. Focus on small consistent trades, protecting drawdown, avoiding revenge trading, and following the firm's rules exactly.";
  }

  if (lower.includes("losing") || lower.includes("lost") || lower.includes("revenge")) {
    return "After a losing trade, pause. Do not immediately enter another trade to make it back. Write down what happened, whether you followed your rules, and what you should do next.";
  }

  if (lower.includes("buy") || lower.includes("sell") || lower.includes("take this trade")) {
    return "I cannot tell you to buy or sell, but you can grade the trade. Ask: What is the setup? What is the risk? What is the reward? Where is the invalidation point? Are you following your plan or chasing emotion?";
  }

  return "Good question. My rule is simple: protect capital first, follow your plan second, and only scale after consistent paper results.";
}

export default function AICoach() {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "coach",
      text: "Welcome to OPTIMA AI Coach. Ask about risk, paper trading, wheel strategy, prop firms, or trade discipline.",
    },
  ]);

  function askCoach(question?: string) {
    const finalQuestion = question ?? input;

    if (!finalQuestion.trim()) {
      alert("Type a question first.");
      return;
    }

    const userMessage: Message = {
      role: "user",
      text: finalQuestion,
    };

    const coachMessage: Message = {
      role: "coach",
      text: getCoachResponse(finalQuestion),
    };

    setMessages([userMessage, coachMessage, ...messages]);
    setInput("");
  }

  function resetChat() {
    setMessages([
      {
        role: "coach",
        text: "Chat reset. Ask me about strategy, risk, discipline, or prop firm rules.",
      },
    ]);
  }

  return (
    <main className="min-h-screen bg-black p-8 text-white">
      <a href="/" className="text-blue-400">
        ← Back to Dashboard
      </a>

      <div className="mt-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-4xl font-bold">AI Coach</h1>
          <p className="mt-4 max-w-3xl text-gray-300">
            Ask strategy questions and get rule-based coaching. This is a safe placeholder coach, not a live AI API connection yet.
          </p>
        </div>

        <button
          onClick={resetChat}
          className="rounded-lg bg-red-600 px-4 py-2 font-bold hover:bg-red-500"
        >
          Reset Chat
        </button>
      </div>

      <div className="mt-8 grid gap-4 md:grid-cols-4">
        <div className="rounded-xl bg-gray-800 p-4">
          <p className="text-gray-400">Coach Mode</p>
          <h2 className="text-2xl font-bold text-green-400">Active</h2>
        </div>

        <div className="rounded-xl bg-gray-800 p-4">
          <p className="text-gray-400">Trading Mode</p>
          <h2 className="text-2xl font-bold">Paper Only</h2>
        </div>

        <div className="rounded-xl bg-gray-800 p-4">
          <p className="text-gray-400">Primary Focus</p>
          <h2 className="text-2xl font-bold text-yellow-400">Risk</h2>
        </div>

        <div className="rounded-xl bg-gray-800 p-4">
          <p className="text-gray-400">Real Orders</p>
          <h2 className="text-2xl font-bold text-red-400">Disabled</h2>
        </div>
      </div>

      <div className="mt-8 rounded-xl bg-gray-900 p-6">
        <h2 className="text-2xl font-bold">Quick Prompts</h2>

        <div className="mt-4 flex flex-wrap gap-3">
          {quickPrompts.map((prompt) => (
            <button
              key={prompt}
              onClick={() => askCoach(prompt)}
              className="rounded-lg bg-gray-800 px-4 py-2 font-bold hover:bg-gray-700"
            >
              {prompt}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-8 rounded-xl bg-gray-900 p-6">
        <h2 className="text-2xl font-bold">Ask the Coach</h2>

        <div className="mt-4 grid gap-4 md:grid-cols-[1fr_auto]">
          <input
            className="rounded-lg bg-gray-800 p-3 text-white"
            placeholder="Ask a trading question..."
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                askCoach();
              }
            }}
          />

          <button
            onClick={() => askCoach()}
            className="rounded-lg bg-green-600 px-6 py-3 font-bold hover:bg-green-500"
          >
            Ask
          </button>
        </div>
      </div>

      <div className="mt-8 rounded-xl bg-gray-900 p-6">
        <h2 className="text-2xl font-bold">Coach Chat</h2>

        <div className="mt-4 space-y-4">
          {messages.map((message, index) => (
            <div
              key={index}
              className={
                message.role === "user"
                  ? "rounded-xl bg-blue-950 p-4"
                  : "rounded-xl bg-gray-800 p-4"
              }
            >
              <p
                className={
                  message.role === "user"
                    ? "font-bold text-blue-400"
                    : "font-bold text-green-400"
                }
              >
                {message.role === "user" ? "You" : "OPTIMA Coach"}
              </p>

              <p className="mt-2 text-gray-200">{message.text}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-8 rounded-xl border border-yellow-700 bg-yellow-950 p-6">
        <h2 className="text-2xl font-bold text-yellow-400">
          Coach Disclaimer
        </h2>

        <p className="mt-4 text-gray-300">
          This page does not give financial advice or guarantee profitable trades. Use it for discipline, education, and trade review only.
        </p>
      </div>
    </main>
  );
}