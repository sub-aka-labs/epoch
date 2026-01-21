"use client";

import { use, useCallback } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { WalletButton } from "@/components/WalletButton";
import { useMarket } from "@/hooks/useMarket";
import { usePosition } from "@/hooks/usePosition";
import { useHeliusWebSocket } from "@/hooks/useHeliusWebSocket";
import { MarketDetails } from "@/components/markets";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Toaster } from "@/components/ui/sonner";
import { Skeleton } from "@/components/ui/skeleton";
import Link from "next/link";
import { formatTokenAmount } from "@/lib/contracts/program";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function MarketPage({ params }: PageProps) {
  const { id } = use(params);
  const wallet = useWallet();
  const { market, loading, error, refetch } = useMarket(id);
  const { position, loading: positionLoading, refetch: refetchPosition } = usePosition(id);

  const handleRealtimeUpdate = useCallback(() => {
    refetch();
    refetchPosition();
  }, [refetch, refetchPosition]);

  const { connected: wsConnected } = useHeliusWebSocket(
    market?.publicKey?.toBase58() || null,
    handleRealtimeUpdate
  );

  const isAuthority =
    wallet.publicKey && market?.authority === wallet.publicKey.toBase58();

  return (
    <div className="min-h-screen bg-background">
      <Toaster />

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
                className="text-sm font-medium text-muted-foreground hover:text-foreground"
              >
                My Positions
              </Link>
            </nav>
          </div>
          <div className="flex items-center gap-4">
            {wsConnected && (
              <Badge variant="outline" className="text-green-600 border-green-600">
                Live
              </Badge>
            )}
            <WalletButton />
          </div>
        </div>
      </header>

      <div className="border-b">
        <div className="container mx-auto px-4 py-3">
          <nav className="text-sm text-muted-foreground">
            <Link href="/markets" className="hover:text-foreground">
              Markets
            </Link>
            <span className="mx-2">/</span>
            <span className="text-foreground">Market #{id}</span>
          </nav>
        </div>
      </div>

      <main className="container mx-auto px-4 py-8">
        {error && (
          <div className="mb-6 p-4 rounded-lg bg-destructive/10 text-destructive">
            {error}
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <MarketDetails market={market} loading={loading} onRefresh={refetch} />
          </div>

          <div className="space-y-6">
            {wallet.publicKey && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Your Position</CardTitle>
                </CardHeader>
                <CardContent>
                  {positionLoading ? (
                    <div className="space-y-3">
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-4 w-3/4" />
                    </div>
                  ) : position ? (
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Deposit</span>
                        <span className="font-medium">
                          {formatTokenAmount(BigInt(position.depositAmount))} SOL
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Status</span>
                        <span className="font-medium">{position.status}</span>
                      </div>
                      {position.payoutAmount !== "0" && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Payout</span>
                          <span className="font-medium text-green-600">
                            {formatTokenAmount(BigInt(position.payoutAmount))} SOL
                          </span>
                        </div>
                      )}
                      {market && (
                        <PositionActions
                          market={market}
                          position={position}
                          onAction={() => {
                            refetch();
                            refetchPosition();
                          }}
                        />
                      )}
                    </div>
                  ) : (
                    <p className="text-muted-foreground text-center py-4">
                      No position in this market
                    </p>
                  )}
                </CardContent>
              </Card>
            )}

            {isAuthority && market && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Admin Actions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <AdminActions market={market} onAction={refetch} />
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  Infrastructure
                  <Badge variant="secondary">Helius</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground space-y-2">
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${wsConnected ? "bg-green-500" : "bg-gray-400"}`} />
                  <span>WebSocket: {wsConnected ? "Connected" : "Disconnected"}</span>
                </div>
                <p>Real-time updates via Helius RPC</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}

import { MarketDisplay, MarketStatus, PositionStatus } from "@/types/market";
import { PublicKey } from "@solana/web3.js";
import { toast } from "sonner";

function AdminActions({
  market,
  onAction,
}: {
  market: MarketDisplay;
  onAction: () => void;
}) {
  const { openMarket, closeBetting, resolveMarket, cancelMarket, loading } =
    useMarket(market.marketId);

  const handleOpen = async () => {
    const tx = await openMarket();
    if (tx) onAction();
  };

  const handleClose = async () => {
    const tx = await closeBetting();
    if (tx) onAction();
  };

  const handleResolveYes = async () => {
    const tx = await resolveMarket(1);
    if (tx) onAction();
  };

  const handleResolveNo = async () => {
    const tx = await resolveMarket(0);
    if (tx) onAction();
  };

  const handleCancel = async () => {
    const tx = await cancelMarket();
    if (tx) onAction();
  };

  return (
    <>
      {market.status === MarketStatus.Created && (
        <Button className="w-full" onClick={handleOpen} disabled={loading}>
          Open Market
        </Button>
      )}

      {market.status === MarketStatus.Open && (
        <Button
          className="w-full"
          variant="secondary"
          onClick={handleClose}
          disabled={loading}
        >
          Close Betting
        </Button>
      )}

      {market.status === MarketStatus.BettingClosed && (
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground text-center">
            Resolve this market:
          </p>
          <div className="grid grid-cols-2 gap-2">
            <Button
              variant="outline"
              className="border-green-500 text-green-600 hover:bg-green-50"
              onClick={handleResolveYes}
              disabled={loading}
            >
              YES Wins
            </Button>
            <Button
              variant="outline"
              className="border-red-500 text-red-600 hover:bg-red-50"
              onClick={handleResolveNo}
              disabled={loading}
            >
              NO Wins
            </Button>
          </div>
        </div>
      )}

      {(market.status === MarketStatus.Created ||
        market.status === MarketStatus.Open) && (
        <Button
          className="w-full"
          variant="destructive"
          onClick={handleCancel}
          disabled={loading}
        >
          Cancel Market
        </Button>
      )}
    </>
  );
}

function PositionActions({
  market,
  position,
  onAction,
}: {
  market: MarketDisplay;
  position: { publicKey: PublicKey; status: PositionStatus; payoutAmount: string };
  onAction: () => void;
}) {
  const { computePayout, claimPayout, loading } = usePosition(market.marketId);

  const handleComputePayout = async () => {
    const marketPda = new PublicKey(market.publicKey);
    const result = await computePayout(marketPda, position.publicKey);
    if (result.success) {
      toast.success("Payout computation queued");
      onAction();
    } else {
      toast.error(result.error || "Failed to compute payout");
    }
  };

  const handleClaimPayout = async () => {
    const marketPda = new PublicKey(market.publicKey);
    const result = await claimPayout(marketPda);
    if (result.success) {
      toast.success("Payout claimed!");
      onAction();
    } else {
      toast.error(result.error || "Failed to claim payout");
    }
  };

  const isResolved = market.status === MarketStatus.Resolved;
  const canComputePayout = isResolved && position.status === PositionStatus.Processed;
  const canClaim = position.status === PositionStatus.PayoutComputed && position.payoutAmount !== "0";
  const isPending = position.status === PositionStatus.Pending;

  return (
    <div className="space-y-2 pt-2 border-t">
      {isPending && isResolved && (
        <p className="text-xs text-amber-600">
          Waiting for MPC to process your encrypted bet...
        </p>
      )}

      {canComputePayout && (
        <Button
          className="w-full"
          onClick={handleComputePayout}
          disabled={loading}
        >
          Compute Payout
        </Button>
      )}

      {canClaim && (
        <Button
          className="w-full bg-green-600 hover:bg-green-700"
          onClick={handleClaimPayout}
          disabled={loading}
        >
          Claim Payout
        </Button>
      )}
    </div>
  );
}
