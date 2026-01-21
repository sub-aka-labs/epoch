"use client";

import { useCallback, useEffect, useState } from "react";
import { useConnection } from "@solana/wallet-adapter-react";
import { PublicKey } from "@solana/web3.js";
import { Program, AnchorProvider, BN } from "@coral-xyz/anchor";
import {
  getProgram,
  createReadOnlyProvider,
  PROGRAM_ID,
} from "@/lib/contracts/program";
import {
  DarkMarket,
  MarketDisplay,
  MarketStatus,
  toMarketDisplay,
} from "@/types/market";

export function useMarkets() {
  const { connection } = useConnection();
  const [markets, setMarkets] = useState<MarketDisplay[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMarkets = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const provider = createReadOnlyProvider(connection);
      const program = getProgram(provider);

      // Fetch all DarkMarket accounts
      const accounts = await (program.account as any).darkMarket.all();

      const marketDisplays = accounts.map((account: any) =>
        toMarketDisplay(account.publicKey, account.account as DarkMarket)
      );

      // Sort by creation date, newest first
      marketDisplays.sort(
        (a: MarketDisplay, b: MarketDisplay) => b.createdAt.getTime() - a.createdAt.getTime()
      );

      setMarkets(marketDisplays);
    } catch (err) {
      console.error("Failed to fetch markets:", err);
      setError(err instanceof Error ? err.message : "Failed to fetch markets");
    } finally {
      setLoading(false);
    }
  }, [connection]);

  useEffect(() => {
    fetchMarkets();
  }, [fetchMarkets]);

  const getActiveMarkets = useCallback(() => {
    return markets.filter((m) => m.status === MarketStatus.Open);
  }, [markets]);

  const getResolvedMarkets = useCallback(() => {
    return markets.filter((m) => m.status === MarketStatus.Resolved);
  }, [markets]);

  const getPendingMarkets = useCallback(() => {
    return markets.filter((m) => m.status === MarketStatus.Created);
  }, [markets]);

  return {
    markets,
    loading,
    error,
    refetch: fetchMarkets,
    getActiveMarkets,
    getResolvedMarkets,
    getPendingMarkets,
  };
}
