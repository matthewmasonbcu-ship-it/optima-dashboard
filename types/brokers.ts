export type BrokerProvider =
  | "TRADIER"
  | "ROBINHOOD_AGENTIC"
  | "FUNDED_ACCOUNT"
  | "MANUAL";

export type BrokerEnvironment = "SANDBOX" | "PAPER" | "LIVE";

export type BrokerConnectionStatus =
  | "CONNECTED"
  | "DISCONNECTED"
  | "WAITING_VERIFICATION"
  | "ERROR";

export type BrokerCapability =
  | "QUOTES"
  | "OPTION_CHAINS"
  | "OPTION_EXPIRATIONS"
  | "BALANCES"
  | "POSITIONS"
  | "PAPER_ORDERS"
  | "LIVE_ORDERS"
  | "STOCKS"
  | "OPTIONS"
  | "FUTURES"
  | "CRYPTO";

export interface BrokerStatus {
  provider: BrokerProvider;
  environment: BrokerEnvironment;
  connectionStatus: BrokerConnectionStatus;
  capabilities: BrokerCapability[];
  ordersEnabled: boolean;
  liveTradingEnabled: boolean;
  lastCheckedAt?: string;
  message?: string | null;
}