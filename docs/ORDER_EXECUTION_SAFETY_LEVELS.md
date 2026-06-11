# Order Execution Safety Levels

## Purpose

This document defines the safe path from trade alerts to possible order execution.

The goal is to prevent one dangerous mistake:

```txt
Approve Alert
→ Accidentally Place Real Order
```

The system must never allow that.

## Core Execution Rule

Approval inside the dashboard is not the same thing as order approval.

A user can approve an alert for tracking/review, but that does not mean an order can be submitted.

Current hard rule:

```txt
approved_for_order = false
approved_for_sandbox_order = false
approved_for_live_order = false
submitted_to_broker = false
```

## Current Checkpoint: Locked Sandbox Preview Readiness

The current app supports a locked bridge state before any broker route is allowed.

Current preview flow:

```txt
APPROVED alert
→ Paper order preview created
→ PREVIEW_ONLY
→ REVIEWED_ONLY
→ ready_for_sandbox_preview = true
```

This is still not a broker order.

Hard safety locks:

* `approved_for_order = false`
* `approved_for_sandbox_order = false`
* `approved_for_live_order = false`
* `submitted_to_broker = false`
* No Tradier sandbox order route is called
* No live order route exists
* Cancelled previews remove sandbox-readiness

The purpose of `ready_for_sandbox_preview` is only to prepare the database and UI for a future Tradier sandbox preview route.

## Level 0 — Scanner Alert Only

The scanner finds a possible setup.

Allowed:

* Display setup in dashboard
* Show symbol, direction, contract idea, and quality notes
* Run Risk Guard
* Run Contract Quality
* Create approval alert only if gates pass

Not allowed:

* No order preview
* No broker call
* No sandbox order
* No live order

Safety gates before an approval alert enters the queue:

* Risk Guard must be `APPROVED`
* Contract Quality must be `A+`, `A`, or `B`
* Max Risk must be ≤ `$100`
* Duplicate pending alerts are blocked

## Level 1 — Dashboard Approval Alert

A valid setup enters the approval queue.

Allowed:

* User can review the alert
* User can approve/reject the alert
* Approval decision saves to Supabase
* Approval history displays in dashboard
* Phone alert event can be logged as `LOGGED_ONLY`

Not allowed:

* Approval does not place an order
* Approval does not submit to Tradier
* Approval does not set live trading flags
* Approval does not bypass Risk Guard

Required safety values:

* `approved_for_order = false`
* `approved_for_sandbox_order = false`
* `approved_for_live_order = false`
* `submitted_to_broker = false`

## Level 2 — Phone Alert Event Logging

The system logs a phone-alert-style event.

Current status:

* Logged to Supabase only
* No SMS
* No push notification
* No email
* No broker submission

Allowed:

* Save alert event to `phone_alert_events`
* Display phone alert event history
* Mark `delivery_status = LOGGED_ONLY`

Not allowed:

* No actual phone notification yet
* No order submission
* No sandbox order
* No live order

## Level 3 — Paper Order Preview

An approved alert can create a paper order preview.

Allowed:

* Create a row in `paper_order_previews`
* Store contract, estimated limit price, quantity, estimated cost, max risk, broker, order side, order type, and time in force
* Display Paper Order Preview History
* Mark preview as `PREVIEW_ONLY`
* Mark preview as `REVIEWED_ONLY`
* Cancel preview

Not allowed:

* No Tradier order submission
* No sandbox order submission
* No live order submission
* No broker API order route

Required safety values:

* `preview_status = PREVIEW_ONLY`, `REVIEWED_ONLY`, or `CANCELLED`
* `approved_for_sandbox_order = false`
* `approved_for_live_order = false`
* `submitted_to_broker = false`

## Level 4 — Locked Sandbox Preview Readiness

A reviewed paper preview can be marked ready for a future sandbox preview route.

Allowed:

* Set `ready_for_sandbox_preview = true`
* Set `ready_for_sandbox_preview_at`
* Set `sandbox_preview_locked_reason`
* Keep all broker submission locks false
* Display `READY FOR SANDBOX PREVIEW`

Not allowed:

* No order submission
* No Tradier sandbox order
* No live order
* No `submitted_to_broker = true`
* No `approved_for_sandbox_order = true`
* No `approved_for_live_order = true`

Required conditions before readiness:

* `preview_status = REVIEWED_ONLY`
* `ready_for_sandbox_preview = false`
* `submitted_to_broker = false`
* `approved_for_sandbox_order = false`
* `approved_for_live_order = false`

Cancelled previews must remove sandbox-readiness:

* `ready_for_sandbox_preview = false`
* `ready_for_sandbox_preview_at = null`

## Level 5 — Future Tradier Sandbox Preview Route

This is future only.

Goal:

* Format and validate the order payload for Tradier sandbox without submitting the order.

Allowed:

* Read a preview marked `ready_for_sandbox_preview = true`
* Build a sandbox preview payload
* Validate symbol, option symbol, side, type, quantity, limit price, and account mode
* Return a preview-only response
* Save validation result

Not allowed:

* No Tradier order submission
* No order endpoint call
* No live account access
* No live order route

Required safety values after route:

* `approved_for_sandbox_order = false`
* `approved_for_live_order = false`
* `submitted_to_broker = false`

