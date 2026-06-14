# OPTIMA Roadmap

## Phase 1 — Scanner + Grading ✅
- Market scanner identifying high-probability setups
- Strategy Engine grading trades A–D with BUY/HOLD/AVOID signals
- Paper trading engine with full audit trail
- Supabase persistence for all scans, trades, and decisions

## Phase 2 — Paper Trading Proof (Current)
- Run scanner and paper trade for sufficient history
- Minimum 30 trades across at least 6 weeks before Phase 4 is considered
- Minimum 30 credit spread paper trades before evaluation
- Prove win rate, risk/reward, and drawdown stay within targets
- Build performance scoreboard and analytics
- No real capital until this phase produces consistent results
- OPTIMA should produce a readiness score — fund when data says fund, not the calendar

## Phase 3 — Phone Approval Workflow (In Progress)
- Phone alerts for trade candidates requiring human approval
- Remote approve/reject from phone while at work
- Sandbox preview system for reviewing orders before submission
- Funded Account Safety Filter on every order

## Phase 4 — Funded Account Evaluation
- Paper trading record used to build confidence before evaluation
- Strict guardrails enforced at system level, not just UI
- Risk Guard locks preventing rule violations
- Single funded account evaluation attempt with proven strategy
- Target: 3-4 months from paper trading start if data supports it
- Target firm is Black Eagle Financial Group. Evaluation fee $150-500. Pass by hitting 8-10% profit target within drawdown limits.
- Note: Long term goal is Maverick Trading after proven funded track record

## Phase 5 — Multi-Account Management
- Scale to multiple funded accounts after first is proven
- Consistent process replicated across accounts
- Income tracking toward job replacement target

## Phase 6 — Wealth Building Integration
- Trading income redirected into index funds / real estate
- Compounding assets funded by consistent trading cash flow
- Long-term wealth built alongside active trading income

## Phase 7 — Semi-Automation + Futures (Future)
- Reduce manual approval touchpoints as trust in system grows
- Explore futures only after options process is fully validated
- Never full automation — human oversight always remains

## Guardrails That Never Change
- 3 trades/day maximum
- 5% max risk per trade
- 50% stop-loss hard limit
- 30–45 DTE, 0.30 delta targets
- Credit spread parameters: max loss defined by spread width, never naked options, always defined risk
- No sandbox/live lock bypasses
- No logic in UI components
- Complete audit trail always maintained
- Fund when data says fund — not when features feel done
