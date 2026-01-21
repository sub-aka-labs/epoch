"use client";

import { useWallet } from "@solana/wallet-adapter-react";
import { WalletButton } from "@/components/WalletButton";
import { usePosition, PositionDisplay } from "@/hooks/usePosition";
import { PositionCard } from "@/components/markets";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Toaster } from "@/components/ui/sonner";
import Link from "next/link";

export default function PositionsPage() {
  const wallet = useWallet();
  const { allPositions, loading, error, refetchAll, claimPayout } = usePosition();

  return (
    <div className="min-h-screen bg-background">
      <Toaster />

      {/* Header */}
      <header className="border-b">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link href="/" className="text-xl font-bold">
              Epoch
            </Link>
            <nav className="hidden md:flex items-center gap-4">
              <Link
                href="/markets"
                className="text-sm font-medium text-muted-foreground hover:text-foreground"
              >
                Markets
              </Link>
              <Link
                href="/markets/positions"
                className="text-sm font-medium text-foreground"
              >
                My Positions
              </Link>
            </nav>
          </div>
          <div className="flex items-center gap-4">
            <WalletButton />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold">My Positions</h1>
            <p className="text-muted-foreground mt-1">
              View and manage your betting positions
            </p>
          </div>
          <Button variant="outline" onClick={refetchAll} disabled={loading}>
            Refresh
          </Button>
        </div>

        {!wallet.publicKey ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground mb-4">
              Connect your wallet to view your positions
            </p>
            <WalletButton />
          </div>
        ) : loading ? (
          <PositionsLoading />
        ) : error ? (
          <div className="p-4 rounded-lg bg-destructive/10 text-destructive">
            {error}
          </div>
        ) : allPositions.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground mb-4">
              You don't have any positions yet
            </p>
            <Link href="/markets">
              <Button>Browse Markets</Button>
            </Link>
          </div>
        ) : (
          <PositionsGrid
            positions={allPositions}
            onClaim={async (position) => {
              await claimPayout(position.market);
              refetchAll();
            }}
          />
        )}
      </main>
    </div>
  );
}

function PositionsLoading() {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {[1, 2, 3].map((i) => (
        <div key={i} className="p-6 border rounded-lg space-y-4">
          <div className="flex justify-between">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-5 w-20" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </div>
          <Skeleton className="h-10 w-full" />
        </div>
      ))}
    </div>
  );
}

function PositionsGrid({
  positions,
  onClaim,
}: {
  positions: PositionDisplay[];
  onClaim: (position: PositionDisplay) => void;
}) {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {positions.map((position) => (
        <PositionCard
          key={position.publicKey.toBase58()}
          position={position}
          onClaim={() => onClaim(position)}
        />
      ))}
    </div>
  );
}