## Level 6 — Future Tradier Sandbox Order Submission

This is future only.

Goal:

* Submit sandbox orders only after separate approval and extended paper testing.

Allowed only after:

* Sandbox preview route works
* User explicitly approves sandbox submission
* Separate sandbox approval flag exists
* Environment confirms sandbox mode
* Broker confirms sandbox endpoint
* Risk Guard re-check passes
* Contract Quality re-check passes
* Max risk check passes

Required safety fields:

* `approved_for_sandbox_order = true`
* `approved_for_live_order = false`
* `submitted_to_broker` only changes after actual sandbox submission response

Not allowed:

* No live trading
* No live endpoint
* No automatic order submission
* No bypassing user approval

## Level 7 — Future Live Trading

This is future only and disabled until proven.

Live trading must remain disabled until:

* Months of paper trade data are reviewed
* Sandbox order workflow is stable
* Risk Guard proves it blocks bad trades
* Funded-account protection rules are built
* Emergency disable switch exists
* User manually enables live mode
* Live approval requires separate confirmation

Required live-trading rule:

* Live trading is not allowed by default.
* Live trading must never be connected accidentally through sandbox work.
* Live routes must be separate from sandbox routes.

## Emergency Safety Principles

The system should always prefer blocking a trade over allowing a risky one.

If data is missing:

```txt
BLOCK
```

If Risk Guard is unknown:

```txt
BLOCK
```

If Contract Quality is unknown:

```txt
BLOCK
```

If broker mode is unknown:

```txt
BLOCK
```

If approval state is unclear:

```txt
BLOCK
```

If submitted status is unclear:

```txt
BLOCK
```

## Final Rule

The safest path is:

```txt
Scanner
→ Risk Guard
→ Contract Grade
→ Dashboard Approval
→ Phone Alert Log
→ Paper Order Preview
→ User Review
→ Locked Sandbox Preview Readiness
→ Future Sandbox Preview Route
→ Future Sandbox Order Approval
→ Future Sandbox Order Submission
→ Much Later Live Trading
```

Never skip a level.

## Next Planned Level — Tradier Sandbox Submit Route

Status: PLANNING ONLY  
Implementation: NOT STARTED  
Live trading: DISABLED  
Real orders: DISABLED  

Planned route:

```txt
POST /api/tradier/orders/sandbox-submit

## Completed Checkpoint — Blocked-Only Sandbox Submit Skeleton

Status: COMPLETE  
Route: POST /api/tradier/orders/sandbox-submit  
Mode: sandbox_submit_blocked_only  

Verified:
- Route exists and compiles
- Route reads paper_order_previews
- Route runs sandbox submission safety gates
- Valid reviewed + ready preview still returns BLOCKED
- Cancelled preview returns BLOCKED
- No Tradier broker endpoint is called
- No Supabase writes are performed
- approved_for_order remains false
- approved_for_sandbox_order remains false
- approved_for_live_order remains false
- submitted_to_broker remains false

Current behavior:
- Even when all safety gates pass, the route returns:
  “Sandbox submission route is not enabled yet. Safety gates passed, but broker submission remains locked in v1.”

Purpose:
- This creates a safe future path for sandbox submission without enabling broker execution yet.

Next planned step:
- Add a disabled/locked UI indicator for future sandbox submission.
- Do not add an active submit button yet.
- Do not call Tradier order endpoint yet.

## Completed Checkpoint — Locked Sandbox Submit UI Indicator

Status: COMPLETE

Verified:
- PaperOrderPreviewDetailModal displays the future sandbox submit route
- The UI clearly labels the route as BLOCKED ONLY
- Broker Call shows DISABLED
- DB Writes shows DISABLED
- No active sandbox submit button exists
- Dashboard remains validation-only
- No Tradier broker order endpoint is called
- No Supabase writes are performed from the locked UI section

Current dashboard behavior:
- Users can validate a sandbox preview payload
- Users cannot submit a sandbox order
- Users cannot submit a live order

Next planned step:
- Review Tradier sandbox order endpoint requirements
- Design sandbox submit request payload
- Do not enable submission until the next safety review is complete

## Completed Checkpoint — Hardened Blocked-Only Sandbox Submit Route

Status: COMPLETE  
Route: POST /api/tradier/orders/sandbox-submit  
Mode: sandbox_submit_blocked_only  

Verified:
- Route accepts paper_order_preview_id
- Route reads paper_order_previews from Supabase as source of truth
- Route preserves response shape with success, route, mode, status, reason, safetyLocks, brokerCall, dbWrites, and preview summary
- Route runs all sandbox submit safety gates
- Valid reviewed + ready preview still returns BLOCKED
- Cancelled / preview-only previews return BLOCKED before final submit lock
- No Tradier preview endpoint is called
- No Tradier order endpoint is called
- Live endpoint is not called
- No Supabase writes are performed
- approved_for_order remains false
- approved_for_sandbox_order remains false
- approved_for_live_order remains false
- submitted_to_broker remains false

Current behavior:
- Even when all safety gates pass, the route returns:
  “Tradier sandbox submit route is not enabled yet. Safety gates passed, but sandbox order submission remains locked in v1.”

Shared helper refactor:
- Attempted but paused.
- Empty lib/tradierOrderSafety.ts was removed.
- Current routes remain explicit and working.