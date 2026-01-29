"use client";

import { useState, useEffect } from "react";
import { usePrivyWallet } from "@/hooks/usePrivyWallet";
import { Header } from "@/components/Header";
import { useMarkets } from "@/hooks/useMarkets";
import { MarketList, CreateMarketDialog } from "@/components/markets";
import { Toaster } from "@/components/ui/sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { IconRefresh } from "@tabler/icons-react";

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
      <Card className="p-5 hover:border-border">
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
      </Card>
      <Card className="bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/20 p-5 hover:border-emerald-300 dark:hover:border-emerald-500/30">
        <p className="text-emerald-700 dark:text-emerald-400/80 mb-1 text-sm">Open for Betting</p>
        <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
          {loading ? (
            <span className="text-emerald-400/50">
              <ScrambleNumber digits={2} />
            </span>
          ) : (
            openForBetting
          )}
        </p>
      </Card>
      <Card className="p-5 hover:border-border">
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
      </Card>
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
            <Button
              variant="secondary"
              onClick={refetch}
              disabled={loading}
            >
              <IconRefresh size={14} className={loading ? "animate-spin" : ""} />
              {loading ? "Loading" : "Refresh"}
            </Button>
            {wallet.publicKey && (
              <CreateMarketDialog onMarketCreated={refetch} />
            )}
          </div>
        </div>

        {error && (
          <Card className="mb-6 border-rose-300 dark:border-rose-500/20 bg-rose-100 dark:bg-rose-500/10 p-4 text-rose-700 dark:text-rose-400 hover:border-rose-300">
            {error}
          </Card>
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
