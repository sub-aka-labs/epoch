import { PublicKey } from "@solana/web3.js";
import { BN } from "@coral-xyz/anchor";

export enum MarketStatus {
  Created = "Created",
  Open = "Open",
  BettingClosed = "BettingClosed",
  Resolved = "Resolved",
  Settled = "Settled",
}

export enum PositionStatus {
  Pending = "Pending",
  Processed = "Processed",
  PayoutComputed = "PayoutComputed",
  Claimed = "Claimed",
}

export type Outcome = "yes" | "no";

export interface DarkMarket {
  authority: PublicKey;
  marketId: BN;
  question: string;
  tokenMint: PublicKey;
  vault: PublicKey;
  poolState: PublicKey;
  bettingStartTs: BN;
  bettingEndTs: BN;
  resolutionEndTs: BN;
  status: MarketStatus;
  winningOutcome: number | null;
  totalPositions: number;
  stateCommitment: Uint8Array;
  bump: number;
  vaultBump: number;
  poolStateBump: number;
  createdAt: BN;
  resolvedAt: BN | null;
}

export interface UserPosition {
  market: PublicKey;
  owner: PublicKey;
  encryptedBet: Uint8Array;
  userPubkey: Uint8Array;
  nonce: BN;
  depositAmount: BN;
  payoutAmount: BN;
  status: PositionStatus;
  computationId: BN;
  bump: number;
  createdAt: BN;
  processedAt: BN | null;
  claimedAt: BN | null;
}

export interface EncryptedPoolState {
  market: PublicKey;
  encryptedState: Uint8Array;
  stateVersion: BN;
  lastComputationId: BN;
  pendingComputations: number;
  lastUpdated: BN;
  bump: number;
  isInitialized: boolean;
}

export interface MarketDisplay {
  publicKey: PublicKey;
  marketId: string;
  question: string;
  status: MarketStatus;
  tokenMint: string;
  bettingStartTime: Date;
  bettingEndTime: Date;
  resolutionEndTime: Date;
  totalPositions: number;
  winningOutcome: "yes" | "no" | null;
  createdAt: Date;
  resolvedAt: Date | null;
  authority: string;
  isActive: boolean;
  canBet: boolean;
  isResolved: boolean;
}

export interface BetInput {
  marketPda: PublicKey;
  outcome: Outcome;
  amount: BN;
}

export interface CreateMarketInput {
  marketId: BN;
  question: string;
  bettingStartTs: BN;
  bettingEndTs: BN;
  resolutionEndTs: BN;
  tokenMint: PublicKey;
}

export const CONTRACT_ERRORS = {
  6000: "Question exceeds maximum length of 200 characters",
  6001: "Betting end time must be before resolution end time",
  6002: "Deadline cannot be in the past",
  6003: "Market is not open for betting",
  6004: "Betting period has not started yet",
  6005: "Betting period has ended",
  6006: "Betting period has not ended yet",
  6007: "Market has not been resolved",
  6008: "Market has already been resolved",
  6009: "Invalid market status for this operation",
  6010: "Bet amount must be greater than zero",
  6011: "Encrypted bet data size is invalid",
  6012: "Invalid outcome - must be 0 (NO) or 1 (YES)",
  6013: "Position has already been claimed",
  6014: "No payout available for this position",
  6015: "Payout has not been computed yet",
  6016: "Unauthorized - only market authority can perform this action",
  6017: "Invalid token account owner",
  6018: "Token mint does not match market",
  6019: "Vault does not match market",
  6020: "Pool state does not match market",
  6021: "Position does not belong to this market",
  6022: "Pool state has not been initialized",
  6023: "Encrypted state exceeds maximum size",
  6024: "Computation was aborted",
  6025: "Cluster not set in MXE account",
  6026: "Invalid computation result",
  6027: "Arithmetic overflow",
  6028: "Arithmetic underflow",
} as const;

export function toMarketDisplay(
  publicKey: PublicKey,
  data: DarkMarket,
): MarketDisplay {
  const now = new Date();
  const bettingStart = new Date(data.bettingStartTs.toNumber() * 1000);
  const bettingEnd = new Date(data.bettingEndTs.toNumber() * 1000);

  return {
    publicKey,
    marketId: data.marketId.toString(),
    question: data.question,
    status: parseMarketStatus(data.status),
    tokenMint: data.tokenMint.toBase58(),
    bettingStartTime: bettingStart,
    bettingEndTime: bettingEnd,
    resolutionEndTime: new Date(data.resolutionEndTs.toNumber() * 1000),
    totalPositions: data.totalPositions,
    winningOutcome:
      data.winningOutcome !== null
        ? data.winningOutcome === 1
          ? "yes"
          : "no"
        : null,
    createdAt: new Date(data.createdAt.toNumber() * 1000),
    resolvedAt: data.resolvedAt
      ? new Date(data.resolvedAt.toNumber() * 1000)
      : null,
    authority: data.authority.toBase58(),
    isActive: parseMarketStatus(data.status) === MarketStatus.Open,
    canBet:
      parseMarketStatus(data.status) === MarketStatus.Open &&
      now >= bettingStart &&
      now < bettingEnd,
    isResolved: parseMarketStatus(data.status) === MarketStatus.Resolved,
  };
}

function parseMarketStatus(status: unknown): MarketStatus {
  if (typeof status === "object" && status !== null) {
    if ("created" in status) return MarketStatus.Created;
    if ("open" in status) return MarketStatus.Open;
    if ("bettingClosed" in status) return MarketStatus.BettingClosed;
    if ("resolved" in status) return MarketStatus.Resolved;
    if ("settled" in status) return MarketStatus.Settled;
  }
  return MarketStatus.Created;
}
