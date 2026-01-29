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
  const { allPositions, loading, error, refetchAll, claimPayout } =
    usePosition();

  // Calculate stats
  const totalDeposited = allPositions.reduce(
    (sum, p) => sum + BigInt(p.depositAmount),
    BigInt(0),
  );
  const totalPayout = allPositions.reduce(
    (sum, p) => sum + BigInt(p.payoutAmount),
    BigInt(0),
  );
  const pendingCount = allPositions.filter(
    (p) =>
      p.status === PositionStatus.Pending ||
      p.status === PositionStatus.Processed,
  ).length;
  const claimableCount = allPositions.filter(
    (p) =>
      p.status === PositionStatus.PayoutComputed &&
      BigInt(p.payoutAmount) > BigInt(0),
  ).length;

  return (
    <div className="bg-background text-foreground min-h-screen">
      <Toaster />
      <Header />

      {/* Main Content */}
      <main className="mx-auto max-w-6xl px-4 py-8">
        {/* Page Header */}
        <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
          <div>
            <h1 className="mb-2 text-2xl font-bold tracking-tight sm:text-3xl">
              Portfolio
            </h1>
            <p className="text-muted-foreground text-sm sm:text-base">
              View and manage your betting positions
            </p>
          </div>
          {wallet.publicKey && (
            <button
              onClick={refetchAll}
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
            <div className="border-border mb-6 flex h-16 w-16 items-center justify-center border">
              <IconWallet
                size={28}
                className="text-muted-foreground"
                stroke={1.5}
              />
            </div>
            <p className="text-foreground mb-2 text-lg font-medium">
              Connect Wallet
            </p>
            <p className="text-muted-foreground mb-6 text-sm">
              Connect your wallet to view your positions
            </p>
            <WalletButton />
          </div>
        ) : loading ? (
          <PositionsLoading />
        ) : error ? (
          <div className="border border-rose-500/20 bg-rose-500/10 p-4 text-rose-400">
            {error}
          </div>
        ) : allPositions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24">
            <p className="text-foreground mb-2 text-lg font-medium">
              No Positions Yet
            </p>
            <p className="text-muted-foreground mb-6 text-sm">
              Start betting on markets to build your portfolio
            </p>
            <Link href="/markets">
              <button className="inline-flex h-8 cursor-pointer items-center gap-1.5 bg-[#10b981] px-3 text-[13px] font-medium text-black transition-colors hover:bg-[#059669]">
                Browse Markets
                <IconArrowRight size={14} stroke={2} />
              </button>
            </Link>
          </div>
        ) : (
          <>
            {/* Stats Banner */}
            <div className="mb-8 grid grid-cols-2 gap-3 md:gap-4 lg:grid-cols-4">
              <div className="bg-card border-border border p-5">
                <p className="text-muted-foreground mb-1 text-sm">
                  Total Positions
                </p>
                <p className="text-2xl font-bold">{allPositions.length}</p>
              </div>
              <div className="bg-card border-border border p-5">
                <p className="text-muted-foreground mb-1 text-sm">
                  Total Deposited
                </p>
                <p className="text-2xl font-bold">
                  {formatTokenAmount(totalDeposited)}{" "}
                  <span className="text-muted-foreground text-base">SOL</span>
                </p>
              </div>
              <div className="bg-card border-border border p-5">
                <p className="text-muted-foreground mb-1 text-sm">
                  Total Payout
                </p>
                <p className="text-2xl font-bold text-emerald-400">
                  {formatTokenAmount(totalPayout)}{" "}
                  <span className="text-base text-emerald-400/70">SOL</span>
                </p>
              </div>
              <div className="bg-card border-border border p-5">
                <p className="text-muted-foreground mb-1 text-sm">Status</p>
                <div className="flex items-center gap-3">
                  {pendingCount > 0 && (
                    <span className="text-sm text-amber-400">
                      {pendingCount} pending
                    </span>
                  )}
                  {claimableCount > 0 && (
                    <span className="text-sm text-emerald-400">
                      {claimableCount} claimable
                    </span>
                  )}
                  {pendingCount === 0 && claimableCount === 0 && (
                    <span className="text-muted-foreground text-sm">
                      All settled
                    </span>
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
      <div className="mb-8 grid grid-cols-2 gap-3 md:gap-4 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-card border-border border p-5">
            <div className="bg-muted mb-2 h-4 w-24 animate-pulse" />
            <div className="bg-muted h-8 w-16 animate-pulse" />
          </div>
        ))}
      </div>

      {/* Cards Skeleton */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-card border-border space-y-4 border p-5">
            <div className="flex justify-between">
              <div className="bg-muted h-10 w-24 animate-pulse" />
              <div className="bg-muted h-6 w-16 animate-pulse" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-muted h-16 animate-pulse" />
              <div className="bg-muted h-16 animate-pulse" />
            </div>
            <div className="bg-muted h-10 animate-pulse" />
          </div>
        ))}
      </div>
    </>
  );
}
