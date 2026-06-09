import type { ContractQuality } from "./trades";

export type OptionType = "call" | "put";

export interface OptionContract {
  symbol: string;
  underlyingSymbol: string;
  optionType: OptionType;
  strike: number;
  expiration: string;

  bid?: number | null;
  ask?: number | null;
  last?: number | null;
  mid?: number | null;

  volume?: number | null;
  openInterest?: number | null;
  impliedVolatility?: number | null;

  delta?: number | null;
  gamma?: number | null;
  theta?: number | null;
  vega?: number | null;

  contractQuality?: ContractQuality;
}

export interface ContractGradeResult {
  grade: ContractQuality;
  score: number;
  reasons: string[];
  warnings: string[];
  isTradable: boolean;
}