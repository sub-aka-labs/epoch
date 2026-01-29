import { AnchorProvider, Program, Idl } from "@coral-xyz/anchor";
import { Connection, PublicKey } from "@solana/web3.js";
import idl from "./contract.json";

export const PROGRAM_ID = new PublicKey(idl.address);

export const SEEDS = {
  DARK_MARKET: Buffer.from("dark_market"),
  POOL_STATE: Buffer.from("pool_state"),
  VAULT: Buffer.from("vault"),
  POSITION: Buffer.from("position"),
} as const;

export function getProgram(provider: AnchorProvider): Program {
  return new Program(idl as Idl, provider);
}

export function getMarketPDA(marketId: bigint | number): [PublicKey, number] {
  const marketIdBuffer = Buffer.alloc(8);
  marketIdBuffer.writeBigUInt64LE(BigInt(marketId));

  return PublicKey.findProgramAddressSync(
    [SEEDS.DARK_MARKET, marketIdBuffer],
    PROGRAM_ID,
  );
}

export function getPoolStatePDA(
  marketId: bigint | number,
): [PublicKey, number] {
  const marketIdBuffer = Buffer.alloc(8);
  marketIdBuffer.writeBigUInt64LE(BigInt(marketId));

  return PublicKey.findProgramAddressSync(
    [SEEDS.POOL_STATE, marketIdBuffer],
    PROGRAM_ID,
  );
}

export function getVaultPDA(marketId: bigint | number): [PublicKey, number] {
  const marketIdBuffer = Buffer.alloc(8);
  marketIdBuffer.writeBigUInt64LE(BigInt(marketId));

  return PublicKey.findProgramAddressSync(
    [SEEDS.VAULT, marketIdBuffer],
    PROGRAM_ID,
  );
}

export function getPositionPDA(
  marketPda: PublicKey,
  userPubkey: PublicKey,
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [SEEDS.POSITION, marketPda.toBuffer(), userPubkey.toBuffer()],
    PROGRAM_ID,
  );
}

export function createReadOnlyProvider(connection: Connection): AnchorProvider {
  return new AnchorProvider(
    connection,
    {
      publicKey: PublicKey.default,
      signAllTransactions: async (txs) => txs,
      signTransaction: async (tx) => tx,
    },
    { commitment: "confirmed" },
  );
}

export function lamportsToSol(lamports: bigint | number): number {
  return Number(lamports) / 1e9;
}

export function solToLamports(sol: number): bigint {
  return BigInt(Math.floor(sol * 1e9));
}

export function formatTokenAmount(
  amount: bigint | number,
  decimals: number = 9,
): string {
  const value = Number(amount) / Math.pow(10, decimals);
  return value.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: decimals,
  });
}

export function parseContractError(error: unknown): string {
  if (error instanceof Error) {
    const message = error.message;

    const customErrorMatch = message.match(
      /custom program error: 0x([0-9a-fA-F]+)/,
    );
    if (customErrorMatch) {
      const errorCode = parseInt(customErrorMatch[1], 16);
      const contractErrors: Record<number, string> = {
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
      };
      return contractErrors[errorCode] || `Unknown error: ${errorCode}`;
    }

    return message;
  }
  return "An unknown error occurred";
}
