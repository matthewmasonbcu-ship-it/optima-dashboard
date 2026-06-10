# Phone Alert Safety Plan

## Purpose

Phone alerts are meant to let the user review high-quality trade setups while away from the computer.

Phone alerts do not place live trades.

The first version should only notify the user that a setup is ready for review inside the dashboard.

## Current Safety Rule

No broker order can be placed from an alert approval.

Approval decisions are saved with:

```txt
approved_for_order = false
```

This must remain false until a separate order-preview layer is built and tested.

## Alert Eligibility Rules

A trade setup can only generate a phone alert if all of these are true:

1. Risk Guard status is APPROVED
2. Contract Quality is A+, A, or B
3. Pre-Trade Checklist is READY
4. Max risk is below the configured per-trade limit
5. Market condition is not CHOPPY
6. No duplicate alert is already pending for the same symbol and direction
7. Spread is acceptable
8. Volume and open interest are acceptable
9. Time of day is allowed
10. Daily trade limit has not been reached
11. Daily max loss limit has not been reached

## Alert Channels

Version 1:

* Dashboard only

Version 2:

* Dashboard + phone notification

Version 3:

* Dashboard + phone notification + approval link

Version 4:

* Dashboard + phone notification + paper order preview

## Required Data Saved Per Alert

Each alert should save:

* symbol
* trade lane
* setup name
* direction
* contract symbol
* strike
* expiration
* option type
* bid
* ask
* mid
* contract quality
* risk guard status
* risk guard reason
* max risk dollars
* alert channel
* alert status
* created timestamp
* decision timestamp
* user decision

## Hard Safety Locks

Phone alerts must never bypass:

* Risk Guard
* Contract Quality
* Pre-Trade Checklist
* Max risk limits
* Daily loss limits
* Duplicate trade protection
* Emergency kill switch
* Manual approval requirement

## Future Execution Levels

Level 1:
Dashboard approval only.

Level 2:
Phone notification only.

Level 3:
Phone approval records user decision.

Level 4:
Approved alert creates paper order preview.

Level 5:
Approved alert can submit Tradier sandbox paper order.

Level 6:
A+ setups can auto-paper-trade with strict limits.

Level 7:
Live trading considered only after months of clean paper performance.

## Current Decision

The project should continue with approval alerts and audit history first.

Automated execution should not be added until the safety layers are tested and proven.
