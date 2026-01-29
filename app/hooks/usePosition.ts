"use client";

import { useCallback, useEffect, useState } from "react";
import { PublicKey, SystemProgram } from "@solana/web3.js";
import { AnchorProvider, BN } from "@coral-xyz/anchor";
import {
  getMXEAccAddress,
  getMempoolAccAddress,
  getExecutingPoolAccAddress,
  getCompDefAccAddress,
  getComputationAccAddress,
  getClusterAccAddress,
  getCompDefAccOffset,
} from "@arcium-hq/client";
import {
  getProgram,
  createReadOnlyProvider,
  getMarketPDA,
  getPoolStatePDA,
  getPositionPDA,
  PROGRAM_ID,
  parseContractError,
} from "@/lib/contracts/program";
import { PositionStatus } from "@/types/market";
import { usePrivyWallet, usePrivyConnection } from "./usePrivyWallet";

const CLUSTER_OFFSET = 456;
const POOL_ACCOUNT = new PublicKey(
  "G2sRWJvi3xoyh5k2gY49eG9L8YhAEWQPtNb1zb1GXTtC",
);
const CLOCK_ACCOUNT = new PublicKey(
  "7EbMUTLo5DjdzbN7s8BXeZwXzEwNQb1hScfRvWg8a6ot",
);
const ARCIUM_PROGRAM = new PublicKey(
  "Arcj82pX7HxYKLR92qvgZUAd7vGS1k4hQvAFcPATFdEQ",
);

export { PositionStatus };

export interface PositionResult {
  success: boolean;
  tx?: string;
  error?: string;
}

export interface PositionDisplay {
  publicKey: PublicKey;
  market: PublicKey;
  depositAmount: string;
  payoutAmount: string;
  status: PositionStatus;
  createdAt: Date;
  processedAt: Date | null;
  claimedAt: Date | null;
}

function parsePositionStatus(status: unknown): PositionStatus {
  if (typeof status === "object" && status !== null) {
    if ("pending" in status) return PositionStatus.Pending;
    if ("processed" in status) return PositionStatus.Processed;
    if ("payoutComputed" in status) return PositionStatus.PayoutComputed;
    if ("claimed" in status) return PositionStatus.Claimed;
    if ("refunded" in status) return PositionStatus.Refunded;
  }
  return PositionStatus.Pending;
}

function toPositionDisplay(
  publicKey: PublicKey,
  data: unknown,
): PositionDisplay {
  const d = data as any;
  return {
    publicKey,
    market: d.market,
    depositAmount: d.depositAmount.toString(),
    payoutAmount: d.payoutAmount.toString(),
    status: parsePositionStatus(d.status),
    createdAt: new Date(d.createdAt.toNumber() * 1000),
    processedAt: d.processedAt
      ? new Date(d.processedAt.toNumber() * 1000)
      : null,
    claimedAt: d.claimedAt ? new Date(d.claimedAt.toNumber() * 1000) : null,
  };
}

