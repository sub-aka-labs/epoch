"use client";

import { useWallet } from "@solana/wallet-adapter-react";
import { WalletButton } from "@/components/WalletButton";
import { useMarkets } from "@/hooks/useMarkets";
import { MarketList, CreateMarketDialog } from "@/components/markets";
import { Button } from "@/components/ui/button";
import { Toaster } from "@/components/ui/sonner";
import Link from "next/link";

export default function MarketsPage() {
  const wallet = useWallet();
  const { markets, loading, error, refetch } = useMarkets();

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
                className="text-sm font-medium text-foreground"
              >
                Markets
              </Link>
              <Link
                href="/markets/positions"
                className="text-sm font-medium text-muted-foreground hover:text-foreground"
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
            <h1 className="text-3xl font-bold">Prediction Markets</h1>
            <p className="text-muted-foreground mt-1">
              Private betting with Arcium MPC encryption
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={refetch} disabled={loading}>
              Refresh
            </Button>
            {wallet.publicKey && <CreateMarketDialog onMarketCreated={refetch} />}
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-lg bg-destructive/10 text-destructive">
            {error}
          </div>
        )}

        <MarketList markets={markets} loading={loading} />
      </main>
    </div>
  );
}
