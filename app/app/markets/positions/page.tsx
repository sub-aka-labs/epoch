"use client";

import { useWallet } from "@solana/wallet-adapter-react";
import { WalletButton } from "@/components/WalletButton";
import { usePosition, PositionDisplay } from "@/hooks/usePosition";
import { PositionCard } from "@/components/markets";
import { Toaster } from "@/components/ui/sonner";
import { PositionStatus } from "@/types/market";
import { formatTokenAmount } from "@/lib/contracts/program";
import Link from "next/link";

export default function PositionsPage() {
  const wallet = useWallet();
  const { allPositions, loading, error, refetchAll, claimPayout } = usePosition();

  // Calculate stats
  const totalDeposited = allPositions.reduce(
    (sum, p) => sum + BigInt(p.depositAmount),
    BigInt(0)
  );
  const totalPayout = allPositions.reduce(
    (sum, p) => sum + BigInt(p.payoutAmount),
    BigInt(0)
  );
  const pendingCount = allPositions.filter(
    (p) => p.status === PositionStatus.Pending || p.status === PositionStatus.Processed
  ).length;
  const claimableCount = allPositions.filter(
    (p) => p.status === PositionStatus.PayoutComputed && BigInt(p.payoutAmount) > BigInt(0)
  ).length;

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
              <Link
                href="/markets"
                className="text-sm text-zinc-400 hover:text-white transition-colors"
              >
                Markets
              </Link>
              <Link href="/markets/positions" className="text-sm text-white font-medium">
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
            <h1 className="text-3xl font-bold mb-2">Portfolio</h1>
            <p className="text-zinc-400">View and manage your betting positions</p>
          </div>
          {wallet.publicKey && (
            <button
              onClick={refetchAll}
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
          )}
        </div>

        {!wallet.publicKey ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-20 h-20 mb-6 rounded-full bg-zinc-800 flex items-center justify-center">
              <svg className="w-10 h-10 text-zinc-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <p className="text-zinc-400 text-lg mb-4">Connect your wallet to view positions</p>
            <WalletButton />
          </div>
        ) : loading ? (
          <PositionsLoading />
        ) : error ? (
          <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400">
            {error}
          </div>
        ) : allPositions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-20 h-20 mb-6 rounded-full bg-zinc-800 flex items-center justify-center">
              <svg className="w-10 h-10 text-zinc-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <p className="text-zinc-400 text-lg mb-4">No positions yet</p>
            <Link href="/markets">
              <button className="px-6 py-3 rounded-xl bg-blue-600 text-white hover:bg-blue-700 transition-all font-medium">
                Browse Markets
              </button>
            </Link>
          </div>
        ) : (
          <>
            {/* Stats Banner */}
            <div className="grid grid-cols-4 gap-4 mb-8">
              <div className="bg-zinc-900 rounded-2xl p-5 border border-zinc-800">
                <p className="text-zinc-400 text-sm mb-1">Total Positions</p>
                <p className="text-2xl font-bold">{allPositions.length}</p>
              </div>
              <div className="bg-zinc-900 rounded-2xl p-5 border border-zinc-800">
                <p className="text-zinc-400 text-sm mb-1">Total Deposited</p>
                <p className="text-2xl font-bold">
                  {formatTokenAmount(totalDeposited)} <span className="text-zinc-400 text-base">SOL</span>
                </p>
              </div>
              <div className="bg-zinc-900 rounded-2xl p-5 border border-zinc-800">
                <p className="text-zinc-400 text-sm mb-1">Total Payout</p>
                <p className="text-2xl font-bold text-green-400">
                  {formatTokenAmount(totalPayout)} <span className="text-green-400/70 text-base">SOL</span>
                </p>
              </div>
              <div className="bg-zinc-900 rounded-2xl p-5 border border-zinc-800">
                <p className="text-zinc-400 text-sm mb-1">Status</p>
                <div className="flex items-center gap-3">
                  {pendingCount > 0 && (
                    <span className="text-yellow-400 text-sm">{pendingCount} pending</span>
                  )}
                  {claimableCount > 0 && (
                    <span className="text-green-400 text-sm">{claimableCount} claimable</span>
                  )}
                  {pendingCount === 0 && claimableCount === 0 && (
                    <span className="text-zinc-400 text-sm">All settled</span>
                  )}
                </div>
              </div>
            </div>

            {/* Positions Grid */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {allPositions.map((position) => (
                <PositionCard
                  key={position.publicKey.toBase58()}
                  position={position}
                  onClaim={async () => {
                    await claimPayout(position.market);
                    refetchAll();
                  }}
                />
              ))}
            </div>
          </>
        )}
      </main>
    </div>
  );
}

function PositionsLoading() {
  return (
    <>
      {/* Stats Skeleton */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-zinc-900 rounded-2xl p-5 border border-zinc-800">
            <div className="h-4 w-24 bg-zinc-800 rounded animate-pulse mb-2" />
            <div className="h-8 w-16 bg-zinc-800 rounded animate-pulse" />
          </div>
        ))}
      </div>

      {/* Cards Skeleton */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-zinc-900 rounded-2xl p-5 border border-zinc-800 space-y-4">
            <div className="flex justify-between">
              <div className="h-10 w-24 bg-zinc-800 rounded animate-pulse" />
              <div className="h-6 w-16 bg-zinc-800 rounded-full animate-pulse" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="h-16 bg-zinc-800 rounded-xl animate-pulse" />
              <div className="h-16 bg-zinc-800 rounded-xl animate-pulse" />
            </div>
            <div className="h-10 bg-zinc-800 rounded-xl animate-pulse" />
          </div>
        ))}
      </div>
    </>
  );
}
