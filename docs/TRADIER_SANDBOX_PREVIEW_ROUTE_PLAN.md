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

## Next Research Checkpoint — Official Tradier Sandbox Order Flow

Status: RESEARCH / DESIGN ONLY  
Implementation: NOT ENABLED  
Broker submission: DISABLED  
Live trading: DISABLED  

Official Tradier API notes:
- Tradier supports separate production and sandbox environments.
- Sandbox uses the sandbox Tradier host and is intended for paper trading/testing.
- Order previews should be used before placing orders.
- Our current app route `/api/tradier/orders/preview` is internal validation only and does not call Tradier.
- Our future broker preview route must be separate from the future sandbox submit route.

Planned separation:

```txt
/api/tradier/orders/preview

## Completed Checkpoint — Blocked-Only Sandbox Broker Preview Route

Status: COMPLETE  
Route: POST /api/tradier/orders/sandbox-broker-preview  
Mode: sandbox_broker_preview_blocked_only  

Verified:
- Route exists and compiles
- Route reads paper_order_previews
- Route runs broker-preview safety gates
- Valid REVIEWED_ONLY + ready_for_sandbox_preview preview still returns BLOCKED
- External Tradier sandbox preview endpoint is not called
- Tradier order endpoint is not called
- Live Tradier endpoint is not called
- No Supabase writes are performed
- approved_for_order remains false
- approved_for_sandbox_order remains false
- approved_for_live_order remains false
- submitted_to_broker remains false

Current behavior:
- Even when all safety gates pass, the route returns:
  “Tradier sandbox broker preview route is not enabled yet. Safety gates passed, but external broker preview calls remain locked in v1.”

Purpose:
- This creates a safe future path for official Tradier sandbox broker preview without enabling external broker calls yet.

Next planned step:
- Add a locked broker-preview indicator to PaperOrderPreviewDetailModal.
- Do not add an active broker-preview button yet.
- Do not call Tradier’s preview endpoint yet.

## Completed Checkpoint — Locked Broker Preview UI Indicator

Status: COMPLETE

Verified:
- PaperOrderPreviewDetailModal displays the future Tradier broker-preview route
- The UI clearly labels the route as BLOCKED ONLY
- Tradier Preview Call shows DISABLED
- Tradier Order Call shows DISABLED
- Live Endpoint shows DISABLED
- DB Writes shows DISABLED
- No active broker-preview button exists
- Dashboard remains internal-validation-only
- No external Tradier preview endpoint is called
- No Tradier order endpoint is called
- No Supabase writes are performed from the locked UI section

Current dashboard behavior:
- Users can validate the internal sandbox preview payload
- Users cannot call Tradier’s broker preview endpoint
- Users cannot submit a sandbox order
- Users cannot submit a live order

Next planned step:
- Review official Tradier preview endpoint payload requirements
- Design the future broker-preview request payload
- Do not enable external broker-preview calls until the next safety review is complete

## Planned Tradier Sandbox Broker Preview Payload

Status: DESIGN ONLY  
Implementation: NOT ENABLED  
External Tradier call: DISABLED  
Order submission: DISABLED  
Live trading: DISABLED  

Future route:

```txt
POST /api/tradier/orders/sandbox-broker-preview

## Completed Checkpoint — Locked Broker Preview Payload Builder

Status: COMPLETE  
Route: POST /api/tradier/orders/sandbox-broker-preview  
Mode: sandbox_broker_preview_blocked_only  

Verified:
- Safety gates pass for REVIEWED_ONLY + ready_for_sandbox_preview previews
- Tradier sandbox preview payload is built correctly
- Payload maps internal DB fields into Tradier-style fields
- order_side is lowercased
- order_type is lowercased
- time_in_force is lowercased
- contract_symbol maps to option_symbol
- estimated_limit_price maps to price
- External Tradier preview endpoint is not called
- Tradier order endpoint is not called
- Live endpoint is not called
- No Supabase writes are performed
- Safety locks remain false

Tested payload example:
```txt
class=option
symbol=AAPL
option_symbol=AAPL260610P00287500
side=buy_to_open
quantity=1
type=limit
duration=day
price=0.885

## Completed Checkpoint — Locked Broker Preview Payload Display

Status: COMPLETE

Verified:
- PaperOrderPreviewDetailModal displays a locked broker-preview payload
- Payload display maps:
  - contract_symbol → option_symbol
  - order_side → lowercase side
  - order_type → lowercase type
  - time_in_force → lowercase duration
  - estimated_limit_price → price
- Display is informational only
- No active broker-preview button exists
- No Tradier preview endpoint is called
- No Tradier order endpoint is called
- No Supabase writes are performed
- Dashboard remains internal-validation-only

Displayed example:
```txt
class=option
symbol=AAPL
option_symbol=AAPL260610P00287500
side=buy_to_open
quantity=1
type=limit
duration=day
price=0.885

## Completed Checkpoint — Disabled Broker Preview Locked Button

Status: COMPLETE

Verified:
- PaperOrderPreviewDetailModal displays a disabled “Broker Preview Locked” button
- Button is intentionally disabled
- Button does not call the blocked-only route
- Button does not call Tradier
- Button does not write to Supabase
- UI clearly communicates broker-preview is not enabled yet
- Dashboard remains internal-validation-only

Current behavior:
- Users can validate internal sandbox preview payloads
- Users can view the locked future broker-preview payload
- Users cannot call Tradier broker preview
- Users cannot submit sandbox orders
- Users cannot submit live orders

Next planned step:
- Add a safe clickable “Test Broker Preview Lock” button only if we want UI testing for the blocked-only route
- External Tradier calls remain disabled

## Completed Checkpoint — Broker Preview Lock Test Button

Status: COMPLETE

Verified:
- PaperOrderPreviewDetailModal includes a clickable “Test Broker Preview Lock” button
- Button calls only `/api/tradier/orders/sandbox-broker-preview`
- Route remains `sandbox_broker_preview_blocked_only`
- Response returns BLOCKED
- Tradier preview endpoint is not called
- Tradier order endpoint is not called
- Live endpoint is not called
- No Supabase writes are performed
- Safety locks remain false
- Returned locked payload displays in the modal

Current dashboard behavior:
- Users can validate the internal sandbox preview payload
- Users can test that the broker-preview route is locked
- Users can view the future Tradier broker-preview payload
- Users cannot call Tradier’s external preview endpoint
- Users cannot submit sandbox orders
- Users cannot submit live orders

Next planned step:
- Review environment variables required for future Tradier sandbox broker-preview calls
- Add an env readiness route/check before enabling any external broker call
- External Tradier calls remain disabled