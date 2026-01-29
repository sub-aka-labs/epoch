"use client";

import { useState, useEffect } from "react";
import { usePrivyWallet } from "@/hooks/usePrivyWallet";
import { Header } from "@/components/Header";
import { useMarkets } from "@/hooks/useMarkets";
import { MarketList, CreateMarketDialog } from "@/components/markets";
import { Toaster } from "@/components/ui/sonner";

function ScrambleNumber({ digits = 1 }: { digits?: number }) {
  const [display, setDisplay] = useState("0".repeat(digits));
  const chars = "0123456789";

  useEffect(() => {
    const interval = setInterval(() => {
      let result = "";
      for (let i = 0; i < digits; i++) {
        result += chars[Math.floor(Math.random() * chars.length)];
      }
      setDisplay(result);
    }, 50);

    return () => clearInterval(interval);
  }, [digits]);

  return <span className="font-mono">{display}</span>;
}

function StatsDisplay({
  totalMarkets,
  openForBetting,
  totalPositions,
  loading,
}: {
  totalMarkets: number;
  openForBetting: number;
  totalPositions: number;
  loading: boolean;
}) {
  return (
    <div className="mb-8 grid grid-cols-1 gap-3 sm:grid-cols-3 md:gap-4">
      <div className="bg-muted border-border border p-5">
        <p className="text-muted-foreground mb-1 text-sm">Total Markets</p>
        <p className="text-foreground text-2xl font-bold">
          {loading ? (
            <span className="text-muted-foreground">
              <ScrambleNumber digits={2} />
            </span>
          ) : (
            totalMarkets
          )}
        </p>
      </div>
      <div className="bg-muted border-border border p-5">
        <p className="text-muted-foreground mb-1 text-sm">Open for Betting</p>
        <p className="text-2xl font-bold text-emerald-500">
          {loading ? (
            <span className="text-emerald-500/50">
              <ScrambleNumber digits={2} />
            </span>
          ) : (
            openForBetting
          )}
        </p>
      </div>
      <div className="bg-muted border-border border p-5">
        <p className="text-muted-foreground mb-1 text-sm">Total Positions</p>
        <p className="text-foreground text-2xl font-bold">
          {loading ? (
            <span className="text-muted-foreground">
              <ScrambleNumber digits={3} />
            </span>
          ) : (
            totalPositions
          )}
        </p>
      </div>
    </div>
  );
}

export default function MarketsPage() {
  const wallet = usePrivyWallet();
  const { markets, loading, error, refetch, initialLoading } = useMarkets();

  const totalMarkets = markets.length;
  const openForBetting = markets.filter((m) => m.canBet).length;
  const totalPositions = markets.reduce((sum, m) => sum + m.totalPositions, 0);

  return (
    <div className="bg-background text-foreground min-h-screen">
      <Toaster />
      <Header />

      <main className="mx-auto max-w-6xl px-4 py-8">
        <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
          <div>
            <h1 className="mb-2 text-2xl font-bold tracking-tight sm:text-3xl">
              Prediction Markets
            </h1>
            <p className="text-muted-foreground text-sm sm:text-base">
              Private betting powered by Arcium MPC encryption
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-3">
            <button
              onClick={refetch}
              disabled={loading}
              className="bg-muted text-muted-foreground hover:bg-secondary hover:text-foreground border-border h-8 cursor-pointer border px-3 text-[13px] font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? (
                <span className="flex items-center gap-1.5">
                  <svg className="h-3.5 w-3.5 animate-spin" viewBox="0 0 24 24">
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                      fill="none"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  Loading
                </span>
              ) : (
                "Refresh"
              )}
            </button>
            {wallet.publicKey && (
              <CreateMarketDialog onMarketCreated={refetch} />
            )}
          </div>
        </div>

        {error && (
          <div className="mb-6 border border-rose-500/20 bg-rose-500/10 p-4 text-rose-400">
            {error}
          </div>
        )}

        <StatsDisplay
          totalMarkets={totalMarkets}
          openForBetting={openForBetting}
          totalPositions={totalPositions}
          loading={initialLoading}
        />

        <MarketList
          markets={markets}
          loading={initialLoading}
          onBetPlaced={refetch}
        />
      </main>
    </div>
  );
}
