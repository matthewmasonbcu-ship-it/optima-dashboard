# Tradier Sandbox Preview Route Plan

## Purpose

This document defines the next safe bridge between paper order previews and future Tradier sandbox order testing.

The goal is to create a **preview/validation route only**.

This route must never submit an order.

## Core Rule

The route may format and validate a Tradier-style order payload, but it must not call a Tradier order endpoint.

The route is only allowed to answer this question:

```txt
If this reviewed paper preview were later submitted to Tradier sandbox,
what would the order payload look like, and does it pass safety validation?
```

## Planned Route

```txt
POST /api/tradier/orders/preview
```

## Request Body

```json
{
  "paper_order_preview_id": "uuid"
}
```

## Required Database Source

The route reads from:

```txt
paper_order_previews
```

It should use `paper_order_preview_id` to load the selected preview row.

## Required Safety Checks

The route must block unless all checks pass.

Required preview state:

* Preview exists
* `preview_status = REVIEWED_ONLY`
* `ready_for_sandbox_preview = true`
* `approved_for_sandbox_order = false`
* `approved_for_live_order = false`
* `submitted_to_broker = false`

Required broker/order fields:

* `broker` is `tradier` or `TRADIER`
* `contract_symbol` exists
* `estimated_limit_price` exists
* `quantity > 0`
* `order_side` exists
* `order_type` exists
* `time_in_force` exists

Required safety/risk fields:

* `risk_guard_status = APPROVED`
* `contract_quality` is `A+`, `A`, or `B`
* `max_risk_dollars` exists
* `max_risk_dollars <= 100`

## Hard Blocks

The route must return blocked if:

* Preview is missing
* Preview is not `REVIEWED_ONLY`
* Preview is not marked `ready_for_sandbox_preview`
* `approved_for_sandbox_order = true`
* `approved_for_live_order = true`
* `submitted_to_broker = true`
* Contract symbol is missing
* Estimated limit price is missing
* Quantity is missing or less than/equal to 0
* Risk Guard is not `APPROVED`
* Contract Quality is not `A+`, `A`, or `B`
* Max risk is greater than `$100`
* Broker is not Tradier

## Expected Success Response

A successful response should look like:

```json
{
  "success": true,
  "route": "/api/tradier/orders/preview",
  "mode": "SANDBOX_PREVIEW_ONLY",
  "message": "Tradier sandbox preview payload formatted. No broker order submitted.",
  "submitted_to_broker": false,
  "approved_for_sandbox_order": false,
  "approved_for_live_order": false,
  "validation_status": "PASSED",
  "preview": {
    "paper_order_preview_id": "uuid",
    "symbol": "NVDA",
    "contract_symbol": "NVDA260117C00100000",
    "side": "buy_to_open",
    "order_type": "limit",
    "quantity": 1,
    "duration": "day",
    "price": 1.25,
    "estimated_order_cost": 125,
    "max_risk_dollars": 100,
    "contract_quality": "A",
    "risk_guard_status": "APPROVED"
  },
  "tradier_style_payload": {
    "class": "option",
    "symbol": "NVDA",
    "option_symbol": "NVDA260117C00100000",
    "side": "buy_to_open",
    "quantity": 1,
    "type": "limit",
    "duration": "day",
    "price": 1.25
  },
  "safety_locks": {
    "broker_order_endpoint_called": false,
    "submitted_to_broker": false,
    "approved_for_sandbox_order": false,
    "approved_for_live_order": false,
    "live_trading_enabled": false
  }
}
```

## Expected Blocked Response

A blocked response should look like:

```json
{
  "success": false,
  "route": "/api/tradier/orders/preview",
  "mode": "SANDBOX_PREVIEW_ONLY",
  "message": "Sandbox preview blocked by safety checks.",
  "submitted_to_broker": false,
  "approved_for_sandbox_order": false,
  "approved_for_live_order": false,
  "validation_status": "BLOCKED",
  "blocked_reasons": [
    "Preview must be REVIEWED_ONLY.",
    "Preview must be marked ready_for_sandbox_preview.",
    "Risk Guard must be APPROVED."
  ],
  "safety_locks": {
    "broker_order_endpoint_called": false,
    "submitted_to_broker": false,
    "approved_for_sandbox_order": false,
    "approved_for_live_order": false,
    "live_trading_enabled": false
  }
}
```

## Route Must Never Do These Things

The route must never:

* Submit an order to Tradier
* Call a Tradier order endpoint
* Change `submitted_to_broker` to `true`
* Change `approved_for_sandbox_order` to `true`
* Change `approved_for_live_order` to `true`
* Connect to live trading
* Use a live Tradier account
* Place, modify, cancel, or replace any broker order

## Database Write Rules

For the first version, the safest option is:

```txt
No database writes.
```

The route should only:

* Read the preview row
* Validate safety checks
* Return a formatted preview response

A later version may add a separate audit table, but not yet.

## Future Audit Table Idea

Later, we may create:

```txt
tradier_sandbox_preview_logs
```

Possible columns:

* `id`
* `created_at`
* `paper_order_preview_id`
* `validation_status`
* `blocked_reasons`
* `tradier_style_payload`
* `submitted_to_broker`
* `approved_for_sandbox_order`
* `approved_for_live_order`
* `safety_message`

For now, this is not required.

## UI Integration Plan

After the route exists, the dashboard can add a button inside the paper preview detail modal:

```txt
Validate Sandbox Preview
```

Button should only be enabled when:

* `preview_status = REVIEWED_ONLY`
* `ready_for_sandbox_preview = true`
* `approved_for_sandbox_order = false`
* `approved_for_live_order = false`
* `submitted_to_broker = false`

Button should show:

* Validation passed/blocked
* Tradier-style payload
* Safety locks
* No broker order submitted

## Build Order

1. Create this route plan document
2. Commit the doc
3. Create `/api/tradier/orders/preview`
4. Test route manually with a ready paper preview
5. Confirm route never calls Tradier order endpoint
6. Confirm route never changes broker submission flags
7. Add UI button later inside `PaperOrderPreviewDetailModal`

## Final Safety Rule

This route is a **sandbox preview validator**, not a sandbox order submitter.

The only acceptable broker submission state after this route runs is:

```txt
submitted_to_broker = false
approved_for_sandbox_order = false
approved_for_live_order = false
```

If that ever changes, the route is unsafe.

## Completed Checkpoint — Sandbox Preview Validation UI

Status: COMPLETE

Verified:
- POST /api/tradier/orders/preview compiles and runs
- PREVIEW_ONLY previews return BLOCKED
- CANCELLED previews return BLOCKED
- REVIEWED_ONLY + ready_for_sandbox_preview previews return PASSED
- The route returns a Tradier-style option payload
- The route does not call Tradier
- The route does not write to Supabase
- The route does not approve sandbox orders
- The route does not approve live orders
- The route does not set submitted_to_broker
- PaperOrderPreviewDetailModal includes a Validate Sandbox Preview button
- The modal displays PASSED/BLOCKED results
- The modal confirms safety locks remain false

Current safety state:
- approved_for_order = false
- approved_for_sandbox_order = false
- approved_for_live_order = false
- submitted_to_broker = false

Next locked bridge step:
- Design the future Tradier sandbox order submission route
- Do not implement submission until safety plan is reviewed
- Keep validation-only route separate from submission route