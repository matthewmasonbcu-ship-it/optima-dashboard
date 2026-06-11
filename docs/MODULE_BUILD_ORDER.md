# Module Build Order

## Current Stable Foundation

The existing AutoTrader dashboard is the working foundation. Do not rewrite it all at once.

Confirmed working:

* App loads
* Supabase saves paper trades
* Option trade details save
* Tradier sandbox routes work
* Option chain loads
* Risk Guard works
* Contract Quality saves
* Pre-Trade Checklist works
* Paper Trade Tracker works
* Approval Queue foundation works
* Approval decisions save to Supabase
* Approval history displays in dashboard
* Phone alert events log to Supabase as `LOGGED_ONLY`
* Phone Alert Event History displays in dashboard
* Paper order previews are created from approved alerts
* Paper Order Preview History displays in dashboard
* Paper previews can be marked `REVIEWED_ONLY`
* Paper previews can be cancelled
* Paper previews can be marked `ready_for_sandbox_preview`
* No broker order submission exists yet

## Current Safety Status

Current execution locks:

* No real orders
* No live trading
* No Tradier sandbox order submission yet
* `approved_for_order = false`
* `approved_for_sandbox_order = false`
* `approved_for_live_order = false`
* `submitted_to_broker = false`
* `preview_status` only goes `PREVIEW_ONLY`, `REVIEWED_ONLY`, or `CANCELLED`

## Build Order

### 1. AutoTrader Stabilization

Goal: keep the current options day-trade lane clean and reliable.

Includes:

* Tradier option chain
* Contract grading
* Risk Guard
* Pre-Trade Checklist
* Paper trade save
* Option analytics
* Paper Trade Tracker
* Auto Position Monitor
* Clean Supabase audit trail

Status: mostly working foundation.

### 2. Alert / Approval Foundation

Goal: create dashboard approval first, then phone alerts later.

Includes:

* Trade alert types
* Approval status
* Alert history
* Dashboard approval panel
* Approval decisions saved to Supabase
* Phone alert events logged as `LOGGED_ONLY`
* Paper order previews created from approved alerts
* Paper previews can be marked `REVIEWED_ONLY`
* Paper previews can be cancelled
* Locked `ready_for_sandbox_preview` bridge state
* No broker order submission
* Later SMS/push/email

Status: active current module.

### 3. Paper Preview Detail Layer

Goal: make every preview easy to inspect before any broker connection exists.

Includes:

* Paper preview detail modal
* Contract details
* Risk Guard details
* Estimated cost
* Estimated max loss
* Spread/liquidity notes
* Contract quality notes
* Safety flags
* Preview audit trail

Status: next possible UI upgrade.

### 4. Tradier Sandbox Preview Route

Goal: create a route that can format and validate a future Tradier sandbox order preview without submitting it.

Includes:

* API route for sandbox preview validation
* No order placement
* No broker submission
* No live route
* Only accepts previews marked `ready_for_sandbox_preview`
* Must force `submitted_to_broker = false`
* Must force `approved_for_sandbox_order = false`
* Must return preview-only payload

Status: planned after locked readiness state is proven.

### 5. Tradier Sandbox Order Submission

Goal: submit sandbox orders only after separate safety approval.

Includes:

* Separate sandbox approval flag
* Separate sandbox submit button
* Broker route isolated from live trading
* Hard environment checks
* Hard account mode checks
* Full order response audit trail
* Emergency disable switch

Status: future only.

### 6. Swing Trade Lane

Goal: multi-day work-compatible setups.

Includes:

* Trend scanner
* Market condition filter
* Catalyst/news notes
* Earnings danger filter
* Longer DTE preference
* Separate swing stats

Status: future module.

### 7. Position Trade Lane

Goal: multi-week/month stock and theme trades.

Includes:

* Theme tracker
* Buy zones
* Thesis tracking
* Stop/invalidated thesis
* Trim zones

Status: future module.

### 8. Personal Trader Mode

Goal: own-account trading with strict size/risk controls.

Includes:

* Small-size real trade planning
* Manual approval
* Separate personal-account stats
* Strict max risk per trade
* No automatic live trading

Status: future module.

### 9. Wealth Builder

Goal: long-term investing plan.

Includes:

* ETFs
* Roth/brokerage tracking
* Pullback buy alerts
* Allocation targets

Status: future module.

### 10. Cash Defense

Goal: protect real-life money.

Includes:

* Bills
* Emergency fund
* Debt
* Monthly cash safety score

Status: future module.

### 11. Net Worth Tracker

Goal: scoreboard for the empire.

Includes:

* Cash
* Investments
* Trading accounts
* Debt
* Monthly net worth change

Status: future module.

### 12. Funded Account Mode

Goal: protect against challenge failure.

Includes:

* Daily loss limit
* Max drawdown
* Max trades per day
* Lockout after loss
* No major-news trading
* Only highest-quality setups
* Phone approval workflow
* No revenge trading
* No low-grade setups

Status: future high-priority module before funded-account attempts.

### 13. Broker Execution Lanes

Goal: execution only after proof.

Includes:

* Tradier sandbox preview route first, with no submission
* Tradier sandbox order submission only after separate safety approval
* Robinhood Agentic stock-only future lane
* Funded/copy-trading route later
* Live trading disabled until paper proof

Status: future only.

## Build Discipline Rule

Every module must be built separately, tested separately, and committed separately.

Do not rewrite the whole app at once.

Do not connect broker execution until:

* Paper workflow is stable
* Approval workflow is stable
* Sandbox preview workflow is stable
* Safety flags are proven
* User has months of paper data
* Risk Guard blocks bad trades correctly

## Next Build Module — Funded Account Safety Filter v1

Status: NEXT

Purpose:
Prevent low-quality alerts from reaching the order-preview workflow.

This module should filter alerts before they become paper order previews.

Required checks:
- Risk Guard must be APPROVED
- Contract Quality must be A+, A, or B
- Max risk must be <= 100
- Setup must not be chop / low-conviction
- Contract spread must be acceptable
- Contract bid and ask must exist
- Contract mid must exist
- Quantity must be 1 for v1
- Estimated limit price must be > 0
- Trade must have setup_name
- Trade must have symbol
- Trade must have contract_symbol
- Trade must have order_side
- Trade must have order_type
- Trade must have time_in_force

Blocked examples:
- C / BLOCKED / UNKNOWN contract quality
- Risk Guard BLOCKED or CAUTION
- Max risk > 100
- Missing contract symbol
- Missing setup name
- Missing pricing
- Wide spread
- Quantity above 1
- Choppy setup

Output:
- status: PASSED or BLOCKED
- score: 0-100
- reasons: string[]
- warnings: string[]

Safety rule:
This module does not submit orders.
This module does not call Tradier.
This module does not write broker fields.
This module only decides whether an alert/order preview candidate is high quality enough to continue.