"use client";

import { usePrivyConnection } from "./usePrivyWallet";
import { useCallback, useEffect, useState, useRef } from "react";
import {
  getProgram,
  createReadOnlyProvider,
} from "@/lib/contracts/program";
import {
  DarkMarket,
  MarketDisplay,
  MarketStatus,
  toMarketDisplay,
} from "@/types/market";

export function useMarkets() {
  const { connection } = usePrivyConnection();
  const [markets, setMarkets] = useState<MarketDisplay[]>([]);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const hasFetched = useRef(false);

  const fetchMarkets = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const provider = createReadOnlyProvider(connection);
      const program = getProgram(provider);

      const accounts = await (program.account as any).darkMarket.all();

      const marketDisplays = accounts.map((account: any) =>
        toMarketDisplay(account.publicKey, account.account as DarkMarket)
      );

      marketDisplays.sort(
        (a: MarketDisplay, b: MarketDisplay) => b.createdAt.getTime() - a.createdAt.getTime()
      );

      setMarkets(marketDisplays);
      hasFetched.current = true;
    } catch (err) {
      console.error("Failed to fetch markets:", err);
      setError(err instanceof Error ? err.message : "Failed to fetch markets");
    } finally {
      setLoading(false);
      setInitialLoading(false);
    }
  }, [connection]);

  useEffect(() => {
    if (!hasFetched.current) {
      fetchMarkets();
    }
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
    initialLoading,
    error,
    refetch: fetchMarkets,
    getActiveMarkets,
    getResolvedMarkets,
    getPendingMarkets,
  };
}
