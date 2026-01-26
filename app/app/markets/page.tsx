"use client";

import { useState, useEffect } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { Header } from "@/components/Header";
import { useMarkets } from "@/hooks/useMarkets";
import { MarketList, CreateMarketDialog } from "@/components/markets";
import { Toaster } from "@/components/ui/sonner";

// Encrypted number effect for loading state
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

  return (
    <span className="font-mono">{display}</span>
  );
}

export default function MarketsPage() {
  const wallet = useWallet();
  const { markets, loading, error, refetch } = useMarkets();

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      <Toaster theme="dark" />
      <Header />

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 py-8">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold mb-2 tracking-tight">Prediction Markets</h1>
            <p className="text-zinc-500 text-sm sm:text-base">
              Private betting powered by Arcium MPC encryption
            </p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={refetch}
              disabled={loading}
              className="px-4 py-2 bg-zinc-800 text-zinc-300 hover:bg-zinc-700 hover:text-white transition-colors text-sm font-medium disabled:opacity-50 border border-zinc-700"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Refreshing
                </span>
              ) : (
                "Refresh"
              )}
            </button>
            {wallet.publicKey && <CreateMarketDialog onMarketCreated={refetch} />}
          </div>
        </div>

        {/* Error State */}
        {error && (
          <div className="mb-6 p-4 bg-rose-500/10 border border-rose-500/20 text-rose-400">
            {error}
          </div>
        )}

        {/* Stats Banner */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4 mb-8">
          <div className="bg-zinc-900 p-5 border border-zinc-800">
            <p className="text-zinc-500 text-sm mb-1">Total Markets</p>
            <p className="text-2xl font-bold">
              {loading ? (
                <span className="text-zinc-500"><ScrambleNumber digits={2} /></span>
              ) : (
                markets.length
              )}
            </p>
          </div>
          <div className="bg-zinc-900 p-5 border border-zinc-800">
            <p className="text-zinc-500 text-sm mb-1">Open for Betting</p>
            <p className="text-2xl font-bold text-emerald-400">
              {loading ? (
                <span className="text-emerald-400/50"><ScrambleNumber digits={2} /></span>
              ) : (
                markets.filter((m) => m.canBet).length
              )}
            </p>
          </div>
          <div className="bg-zinc-900 p-5 border border-zinc-800">
            <p className="text-zinc-500 text-sm mb-1">Total Positions</p>
            <p className="text-2xl font-bold">
              {loading ? (
                <span className="text-zinc-500"><ScrambleNumber digits={3} /></span>
              ) : (
                markets.reduce((sum, m) => sum + m.totalPositions, 0)
              )}
            </p>
          </div>
        </div>

        {/* Markets List */}
        <MarketList markets={markets} loading={loading} onBetPlaced={refetch} />
      </main>
    </div>
  );
}
