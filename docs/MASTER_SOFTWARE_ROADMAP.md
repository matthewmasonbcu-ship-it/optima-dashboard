\# Road to Funded Account / AutoTrader Master Software Roadmap



\## Mission

Build a disciplined personal money operating system that starts with safe paper trading, grows into phone-approved trading, supports funded-account protection, and eventually connects AutoTrader, Swing Trades, Position Trades, Wealth Builder, Cash Defense, and Net Worth Tracking.



\## Core Rule

The dashboard is the brain. Brokers are execution arms. Risk Guard controls everything.



\## Optimized App Architecture



\### App Routes / Modes



Current working route should remain stable until migration is needed.



Future route structure:



/app

&#x20; /dashboard          → main layout shell and mode switcher

&#x20; /autotrader         → Options Day Trade Lane

&#x20; /swing-trade        → Swing Trade Lane

&#x20; /position-trade     → Position Trade Lane

&#x20; /personal-trader    → Personal account trading mode

&#x20; /wealth-builder     → Long-term investing and portfolio plan

&#x20; /net-worth          → Full wealth scoreboard

&#x20; /funded-account     → Funded account rules and challenge protection



\### API Routes



/app/api

&#x20; /tradier            → existing Tradier sandbox/read-only routes

&#x20; /alerts             → future phone/push approval routes

&#x20; /paper-trades       → future paper trade CRUD helpers

&#x20; /live-trades        → future gated order routes, disabled until proven



\### Component Groups



/components/core

&#x20; → Risk Guard, PreTradeChecklist, ContractGrader



/components/trade

&#x20; → OptionTradeTicket, OptionTradeCommandCenter, TradeTicketReview



/components/contract

&#x20; → OptionContractSelector, ContractGradeDisplay



/components/broker

&#x20; → BrokerStatusCard, BrokerConnectionMonitor



/components/paper

&#x20; → PaperTradeTracker, PaperTradeTable, PaperTradeChart



/components/analytics

&#x20; → OptionAnalytics, PLChart, GreeksDisplay



/components/alerts

&#x20; → AlertPanel, PhoneApprovalGate, AlertHistory



/components/ui

&#x20; → Shared buttons, badges, cards, modals



\### Logic Libraries



/lib/risk

&#x20; → Risk scoring, trade blocking, funded rule checks



/lib/grader

&#x20; → Contract quality grading



/lib/analytics

&#x20; → P/L, win rate, option math, performance stats



/lib/brokers/tradier

&#x20; → Tradier API helpers



/lib/brokers/robinhood

&#x20; → Future only



/lib/alerts

&#x20; → Push/SMS/email approval wrappers



/lib/supabase

&#x20; → Supabase clients and typed query helpers



\### Shared Types



/types/trades.ts

/types/contracts.ts

/types/risk.ts

/types/alerts.ts

/types/brokers.ts

/types/user.ts



\### Hooks



/hooks/usePaperTrade.ts

/hooks/useRiskGuard.ts

/hooks/useContractGrade.ts

/hooks/useBrokerStatus.ts

/hooks/useAlerts.ts

/hooks/useOptionChain.ts



\### Constants



/constants/riskLimits.ts

/constants/gradeThresholds.ts

/constants/tradeDefaults.ts



\## Safety Rule



The current working AutoTrader should not be rewritten all at once.  

Every future module must be built separately, tested, and only connected after it works.

