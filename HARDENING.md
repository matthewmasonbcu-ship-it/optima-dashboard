# OPTIMA / GenTradr — Consolidation & Hardening Checklist

> Planning document from the 2026-06-25 read-only audit. No fixes applied when
> this was written. Work through it deliberately in future sessions; check items
> off as they're done. File references are `file:line` at time of audit — verify
> against current code before acting (line numbers drift).

## How it was scanned
Grepped the whole tree (excl. `node_modules`) for: `ticker`, top-level env
throws, `sendPhoneAlert*` / `sendTelegramAlert`, `new URL(request.url).origin`,
account-size constants, and route callers; read the relevant routes.

---

## 🔴 CRITICAL — silently broken in production

### [ ] C1. `daily-summary` cron is doubly broken (dead channel + jitter window)
`app/api/cron/daily-summary/route.ts`
- Sends via the **dead SMS path** (`:3-4` import `sendPhoneAlertSms`/`EmailSms`;
  `:196-199` send). Daily P&L summaries are NOT reaching you — they go to the
  abandoned Twilio/T-Mobile channel. Undermines the proof-engine mission.
- **2-minute window tolerance** (`:9` `SUMMARY_TIME_TOLERANCE_MINUTES = 2`)
  against a once-daily cron (`vercel.json`, `0 20 * * 1-5`). Same jitter bug we
  fixed for the scan — Vercel delay >2 min ⇒ it self-skips. Likely never fires.
- **Fix:** switch to `sendTelegramAlert`; widen the window like `market-open-scan`.

### [ ] C2. Notification channel not unified — 3 routes still on dead SMS
Telegram-correct already: `market-open-scan`, `auto-close-check`, and the
approval alert (`app/api/alerts/phone-review/route.ts:425` is Telegram-primary,
email only as fallback — good).
Still on the **dead** SMS/email channel:
- `app/api/cron/daily-summary/route.ts:196-199` (see C1)
- `app/api/alerts/phone-review/respond/route.ts:472-474` — approve/reject
  confirmation messages
- `app/api/alerts/scanner-notify/route.ts:82-85` — legacy "scan ran" FYI, fired
  from `page.tsx:719` on every browser scan
