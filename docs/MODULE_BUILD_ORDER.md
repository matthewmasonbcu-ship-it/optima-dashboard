\# Module Build Order



\## Current Stable Foundation



The existing AutoTrader dashboard is the working foundation. Do not rewrite it all at once.



Confirmed working:

\- App loads

\- Supabase saves paper trades

\- Option trade details save

\- Tradier sandbox routes work

\- Option chain loads

\- Risk Guard works

\- Contract Quality saves

\- Paper Trade Tracker works



\## Build Order



\### 1. AutoTrader Stabilization

Goal: keep the current options day-trade lane clean and reliable.



Includes:

\- Tradier option chain

\- Contract grading

\- Risk Guard

\- Pre-Trade Checklist

\- Paper trade save

\- Option analytics



\### 2. Alert / Approval Foundation

Goal: create dashboard approval first, then phone alerts later.



Includes:

\- Trade alert types

\- Approval status

\- Alert history

\- Dashboard approval panel

\- Later SMS/push/email



\### 3. Swing Trade Lane

Goal: multi-day work-compatible setups.



Includes:

\- Trend scanner

\- Market condition filter

\- Catalyst/news notes

\- Earnings danger filter

\- Longer DTE preference

\- Separate swing stats



\### 4. Position Trade Lane

Goal: multi-week/month stock and theme trades.



Includes:

\- Theme tracker

\- Buy zones

\- Thesis tracking

\- Stop/invalidated thesis

\- Trim zones



\### 5. Personal Trader Mode

Goal: own-account trading with strict size/risk controls.



Includes:

\- Small-size real trade planning

\- Manual approval

\- Separate personal-account stats



\### 6. Wealth Builder

Goal: long-term investing plan.



Includes:

\- ETFs

\- Roth/brokerage tracking

\- Pullback buy alerts

\- Allocation targets



\### 7. Cash Defense

Goal: protect real-life money.



Includes:

\- Bills

\- Emergency fund

\- Debt

\- Monthly cash safety score



\### 8. Net Worth Tracker

Goal: scoreboard for the empire.



Includes:

\- Cash

\- Investments

\- Trading accounts

\- Debt

\- Monthly net worth change



\### 9. Funded Account Mode

Goal: protect against challenge failure.



Includes:

\- Daily loss limit

\- Max drawdown

\- Max trades per day

\- Lockout after loss

\- No major-news trading

\- Only highest-quality setups



\### 10. Broker Execution Lanes

Goal: execution only after proof.



Includes:

\- Tradier sandbox orders first

\- Robinhood Agentic stock-only future lane

\- Funded/copy-trading route later

\- Live trading disabled until paper proof

