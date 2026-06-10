# Road to Funded Account / AutoTrader Master Software Roadmap

## Mission

Build a disciplined personal money operating system that starts with safe paper trading, grows into phone-approved trading, supports funded-account protection, and eventually connects AutoTrader, Swing Trades, Position Trades, Wealth Builder, Cash Defense, and Net Worth Tracking.

## Core Rule

The dashboard is the brain. Brokers are execution arms. Risk Guard controls everything.

## Current Stable Checkpoint

The current AutoTrader dashboard is stable and should not be rewritten all at once.

Confirmed working:

* Next.js + TypeScript dashboard loads
* Supabase paper trade save works
* Tradier sandbox option chain works
* Contract Quality saves correctly
* Risk Guard + Pre-Trade Checklist work
* Approval Queue foundation works
* Approval decisions save to Supabase
* Approval history displays in dashboard
* Phone alert events log to Supabase as `LOGGED_ONLY`
* Phone Alert Event History displays in dashboard
* Paper order previews are created from approved alerts
* Paper Order Preview History displays in dashboard
* Paper previews can be marked `REVIEWED_ONLY`
* Paper previews can be `CANCELLED`
* Paper previews can be marked `ready_for_sandbox_preview`
* Alert history, phone alert history, and paper preview history are split into separate components

## Current Safety Status

No real orders are allowed.

Current locks:

* No real orders
* No live trading
* No Tradier sandbox order submission yet
* `approved_for_order = false`
* `approved_for_sandbox_order = false`
* `approved_for_live_order = false`
* `submitted_to_broker = false`
* `preview_status` only goes `PREVIEW_ONLY`, `REVIEWED_ONLY`, or `CANCELLED`
* `ready_for_sandbox_preview` is only a locked bridge state
* Cancelled previews remove sandbox-readiness

## Locked Sandbox Preview Readiness

The app now supports a locked `ready_for_sandbox_preview` bridge state on `paper_order_previews`.

This does **not** submit an order to Tradier.

Current preview flow:

```txt
APPROVED alert
→ Paper order preview created
→ PREVIEW_ONLY
→ REVIEWED_ONLY
→ ready_for_sandbox_preview = true
```

Current safety rules:

* `preview_status` remains `PREVIEW_ONLY`, `REVIEWED_ONLY`, or `CANCELLED`
* A preview can only be marked ready after it is `REVIEWED_ONLY`
* `approved_for_sandbox_order` remains `false`
* `approved_for_live_order` remains `false`
* `submitted_to_broker` remains `false`
* Cancelled previews remove sandbox-readiness
* This state only prepares the UI/database for a future sandbox preview route

## Optimized App Architecture

### App Routes / Modes

Current working route should remain stable until migration is needed.

Future route structure:

```txt
/app
  /dashboard          → main layout shell and mode switcher
  /autotrader         → Options Day Trade Lane
  /swing-trade        → Swing Trade Lane
  /position-trade     → Position Trade Lane
  /personal-trader    → Personal account trading mode
  /wealth-builder     → Long-term investing and portfolio plan
  /net-worth          → Full wealth scoreboard
  /funded-account     → Funded account rules and challenge protection
```

### API Routes

```txt
/app/api
  /tradier            → existing Tradier sandbox/read-only routes
  /alerts             → future phone/push approval routes
  /paper-trades       → future paper trade CRUD helpers
  /live-trades        → future gated order routes, disabled until proven
```

### Component Groups

```txt
/components/core
  → Risk Guard, PreTradeChecklist, ContractGrader

/components/trade
  → OptionTradeTicket, OptionTradeCommandCenter, TradeTicketReview

/components/contract
  → OptionContractSelector, ContractGradeDisplay

/components/broker
  → BrokerStatusCard, BrokerConnectionMonitor

/components/paper
  → PaperTradeTracker, PaperTradeTable, PaperTradeChart

/components/analytics
  → OptionAnalytics, PLChart, GreeksDisplay

/components/alerts
  → AlertPanel, TradeApprovalCard, ApprovalHistoryPanel, PhoneAlertHistoryPanel, PaperOrderPreviewHistoryPanel

/components/ui
  → Shared buttons, badges, cards, modals
```

### Logic Libraries

```txt
/lib/risk
  → Risk scoring, trade blocking, funded rule checks

/lib/grader
  → Contract quality grading

/lib/analytics
  → P/L, win rate, option math, performance stats

/lib/brokers/tradier
  → Tradier API helpers

/lib/brokers/robinhood
  → Future only

/lib/alerts
  → Push/SMS/email approval wrappers

/lib/supabase
  → Supabase clients and typed query helpers
```

### Shared Types

```txt
/types/trades.ts
/types/contracts.ts
/types/risk.ts
/types/alerts.ts
/types/brokers.ts
/types/user.ts
```

### Hooks

```txt
/hooks/usePaperTrade.ts
/hooks/useRiskGuard.ts
/hooks/useContractGrade.ts
/hooks/useBrokerStatus.ts
/hooks/useAlerts.ts
/hooks/useOptionChain.ts
/hooks/useTradeApprovalAlerts.ts
```

### Constants

```txt
/constants/riskLimits.ts
/constants/gradeThresholds.ts
/constants/tradeDefaults.ts
```

## Safety Rule

The current working AutoTrader should not be rewritten all at once.

Every future module must be built separately, tested, and only connected after it works.

No broker execution route should be connected until the full preview, approval, safety-lock, and paper-proof workflow is verified over time.
