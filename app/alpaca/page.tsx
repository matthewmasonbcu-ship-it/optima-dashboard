"use client";

import { useState } from "react";

export default function AlpacaPage() {
  const [apiKey, setApiKey] = useState("");
  const [secretKey, setSecretKey] = useState("");
  const [connected, setConnected] = useState(false);

  function connectPaperAccount() {
    if (!apiKey.trim() || !secretKey.trim()) {
      alert("Enter both your paper API key and paper secret key.");
      return;
    }

    setConnected(true);
  }

  function disconnectAccount() {
    setApiKey("");
    setSecretKey("");
    setConnected(false);
  }

  return (
    <main className="min-h-screen bg-black p-8 text-white">
      <a href="/" className="text-blue-400">
        ← Back to Dashboard
      </a>

      <div className="mt-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-4xl font-bold">Alpaca Paper Connection</h1>
          <p className="mt-4 max-w-3xl text-gray-300">
            This is a safe placeholder page for connecting an Alpaca paper
            trading account later. Do not enter real-money keys yet.
          </p>
        </div>

        <button
          onClick={disconnectAccount}
          className="rounded-lg bg-red-600 px-4 py-2 font-bold hover:bg-red-500"
        >
          Disconnect
        </button>
      </div>

      <div className="mt-8 grid gap-4 md:grid-cols-4">
        <div className="rounded-xl bg-gray-800 p-4">
          <p className="text-gray-400">Connection Status</p>
          <h2
            className={
              connected
                ? "text-2xl font-bold text-green-400"
                : "text-2xl font-bold text-yellow-400"
            }
          >
            {connected ? "Connected" : "Not Connected"}
          </h2>
        </div>

        <div className="rounded-xl bg-gray-800 p-4">
          <p className="text-gray-400">Mode</p>
          <h2 className="text-2xl font-bold">Paper</h2>
        </div>

        <div className="rounded-xl bg-gray-800 p-4">
          <p className="text-gray-400">Real Orders</p>
          <h2 className="text-2xl font-bold text-red-400">Disabled</h2>
        </div>

        <div className="rounded-xl bg-gray-800 p-4">
          <p className="text-gray-400">Automation</p>
          <h2 className="text-2xl font-bold text-yellow-400">Manual Only</h2>
        </div>
      </div>

      <div className="mt-8 rounded-xl bg-gray-900 p-6">
        <h2 className="text-2xl font-bold">Paper API Keys</h2>

        <p className="mt-3 text-gray-400">
          For now, this page only simulates a connection. Later, we will move
          keys to secure environment variables instead of storing them in the
          browser.
        </p>

        <div className="mt-4 grid gap-4">
          <input
            className="rounded-lg bg-gray-800 p-3 text-white"
            placeholder="Paper API Key"
            value={apiKey}
            onChange={(event) => setApiKey(event.target.value)}
          />

          <input
            className="rounded-lg bg-gray-800 p-3 text-white"
            placeholder="Paper Secret Key"
            type="password"
            value={secretKey}
            onChange={(event) => setSecretKey(event.target.value)}
          />

          <button
            onClick={connectPaperAccount}
            className="rounded-lg bg-green-600 px-6 py-3 font-bold hover:bg-green-500"
          >
            Simulate Paper Connection
          </button>
        </div>
      </div>

      <div className="mt-8 grid gap-4 md:grid-cols-3">
        <div className="rounded-xl bg-gray-900 p-6">
          <p className="text-gray-400">Paper Buying Power</p>
          <h2 className="mt-2 text-3xl font-bold">
            {connected ? "$100,000" : "$0"}
          </h2>
        </div>

        <div className="rounded-xl bg-gray-900 p-6">
          <p className="text-gray-400">Open Paper Positions</p>
          <h2 className="mt-2 text-3xl font-bold">
            {connected ? "0" : "N/A"}
          </h2>
        </div>

        <div className="rounded-xl bg-gray-900 p-6">
          <p className="text-gray-400">Paper Orders</p>
          <h2 className="mt-2 text-3xl font-bold">
            {connected ? "Ready" : "Disabled"}
          </h2>
        </div>
      </div>

      <div className="mt-8 rounded-xl border border-yellow-700 bg-yellow-950 p-6">
        <h2 className="text-2xl font-bold text-yellow-400">
          Security Warning
        </h2>

        <p className="mt-4 text-gray-300">
          Do not store real broker secret keys directly in frontend code. Later,
          we will use a backend API route and environment variables so keys are
          not exposed in the browser.
        </p>
      </div>

      <div className="mt-8 rounded-xl bg-gray-900 p-6">
        <h2 className="text-2xl font-bold">Next Build Step</h2>

        <p className="mt-4 text-gray-300">
          After this placeholder works, the next real upgrade is creating a
          secure backend route like <span className="font-bold">/api/alpaca</span>{" "}
          that talks to Alpaca paper trading without exposing your secret key.
        </p>
      </div>
    </main>
  );
}