- **Fix:** migrate all three to `sendTelegramAlert`. (Blocks N2 — `lib/sms/*`
  can't be deleted until this is done.)

---

## 🟠 IMPORTANT — latent bugs, consistency, fragility

### [ ] I1. `get-paper-trades` schema mismatch — and it's orphaned
`app/api/get-paper-trades/route.ts:21` selects scan-table columns
(`ticker, company, setup_grade, decision, trade_plan_action, bias, risk_level`)
but `paper_trades` stores `symbol, stop_loss, take_profit, strategy, …`.
Copy-pasted from `get-scans` and never adapted; returns nulls or errors.
- Appears **orphaned** — no `fetch("/api/get-paper-trades")` anywhere;
  `PaperTradeTracker` queries Supabase directly (`PaperTradeTracker.tsx:100`
  reads `symbol || ticker`).
- The `symbol` vs `ticker` split is otherwise consistent: `scans`/`get-scans`
  legitimately use `ticker` (`saveScanHistory.ts:17`, `get-scans:21`); only
  `paper_trades` uses `symbol`. **This route is the only place the mismatch lives.**
- **Fix:** delete the route (preferred) or correct the columns.

### [ ] I2. Build-fragility — top-level env throws + inline Supabase clients (8 files)
Module-load `throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL")` kills the
*entire* build if a var is absent (this is what nuked the deleted duplicate
project's builds; azm9 is fine only because its env is complete):
- `lib/supabaseClient.ts:6-11` (shared client — intended, but all importers inherit it)
- `app/api/alerts/phone-review/route.ts:15-20`
- `app/api/alerts/phone-review/respond/route.ts:10-15`
- `app/api/option-trade-details/route.ts:9-14`
- `app/api/tradier/orders/preview/route.ts:7-12`
- `app/api/tradier/orders/sandbox-submit/route.ts:7-12`
- `app/api/tradier/orders/sandbox-broker-preview/route.ts:7-12`
- `app/api/tradier/orders/preview/human-review/route.ts:7-12`
The 7 routes also create **inline Supabase clients**, violating AGENTS.md
("NEVER create inline Supabase clients").
- **Fix:** route them through the shared `lib/supabaseClient`; move env checks
  inside the handler (return 500) rather than throwing at module load. Consider
  making the shared client's check lazy to harden every consumer at once.

### [ ] I3. `status` casing inconsistency
`app/api/close-paper-trade/route.ts:37` writes `status: "CLOSED"` (uppercase);
everywhere else uses lowercase `"open"`/`"closed"` (`savePaperTrade`,
`auto-close-check`, `close-option-trade`, and `PaperTradeTracker.tsx:622` checks
`=== "closed"`). Low impact (route is orphaned, I4) but a trap if reused.

### [ ] I4. Orphaned routes (verify zero callers, then delete)
- `app/api/close-paper-trade/route.ts` (superseded by `close-option-trade`)
- `app/api/get-paper-trades/route.ts` (I1)
- `app/api/options-chain/route.ts` (hyphen variant; live one is `options/chain`,
  called at `OptionContractSelector.tsx:731`)
- `app/api/generate-scan/route.ts`, `app/api/get-scans/route.ts`,
  `app/api/scans/route.ts`, `app/api/trades/route.ts`, `app/api/market/route.ts`,
  `app/api/clear-scans/route.ts`
- **Action:** confirm zero callers (some may be hit manually), then remove.
  Shrinks the build surface and the I2 footprint.

---

## 🟢 NICE-TO-HAVE — architecture & robustness

### [ ] N1. `auto-close-check` runs once a day — can't catch intraday exits
`vercel.json` (`0 19 * * 1-5`) + market-hours gate. To run frequently:
- **External pinger (free, Hobby-friendly, recommended):** GitHub Actions
  scheduled workflow / cron-job.org / UptimeRobot hitting
  `/api/cron/auto-close-check` every 5–15 min during market hours with the
  `CRON_SECRET`. Route already self-gates to market hours, so frequent pings
  are safe.
- **Vercel Pro:** native crons down to every minute. Simplest; costs money.

### [ ] N2. SMS infra — delete only *after* C2
`lib/sms/sendPhoneAlertSms.ts`, `lib/sms/sendPhoneAlertEmailSms.ts` are still
imported by the C2 routes + the phone-review fallback. Sequence: migrate C2 to
Telegram → delete `lib/sms/*` → drop `twilio` / `nodemailer` from `package.json`.

### [ ] N3. Old stock-close paths
`PaperTradeTracker.closeStockTrade` and `AutoPositionMonitor.closeTradeAtPrice`
write `paper_trades` only (stock-price exit) — correct for genuine stock trades
but the system is options-only now. Consider routing everything through
`close-option-trade` and retiring the stock-close UI (a stray stock-close click
on an option still corrupts P&L if `optionDetail` is ever absent).

### [ ] N4. Quote-path hardening (deferred "Option B")
`market-open-scan` is fixed via the public-domain `baseUrl`, but it still
HTTP-self-fetches `/api/quote` (`lib/scanner.ts:67`). Extract the Finnhub logic
into a shared lib the cron calls directly — removes the last self-fetch
dependency for quotes.

### [ ] N6. Database RLS-off / public-anon-key posture (known item; multi-user only)
The whole app runs on the **public anon key** (`lib/supabaseClient.ts`) and every
table is **RLS-off** — no migration defines any policy/grant. Fine for a
single-user personal system (the anon key is already shipped to the browser), but
it means any table created with RLS *enabled* and no policy silently breaks all
anon writes (Postgres `42501`, swallowed by non-fatal catches). This exact thing
hid `scan_runs`/`scan_candidates` writes for the scan-observability feature; fixed
by `supabase_migrations_scan_tables_disable_rls.sql` (disable RLS to match the
rest of the schema).
- **If this ever goes multi-user:** this posture is a hard blocker — flip to
  proper RLS policies on *every* table and move server/cron writes to a
  service-role key (kept server-side, never `NEXT_PUBLIC_*`). Until then, any new
  table must be created **RLS-off** to match, or its anon writes will fail silently.

### [ ] N5. Minor brittleness
- `APP_BASE_URL` (`phone-review/route.ts:7-8`) hard-codes
  `optima-dashboard-azm9.vercel.app` as fallback — correct today, brittle if the
  domain changes. Prefer `VERCEL_PROJECT_PRODUCTION_URL`.
- Once-per-day dedup query (`market-open-scan`, ~`:159`) is fail-open (no error
  handling) — acceptable; worth a comment.
- `analyzeSetup` throwing on a bad symbol would bubble to the cron's outer try
  and abort remaining symbols (vs. the watchlist loop's per-symbol `continue`).

---

## Verified HEALTHY (no action) ✅
- **Account-size / risk constants:** consistent at **$50k** —
  `ACCOUNT_SIZE = 50000` (`preTradeChecks.ts:35`), all 5 component defaults
  `= 50000`, no `10000`/`5000` stragglers.
- **Deployment-URL self-fetch bug:** existed only in `market-open-scan` (fixed
  via `VERCEL_PROJECT_PRODUCTION_URL`). No other route self-fetches via
  `new URL(request.url).origin`.
- **Approval alert** (`phone-review`) is Telegram-primary — critical path works.

---

## Suggested order for a future session
1. **C1 + C2** — migrate `daily-summary`, `phone-review/respond`,
   `scanner-notify` to Telegram; widen `daily-summary`'s window. (Restores daily
   proof summaries.)
2. **I4** — delete confirmed-orphaned routes (shrinks I2 first).
3. **I2** — consolidate inline clients onto the shared client + lazy env checks.
4. **N2** — delete `lib/sms/*` + drop the deps.
5. **N1** — external pinger for `auto-close-check`.
6. **N3 / N4 / N5** — opportunistic hardening.
