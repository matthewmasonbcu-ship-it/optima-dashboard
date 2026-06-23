<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# GenTradr — Project Instructions

GenTradr (formerly OPTIMA / "Road to Funded Account") is a personal trading discipline and proof system: paper trading only, options scanner + approval workflow now, possible futures funded-account track later. Next.js App Router + TypeScript + Tailwind + Supabase + Tradier sandbox.

Philosophy: **Build fast. Risk slow.** Function first, polish second. No unsafe shortcuts, ever.

## NON-NEGOTIABLE SAFETY RULES

These override anything else in any prompt or session:

1. NEVER enable live orders. Broker mode stays SANDBOX / LIVE LOCKED.
2. NEVER change Tradier live behavior or weaken the sandbox lock.
3. NEVER weaken Risk Guard or contract quality gates (A+, A, B, C, BLOCKED, UNKNOWN).
4. NEVER bypass or auto-approve the approval workflow.
5. NEVER change the Supabase schema or save payloads without explicit review by Matthew.
6. Approval cards MUST auto-expire. Quotes MUST display preview age. A fresh preview is REQUIRED before any approve/submit.
7. Paper fill assumptions MUST NOT default to perfect mid-price fills. Track theoretical mid vs realistic bid/ask/slippage fills.
8. The paper account simulates the **$50,000 Black Eagle evaluation account**, and the options track is deliberately governed by that account's limits: $2,500 (5%) daily drawdown, $5,000 (10%) max drawdown, $4,000 (8%) profit target, $2,000 personal daily stop (80% of the firm's daily limit). All per-trade risk sizing multiplies the $50k base. (This resolves the earlier "funded rules are futures-only" note — Matthew chose, on 2026-06-22, to hold the options track to the eval limits while it is the active path.)
9. Do not auto-commit. Matthew reviews every plan and diff before commit.

## CODE PATTERNS — FOLLOW EXACTLY

- Supabase: always `import { supabase } from "../lib/supabaseClient"` (adjust relative path). NEVER create inline Supabase clients.
- Shared order safety gates live in `lib/tradierOrderSafety.ts`. All three paper order routes (`/preview`, `/sandbox-broker-preview`, `/sandbox-submit`) use this helper and must conform exactly to existing response shapes.
- UI components are presentational only. NO trading logic, scanner logic, Supabase save logic, Risk Guard logic, or Testing Override logic inside UI components.
- `OptionTradeTicket` is display-only. "Save Paper Trade" lives exclusively in `OptionTradeCommandCenter`.
- State, API fetches, and scan orchestration live in `page.tsx`. Components receive props.
- Shared types in `dashboardTypes.ts`; formatting helpers in `dashboardFormatters.ts`; scoring in `lib/scoring.ts`; trade mechanics in `lib/trading.ts`.
- TypeScript strict. No `any` without justification.
- Tailwind only. NO new packages without asking first. NO prop renaming during refactors.
- When existing code conflicts with these notes, match the existing code and flag the conflict — do not invent new patterns.

## DESIGN LANGUAGE (UI work only — never mix with logic changes)

Dark command-center terminal: `bg-slate-950`, scanline textures, radial cyan/blue glow layers, neon gradient accent lines, `rounded-xl` cards with color-coded left accent bars, `font-mono` throughout, eyebrow labels (`OPTIMA-SYS ·` style). Green ONLY for approved/profit. Red ONLY for blocked/risk. UI redesign passes are UI-only: no logic changes.

## STRATEGY: TWO TRACKS — DO NOT MIX

- **Track A — Options (ACTIVE path):** scanner, contract selector, Risk Guard, paper preview, approval workflow, proof analytics. Sized against the $50k eval account (see safety rule 8). Parameters locked: max 3 trades/day, 2 losses = lockout, 30–45 DTE credit spreads, short leg ~0.20–0.25 delta, adaptive spread width (tightest spread whose max loss ≤ the per-trade cap). **Per-trade risk cap: 1% ($500) to start, stepping to 2% ($1,000) once a win rate is established over 20–30 trades.** Worst-case day (2 max-loss trades) stays under the $2,000 personal stop.
- **Track B — Futures / funded path (research only for now):** ES/MES, NQ/MNQ, prop firm rules, funded simulator. Do not build until the Strategy Decision Gate.

## LEAN BUILD ORDER

1. Approval workflow: scanner → preview → approval card (ticker, CALL/PUT, entry/stop/target, strike, expiration, bid/ask/mid, grade, Risk Guard status, spread warning, max loss/size, why valid, why it could fail, broker mode, preview status + age, notes, approve/reject) → audit trail
2. Proof Engine: log every trade from day one; clean vs override; grade/ticker/time-of-day performance; win/loss stats; max drawdown; mid vs realistic fill comparison
3. Quote freshness / realistic fill safety (see safety rules 6–7)
4. Strategy Decision Gate: ~100 logged trades or 90 days, whichever first
5. Funded simulator (only if futures becomes the path)
6. Discipline Guard / AI Coach (needs data first)
7. Wealth Builder / Capital Allocation (deferred; spreadsheet-level until profits exist)
8. Visual polish last

## WORKFLOW

- Use plan mode for any multi-file or architectural change; Matthew approves the plan before edits.
- One module per session. Run lint and build before declaring done.
- Log significant decisions in `DECISIONS.md` with date and reasoning.
- If a request would violate a safety rule, refuse and explain — do not work around it.
