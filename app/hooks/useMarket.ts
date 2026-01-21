"use client";

import { useCallback, useEffect, useState } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { PublicKey } from "@solana/web3.js";
import { AnchorProvider, BN } from "@coral-xyz/anchor";
import {
  getProgram,
  createReadOnlyProvider,
  getMarketPDA,
  getPoolStatePDA,
  getVaultPDA,
  parseContractError,
} from "@/lib/contracts/program";
import {
  DarkMarket,
  MarketDisplay,
  CreateMarketInput,
  toMarketDisplay,
} from "@/types/market";

export function useMarket(marketId?: string) {
  const { connection } = useConnection();
  const wallet = useWallet();
  const [market, setMarket] = useState<MarketDisplay | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchMarket = useCallback(async () => {
    if (!marketId) return;

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

      const account = await (program.account as any).darkMarket.fetch(marketPda);
      setMarket(toMarketDisplay(marketPda, account as DarkMarket));
    } catch (err) {
      setError(parseContractError(err));
    } finally {
      setLoading(false);
    }
  }, [connection, marketId]);

  useEffect(() => {
    if (marketId) fetchMarket();
  }, [fetchMarket, marketId]);

  const createMarket = useCallback(
    async (input: CreateMarketInput): Promise<string | null> => {
      if (!wallet.publicKey || !wallet.signTransaction) {
        setError("Wallet not connected");
        return null;
      }

      try {
        setLoading(true);
        setError(null);

        const provider = new AnchorProvider(connection, wallet as any, {
          commitment: "confirmed",
        });
        const program = getProgram(provider);

        const [marketPda] = getMarketPDA(input.marketId.toNumber());
        const [poolStatePda] = getPoolStatePDA(input.marketId.toNumber());
        const [vaultPda] = getVaultPDA(input.marketId.toNumber());

        const tx = await program.methods
          .createMarket(
            input.marketId,
            input.question,
            input.bettingStartTs,
            input.bettingEndTs,
            input.resolutionEndTs
          )
          .accounts({
            authority: wallet.publicKey,
            market: marketPda,
            poolState: poolStatePda,
            tokenMint: input.tokenMint,
            vault: vaultPda,
          })
          .rpc();

        await fetchMarket();
        return tx;
      } catch (err) {
        setError(parseContractError(err));
        return null;
      } finally {
        setLoading(false);
      }
    },
    [connection, wallet, fetchMarket]
  );

  const openMarket = useCallback(async (marketIdOverride?: string | number): Promise<string | null> => {
    if (!wallet.publicKey || !wallet.signTransaction) {
      setError("Wallet not connected");
      return null;
    }

    const marketIdToUse = marketIdOverride ?? market?.marketId;
    if (!marketIdToUse) {
      setError("No market ID provided");
      return null;
    }

    try {
      setLoading(true);
      setError(null);

      const provider = new AnchorProvider(connection, wallet as any, {
        commitment: "confirmed",
      });
      const program = getProgram(provider);

      const marketIdNum = typeof marketIdToUse === 'string' ? parseInt(marketIdToUse) : marketIdToUse;
      const [marketPda] = getMarketPDA(marketIdNum);
      const [poolStatePda] = getPoolStatePDA(marketIdNum);

      const tx = await program.methods
        .openMarket()
        .accounts({
          authority: wallet.publicKey,
          market: marketPda,
          poolState: poolStatePda,
        })
        .rpc();

      await fetchMarket();
      return tx;
    } catch (err) {
      setError(parseContractError(err));
      return null;
    } finally {
      setLoading(false);
    }
  }, [connection, wallet, market, fetchMarket]);

  const closeBetting = useCallback(async (): Promise<string | null> => {
    if (!wallet.publicKey || !wallet.signTransaction || !market) {
      setError("Wallet not connected or market not loaded");
      return null;
    }

    try {
      setLoading(true);
      setError(null);

      const provider = new AnchorProvider(connection, wallet as any, {
        commitment: "confirmed",
      });
      const program = getProgram(provider);

      const marketIdNum = parseInt(market.marketId);
      const [marketPda] = getMarketPDA(marketIdNum);

      const tx = await program.methods
        .closeBetting()
        .accounts({
          authority: wallet.publicKey,
          market: marketPda,
        })
        .rpc();

      await fetchMarket();
      return tx;
    } catch (err) {
      setError(parseContractError(err));
      return null;
    } finally {
      setLoading(false);
    }
  }, [connection, wallet, market, fetchMarket]);

  const resolveMarket = useCallback(
    async (winningOutcome: 0 | 1): Promise<string | null> => {
      if (!wallet.publicKey || !wallet.signTransaction || !market) {
        setError("Wallet not connected or market not loaded");
        return null;
      }

      try {
        setLoading(true);
        setError(null);

        const provider = new AnchorProvider(connection, wallet as any, {
          commitment: "confirmed",
        });
        const program = getProgram(provider);

        const marketIdNum = parseInt(market.marketId);
        const [marketPda] = getMarketPDA(marketIdNum);

        const tx = await program.methods
          .resolveMarket(winningOutcome)
          .accounts({
            authority: wallet.publicKey,
            market: marketPda,
          })
          .rpc();

        await fetchMarket();
        return tx;
      } catch (err) {
        setError(parseContractError(err));
        return null;
      } finally {
        setLoading(false);
      }
    },
    [connection, wallet, market, fetchMarket]
  );

  const cancelMarket = useCallback(async (): Promise<string | null> => {
    if (!wallet.publicKey || !wallet.signTransaction || !market) {
      setError("Wallet not connected or market not loaded");
      return null;
    }

    try {
      setLoading(true);
      setError(null);

      const provider = new AnchorProvider(connection, wallet as any, {
        commitment: "confirmed",
      });
      const program = getProgram(provider);

      const marketIdNum = parseInt(market.marketId);
      const [marketPda] = getMarketPDA(marketIdNum);

      const tx = await program.methods
        .cancelMarket()
        .accounts({
          authority: wallet.publicKey,
          market: marketPda,
        })
        .rpc();

      await fetchMarket();
      return tx;
    } catch (err) {
      setError(parseContractError(err));
      return null;
    } finally {
      setLoading(false);
    }
  }, [connection, wallet, market, fetchMarket]);

  return {
    market,
    loading,
    error,
    refetch: fetchMarket,
    createMarket,
    openMarket,
    closeBetting,
    resolveMarket,
    cancelMarket,
  };
}
