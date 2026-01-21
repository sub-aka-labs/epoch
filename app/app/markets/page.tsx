"use client";

import { useWallet } from "@solana/wallet-adapter-react";
import { WalletButton } from "@/components/WalletButton";
import { useMarkets } from "@/hooks/useMarkets";
import { MarketList, CreateMarketDialog } from "@/components/markets";
import { Toaster } from "@/components/ui/sonner";
import Link from "next/link";

export default function MarketsPage() {
  const wallet = useWallet();
  const { markets, loading, error, refetch } = useMarkets();

  return (
    <div className="min-h-screen bg-[#0d0d0d] text-white">
      <Toaster theme="dark" />

      {/* Header */}
      <header className="border-b border-zinc-800">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <Link href="/" className="text-xl font-bold">
              Epoch
            </Link>
            <nav className="hidden md:flex items-center gap-6">
              <Link href="/markets" className="text-sm text-white font-medium">
                Markets
              </Link>
              <Link
                href="/markets/positions"
                className="text-sm text-zinc-400 hover:text-white transition-colors"
              >
                Portfolio
              </Link>
            </nav>
          </div>
          <WalletButton />
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 py-8">
        {/* Page Header */}
        <div className="flex items-start justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-2">Prediction Markets</h1>
            <p className="text-zinc-400">
              Private betting powered by Arcium MPC encryption
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={refetch}
              disabled={loading}
              className="px-4 py-2 rounded-xl bg-zinc-800 text-zinc-300 hover:bg-zinc-700 hover:text-white transition-all text-sm font-medium disabled:opacity-50"
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
          <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400">
            {error}
          </div>
        )}

        {/* Stats Banner */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="bg-zinc-900 rounded-2xl p-5 border border-zinc-800">
            <p className="text-zinc-400 text-sm mb-1">Total Markets</p>
            <p className="text-2xl font-bold">{markets.length}</p>
          </div>
          <div className="bg-zinc-900 rounded-2xl p-5 border border-zinc-800">
            <p className="text-zinc-400 text-sm mb-1">Open for Betting</p>
            <p className="text-2xl font-bold text-green-400">
              {markets.filter((m) => m.canBet).length}
            </p>
          </div>
          <div className="bg-zinc-900 rounded-2xl p-5 border border-zinc-800">
            <p className="text-zinc-400 text-sm mb-1">Total Positions</p>
            <p className="text-2xl font-bold text-blue-400">
              {markets.reduce((sum, m) => sum + m.totalPositions, 0)}
            </p>
          </div>
        </div>

        {/* Markets List */}
        <MarketList markets={markets} loading={loading} onBetPlaced={refetch} />
      </main>
    </div>
  );
}
