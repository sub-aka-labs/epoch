import { AnchorProvider, Program, Idl } from "@coral-xyz/anchor";
import { Connection, PublicKey } from "@solana/web3.js";
import idl from "./contract.json";

// Program ID from the IDL
export const PROGRAM_ID = new PublicKey(idl.address);

// Seeds for PDAs
export const SEEDS = {
  DARK_MARKET: Buffer.from("dark_market"),
  POOL_STATE: Buffer.from("pool_state"),
  VAULT: Buffer.from("vault"),
  POSITION: Buffer.from("position"),
} as const;

// Get the program instance
export function getProgram(provider: AnchorProvider): Program {
  return new Program(idl as Idl, provider);
}

// Derive market PDA
export function getMarketPDA(marketId: bigint | number): [PublicKey, number] {
  const marketIdBuffer = Buffer.alloc(8);
  marketIdBuffer.writeBigUInt64LE(BigInt(marketId));

  return PublicKey.findProgramAddressSync(
    [SEEDS.DARK_MARKET, marketIdBuffer],
    PROGRAM_ID
  );
}

// Derive pool state PDA
export function getPoolStatePDA(marketId: bigint | number): [PublicKey, number] {
  const marketIdBuffer = Buffer.alloc(8);
  marketIdBuffer.writeBigUInt64LE(BigInt(marketId));

  return PublicKey.findProgramAddressSync(
    [SEEDS.POOL_STATE, marketIdBuffer],
    PROGRAM_ID
  );
}

// Derive vault PDA
export function getVaultPDA(marketId: bigint | number): [PublicKey, number] {
  const marketIdBuffer = Buffer.alloc(8);
  marketIdBuffer.writeBigUInt64LE(BigInt(marketId));

  return PublicKey.findProgramAddressSync(
    [SEEDS.VAULT, marketIdBuffer],
    PROGRAM_ID
  );
}

// Derive user position PDA
export function getPositionPDA(
  marketPda: PublicKey,
  userPubkey: PublicKey
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [SEEDS.POSITION, marketPda.toBuffer(), userPubkey.toBuffer()],
    PROGRAM_ID
  );
}

// Create a read-only provider for fetching data
export function createReadOnlyProvider(connection: Connection): AnchorProvider {
  return new AnchorProvider(
    connection,
    {
      publicKey: PublicKey.default,
      signAllTransactions: async (txs) => txs,
      signTransaction: async (tx) => tx,
    },
    { commitment: "confirmed" }
  );
}

// Format lamports to SOL
export function lamportsToSol(lamports: bigint | number): number {
  return Number(lamports) / 1e9;
}

// Format SOL to lamports
export function solToLamports(sol: number): bigint {
  return BigInt(Math.floor(sol * 1e9));
}

// Format token amount with decimals
export function formatTokenAmount(
  amount: bigint | number,
  decimals: number = 9
): string {
  const value = Number(amount) / Math.pow(10, decimals);
  return value.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: decimals,
  });
}

// Parse error from transaction
export function parseContractError(error: unknown): string {
  if (error instanceof Error) {
    const message = error.message;

    // Check for custom program error
    const customErrorMatch = message.match(/custom program error: 0x([0-9a-fA-F]+)/);
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
        6009: "Market is not cancelled",
        6010: "Invalid market status for this operation",
        6011: "Bet amount must be greater than zero",
        6012: "Encrypted bet data size is invalid",
        6013: "Invalid outcome - must be 0 (NO) or 1 (YES)",
        6014: "Position has already been claimed",
        6015: "No payout available for this position",
        6016: "Payout has not been computed yet",
        6017: "Unauthorized - only market authority can perform this action",
        6018: "Invalid token account owner",
        6019: "Token mint does not match market",
        6020: "Vault does not match market",
        6021: "Pool state does not match market",
        6022: "Position does not belong to this market",
        6023: "Pool state has not been initialized",
        6024: "Encrypted state exceeds maximum size",
        6025: "Computation was aborted",
        6026: "Cluster not set in MXE account",
        6027: "Invalid computation result",
        6028: "Arithmetic overflow",
        6029: "Arithmetic underflow",
      };
      return contractErrors[errorCode] || `Unknown error: ${errorCode}`;
    }

    return message;
  }
  return "An unknown error occurred";
}
