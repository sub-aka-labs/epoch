"use client";

import { usePrivyWallet } from "@/hooks/usePrivyWallet";
import { IconWallet, IconArrowRight } from "@tabler/icons-react";
import { Header } from "@/components/Header";
import { WalletButton } from "@/components/WalletButton";
import { usePosition } from "@/hooks/usePosition";
import { PositionCard } from "@/components/markets";
import { Toaster } from "@/components/ui/sonner";
import { PositionStatus } from "@/types/market";
import { formatTokenAmount } from "@/lib/contracts/program";
import Link from "next/link";

export default function PositionsPage() {
  const wallet = usePrivyWallet();
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
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      <Toaster theme="dark" />
      <Header />

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 py-8">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold mb-2 tracking-tight">Portfolio</h1>
            <p className="text-zinc-500 text-sm sm:text-base">View and manage your betting positions</p>
          </div>
          {wallet.publicKey && (
            <button
              onClick={refetchAll}
              disabled={loading}
              className="h-8 px-3 bg-zinc-800 text-zinc-300 hover:bg-zinc-700 hover:text-white transition-colors text-[13px] font-medium disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer border border-zinc-700"
            >
              {loading ? (
                <span className="flex items-center gap-1.5">
                  <svg className="w-3.5 h-3.5 animate-spin" viewBox="0 0 24 24">
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
          <div className="flex flex-col items-center justify-center py-24">
            <div className="w-16 h-16 mb-6 border border-zinc-800 flex items-center justify-center">
              <IconWallet size={28} className="text-zinc-600" stroke={1.5} />
            </div>
            <p className="text-zinc-300 text-lg font-medium mb-2">Connect Wallet</p>
            <p className="text-zinc-600 text-sm mb-6">Connect your wallet to view your positions</p>
            <WalletButton />
          </div>
        ) : loading ? (
          <PositionsLoading />
        ) : error ? (
          <div className="p-4 bg-rose-500/10 border border-rose-500/20 text-rose-400">
            {error}
          </div>
        ) : allPositions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24">
            <p className="text-zinc-300 text-lg font-medium mb-2">No Positions Yet</p>
            <p className="text-zinc-600 text-sm mb-6">Start betting on markets to build your portfolio</p>
            <Link href="/markets">
              <button className="inline-flex items-center gap-1.5 h-8 px-3 bg-[#10b981] text-black hover:bg-[#059669] transition-colors text-[13px] font-medium cursor-pointer">
                Browse Markets
                <IconArrowRight size={14} stroke={2} />
              </button>
            </Link>
          </div>
        ) : (
          <>
            {/* Stats Banner */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mb-8">
              <div className="bg-zinc-900 p-5 border border-zinc-800">
                <p className="text-zinc-500 text-sm mb-1">Total Positions</p>
                <p className="text-2xl font-bold">{allPositions.length}</p>
              </div>
              <div className="bg-zinc-900 p-5 border border-zinc-800">
                <p className="text-zinc-500 text-sm mb-1">Total Deposited</p>
                <p className="text-2xl font-bold">
                  {formatTokenAmount(totalDeposited)} <span className="text-zinc-500 text-base">SOL</span>
                </p>
              </div>
              <div className="bg-zinc-900 p-5 border border-zinc-800">
                <p className="text-zinc-500 text-sm mb-1">Total Payout</p>
                <p className="text-2xl font-bold text-emerald-400">
                  {formatTokenAmount(totalPayout)} <span className="text-emerald-400/70 text-base">SOL</span>
                </p>
              </div>
              <div className="bg-zinc-900 p-5 border border-zinc-800">
                <p className="text-zinc-500 text-sm mb-1">Status</p>
                <div className="flex items-center gap-3">
                  {pendingCount > 0 && (
                    <span className="text-amber-400 text-sm">{pendingCount} pending</span>
                  )}
                  {claimableCount > 0 && (
                    <span className="text-emerald-400 text-sm">{claimableCount} claimable</span>
                  )}
                  {pendingCount === 0 && claimableCount === 0 && (
                    <span className="text-zinc-500 text-sm">All settled</span>
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
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mb-8">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-zinc-900 p-5 border border-zinc-800">
            <div className="h-4 w-24 bg-zinc-800 animate-pulse mb-2" />
            <div className="h-8 w-16 bg-zinc-800 animate-pulse" />
          </div>
        ))}
      </div>

      {/* Cards Skeleton */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-zinc-900 p-5 border border-zinc-800 space-y-4">
            <div className="flex justify-between">
              <div className="h-10 w-24 bg-zinc-800 animate-pulse" />
              <div className="h-6 w-16 bg-zinc-800 animate-pulse" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="h-16 bg-zinc-800 animate-pulse" />
              <div className="h-16 bg-zinc-800 animate-pulse" />
            </div>
            <div className="h-10 bg-zinc-800 animate-pulse" />
          </div>
        ))}
      </div>
    </>
  );
}
