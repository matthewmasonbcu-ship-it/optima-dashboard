export default function Home() {
  return (
    <main className="min-h-screen bg-black text-white p-8">
      <section className="mx-auto max-w-6xl">
        <div className="rounded-3xl bg-gray-950 p-8">
          <p className="font-bold text-green-400">OPTIMA TRADING SYSTEM</p>

          <h1 className="mt-3 text-5xl font-bold">
            Your AI Trading Dashboard
          </h1>

          <p className="mt-4 max-w-3xl text-gray-300">
            Build, test, and track your trading system before risking real
            money. Use paper trading, wheel strategy simulation, growth
            projections, prop firm tracking, AI coaching, Alpaca paper
            connection, and your roadmap checklist to stay disciplined.
          </p>

          <div className="mt-8 grid gap-4 md:grid-cols-4">
            <div className="rounded-2xl bg-gray-900 p-5">
              <p className="text-gray-400">Status</p>
              <h2 className="mt-2 text-2xl font-bold text-green-400">
                Building
              </h2>
            </div>

            <div className="rounded-2xl bg-gray-900 p-5">
              <p className="text-gray-400">Mode</p>
              <h2 className="mt-2 text-2xl font-bold">Paper Only</h2>
            </div>

            <div className="rounded-2xl bg-gray-900 p-5">
              <p className="text-gray-400">Risk Level</p>
              <h2 className="mt-2 text-2xl font-bold text-yellow-400">
                Safe
              </h2>
            </div>

            <div className="rounded-2xl bg-gray-900 p-5">
              <p className="text-gray-400">Real Money</p>
              <h2 className="mt-2 text-2xl font-bold text-red-400">
                Not Connected
              </h2>
            </div>
          </div>
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <a
            href="/roadmap"
            className="block rounded-2xl bg-gray-900 p-6 hover:bg-gray-800"
          >
            <h2 className="text-2xl font-bold">Roadmap</h2>
            <p className="mt-2 text-gray-400">
              Track your OPTIMA build progress.
            </p>
            <p className="mt-4 font-bold text-blue-400">Open Roadmap →</p>
          </a>

          <a
            href="/paper-trading"
            className="block rounded-2xl bg-gray-900 p-6 hover:bg-gray-800"
          >
            <h2 className="text-2xl font-bold">Paper Trading</h2>
            <p className="mt-2 text-gray-400">
              Practice buying and selling with fake money.
            </p>
            <p className="mt-4 font-bold text-blue-400">
              Open Paper Trading →
            </p>
          </a>

          <a
            href="/wheel-bot"
            className="block rounded-2xl bg-gray-900 p-6 hover:bg-gray-800"
          >
            <h2 className="text-2xl font-bold">Wheel Bot</h2>
            <p className="mt-2 text-gray-400">
              Simulate cash-secured puts and collateral risk.
            </p>
            <p className="mt-4 font-bold text-blue-400">Open Wheel Bot →</p>
          </a>

          <a
            href="/growth"
            className="block rounded-2xl bg-gray-900 p-6 hover:bg-gray-800"
          >
            <h2 className="text-2xl font-bold">Growth Calculator</h2>
            <p className="mt-2 text-gray-400">
              Project possible account growth over time.
            </p>
            <p className="mt-4 font-bold text-blue-400">
              Open Growth Calculator →
            </p>
          </a>

          <a
            href="/prop-firm"
            className="block rounded-2xl bg-gray-900 p-6 hover:bg-gray-800"
          >
            <h2 className="text-2xl font-bold">Prop Firm Tracker</h2>
            <p className="mt-2 text-gray-400">
              Track evaluations, targets, and drawdown risk.
            </p>
            <p className="mt-4 font-bold text-blue-400">
              Open Prop Firm Tracker →
            </p>
          </a>

          <a
            href="/ai-coach"
            className="block rounded-2xl bg-gray-900 p-6 hover:bg-gray-800"
          >
            <h2 className="text-2xl font-bold">AI Coach</h2>
            <p className="mt-2 text-gray-400">
              Ask strategy, risk, and discipline questions.
            </p>
            <p className="mt-4 font-bold text-blue-400">Open AI Coach →</p>
          </a>

          <a
            href="/alpaca"
            className="block rounded-2xl bg-gray-900 p-6 hover:bg-gray-800"
          >
            <h2 className="text-2xl font-bold">Alpaca</h2>
            <p className="mt-2 text-gray-400">
              Simulate a safe paper broker connection.
            </p>
            <p className="mt-4 font-bold text-blue-400">Open Alpaca →</p>
          </a>
        </div>

        <div className="mt-8 rounded-2xl bg-gray-900 p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold">Build Progress</h2>
            <p className="font-bold text-green-400">7 Core Pages Built</p>
          </div>

          <div className="mt-4 h-4 rounded-full bg-gray-700">
            <div className="h-4 w-5/6 rounded-full bg-green-500"></div>
          </div>

          <p className="mt-3 text-gray-400">
            Current features: Roadmap, Paper Trading, Wheel Bot, Growth
            Calculator, Prop Firm Tracker, AI Coach, and Alpaca Paper
            Connection. Next upgrades: Moonshot Scanner, settings, database
            storage, and deployment.
          </p>
        </div>

        <div className="mt-8 rounded-2xl border border-yellow-700 bg-yellow-950 p-6">
          <h2 className="text-2xl font-bold text-yellow-400">
            Important Trading Rule
          </h2>

          <p className="mt-3 text-gray-300">
            Keep this system in paper mode until your strategy, risk rules, and
            review process are consistent. This dashboard is a simulator right
            now, not a real-money trading bot.
          </p>
        </div>
      </section>
    </main>
  );
}