export function usePosition(marketId?: string) {
  const { connection } = usePrivyConnection();
  const wallet = usePrivyWallet();
  const [position, setPosition] = useState<PositionDisplay | null>(null);
  const [allPositions, setAllPositions] = useState<PositionDisplay[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPosition = useCallback(async () => {
    if (!marketId || !wallet.publicKey) return;

    try {
      setLoading(true);
      setError(null);

      const provider = createReadOnlyProvider(connection);
      const program = getProgram(provider);

      let marketPda: PublicKey;

      try {
        const numericId = BigInt(marketId);
        [marketPda] = getMarketPDA(numericId);
      } catch {
        marketPda = new PublicKey(marketId);
      }

      const [positionPda] = getPositionPDA(marketPda, wallet.publicKey);

      try {
        const account = await (program.account as any).userPosition.fetch(
          positionPda,
        );
        setPosition(toPositionDisplay(positionPda, account));
      } catch {
        setPosition(null);
      }
    } catch (err) {
      setError(parseContractError(err));
    } finally {
      setLoading(false);
    }
  }, [connection, wallet.publicKey, marketId]);

  const fetchAllPositions = useCallback(async () => {
    if (!wallet.publicKey) return;

    try {
      setLoading(true);
      setError(null);

      const provider = createReadOnlyProvider(connection);
      const program = getProgram(provider);

      const accounts = await (program.account as any).userPosition.all([
        {
          memcmp: {
            offset: 8 + 32,
            bytes: wallet.publicKey.toBase58(),
          },
        },
      ]);

      const positions = accounts.map((account: any) =>
        toPositionDisplay(account.publicKey, account.account),
      );

      setAllPositions(positions);
    } catch (err) {
      setError(parseContractError(err));
    } finally {
      setLoading(false);
    }
  }, [connection, wallet.publicKey]);

  useEffect(() => {
    if (marketId) fetchPosition();
  }, [fetchPosition, marketId]);

  useEffect(() => {
    if (wallet.publicKey && !marketId) fetchAllPositions();
  }, [fetchAllPositions, wallet.publicKey, marketId]);

  const claimPayout = useCallback(
    async (marketPda: PublicKey): Promise<PositionResult> => {
      if (!wallet.publicKey || !wallet.signTransaction) {
        const err = "Wallet not connected";
        setError(err);
        return { success: false, error: err };
      }

      try {
        setLoading(true);
        setError(null);

        const walletAdapter = {
          publicKey: wallet.publicKey,
          signTransaction: wallet.signTransaction,
          signAllTransactions: wallet.signAllTransactions,
        };

        const provider = new AnchorProvider(connection, walletAdapter as any, {
          commitment: "confirmed",
        });
        const program = getProgram(provider);

        const [positionPda] = getPositionPDA(marketPda, wallet.publicKey);
        const market = await (program.account as any).darkMarket.fetch(
          marketPda,
        );

        const tx = await program.methods
          .claimPayout()
          .accounts({
            claimer: wallet.publicKey,
            market: marketPda,
            userPosition: positionPda,
            claimerTokenAccount: await getAssociatedTokenAddress(
              market.tokenMint,
              wallet.publicKey,
            ),
            vault: market.vault,
          })
          .rpc();

        await fetchPosition();
        return { success: true, tx };
      } catch (err) {
        const errMsg = parseContractError(err);
        setError(errMsg);
        return { success: false, error: errMsg };
      } finally {
        setLoading(false);
      }
    },
    [connection, wallet, fetchPosition],
  );

  const claimRefund = useCallback(
    async (marketPda: PublicKey): Promise<PositionResult> => {
      if (!wallet.publicKey || !wallet.signTransaction) {
        const err = "Wallet not connected";
        setError(err);
        return { success: false, error: err };
      }

      try {
        setLoading(true);
        setError(null);

        const walletAdapter = {
          publicKey: wallet.publicKey,
          signTransaction: wallet.signTransaction,
          signAllTransactions: wallet.signAllTransactions,
        };

        const provider = new AnchorProvider(connection, walletAdapter as any, {
          commitment: "confirmed",
        });
        const program = getProgram(provider);

        const [positionPda] = getPositionPDA(marketPda, wallet.publicKey);
        const market = await (program.account as any).darkMarket.fetch(
          marketPda,
        );

        const tx = await program.methods
          .claimRefund()
          .accounts({
            claimer: wallet.publicKey,
            market: marketPda,
            userPosition: positionPda,
            claimerTokenAccount: await getAssociatedTokenAddress(
              market.tokenMint,
              wallet.publicKey,
            ),
            vault: market.vault,
          })
          .rpc();

        await fetchPosition();
        return { success: true, tx };
      } catch (err) {
        const errMsg = parseContractError(err);
        setError(errMsg);
        return { success: false, error: errMsg };
      } finally {
        setLoading(false);
      }
    },
    [connection, wallet, fetchPosition],
  );

  const computePayout = useCallback(
    async (
      marketPda: PublicKey,
      positionPda: PublicKey,
    ): Promise<PositionResult> => {
      if (!wallet.publicKey || !wallet.signTransaction) {
        const err = "Wallet not connected";
        setError(err);
        return { success: false, error: err };
      }

      try {
        setLoading(true);
        setError(null);

        const walletAdapter = {
          publicKey: wallet.publicKey,
          signTransaction: wallet.signTransaction,
          signAllTransactions: wallet.signAllTransactions,
        };

        const provider = new AnchorProvider(connection, walletAdapter as any, {
          commitment: "confirmed",
        });
        const program = getProgram(provider);

        const market = await (program.account as any).darkMarket.fetch(
          marketPda,
        );
        const marketIdNum = market.marketId.toNumber();
        const [poolStatePda] = getPoolStatePDA(marketIdNum);

        const computationOffsetBytes = crypto.getRandomValues(
          new Uint8Array(8),
        );
        const computationOffset = new BN(computationOffsetBytes);

        const mxeAccount = getMXEAccAddress(PROGRAM_ID);
        const mempoolAccount = getMempoolAccAddress(CLUSTER_OFFSET);
        const executingPool = getExecutingPoolAccAddress(CLUSTER_OFFSET);
        const clusterAccount = getClusterAccAddress(CLUSTER_OFFSET);

        const compDefOffset = getCompDefAccOffset("compute_payout");
        const compDefOffsetNumber = Buffer.from(compDefOffset).readUInt32LE();
        const compDefAccount = getCompDefAccAddress(
          PROGRAM_ID,
          compDefOffsetNumber,
        );

        const computationAccount = getComputationAccAddress(
          CLUSTER_OFFSET,
          computationOffset,
        );

        const [signPdaAccount] = PublicKey.findProgramAddressSync(
          [Buffer.from("ArciumSignerAccount")],
          PROGRAM_ID,
        );

        const accounts = {
          payer: wallet.publicKey,
          market: marketPda,
          poolState: poolStatePda,
          userPosition: positionPda,
          signPdaAccount: signPdaAccount,
          mxeAccount: mxeAccount,
          mempoolAccount: mempoolAccount,
          executingPool: executingPool,
          computationAccount: computationAccount,
          compDefAccount: compDefAccount,
          clusterAccount: clusterAccount,
          poolAccount: POOL_ACCOUNT,
          clockAccount: CLOCK_ACCOUNT,
          systemProgram: SystemProgram.programId,
          arciumProgram: ARCIUM_PROGRAM,
        };

        const instruction = await program.methods
          .computePayout(computationOffset)
          .accountsPartial(accounts)
          .instruction();

        const { Transaction } = await import("@solana/web3.js");
        const transaction = new Transaction();
        transaction.add(instruction);

        const { blockhash, lastValidBlockHeight } =
          await connection.getLatestBlockhash();
        transaction.recentBlockhash = blockhash;
        transaction.feePayer = wallet.publicKey;

        const signedTx = await wallet.signTransaction!(transaction);
        const txSignature = await connection.sendRawTransaction(
          signedTx.serialize(),
          {
            skipPreflight: true,
          },
        );

        const confirmation = await connection.confirmTransaction({
          signature: txSignature,
          blockhash,
          lastValidBlockHeight,
        });

        if (confirmation.value.err) {
          const errMsg = `Transaction failed: ${JSON.stringify(confirmation.value.err)}`;
          setError(errMsg);
          return { success: false, error: errMsg, tx: txSignature };
        }

        await fetchPosition();
        return { success: true, tx: txSignature };
      } catch (err) {
        const errMsg = parseContractError(err);
        setError(errMsg);
        return { success: false, error: errMsg };
      } finally {
        setLoading(false);
      }
    },
    [connection, wallet, fetchPosition],
  );

  return {
    position,
    allPositions,
    loading,
    error,
    refetch: fetchPosition,
    refetchAll: fetchAllPositions,
    claimPayout,
    claimRefund,
    computePayout,
  };
}

async function getAssociatedTokenAddress(
  mint: PublicKey,
  owner: PublicKey,
): Promise<PublicKey> {
  const { getAssociatedTokenAddress } = await import("@solana/spl-token");
  return getAssociatedTokenAddress(mint, owner);
}
