"use client";

import { use, useCallback, useState } from "react";
import { usePrivyWallet } from "@/hooks/usePrivyWallet";
import { PublicKey } from "@solana/web3.js";
import { Header } from "@/components/Header";
import { WalletButton } from "@/components/WalletButton";
import { useMarket } from "@/hooks/useMarket";
import { usePosition } from "@/hooks/usePosition";
import { useBet } from "@/hooks/useBet";
import { useHeliusWebSocket } from "@/hooks/useHeliusWebSocket";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Toaster } from "@/components/ui/sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { CountdownBadge } from "@/components/ui/countdown";
import { toast } from "sonner";
import { formatTokenAmount } from "@/lib/contracts/program";
import { MarketStatus, PositionStatus } from "@/types/market";

interface PageProps {
  params: Promise<{ id: string }>;
}

function getStatusVariant(status: MarketStatus) {
  switch (status) {
    case MarketStatus.Open:
    case MarketStatus.BettingClosed:
      return "success";
    case MarketStatus.Created:
      return "warning";
    case MarketStatus.Resolved:
      return "info";
    case MarketStatus.Settled:
      return "muted";
    case MarketStatus.Cancelled:
      return "destructive";
    default:
      return "muted";
  }
}

function getPositionStatusVariant(status: PositionStatus) {
  switch (status) {
    case PositionStatus.Claimed:
      return "success";
    case PositionStatus.Refunded:
      return "muted";
    case PositionStatus.PayoutComputed:
      return "info";
    case PositionStatus.Processed:
      return "violet";
    case PositionStatus.Pending:
      return "warning";
    default:
      return "muted";
  }
}

export default function MarketPage({ params }: PageProps) {
  const { id } = use(params);
  const wallet = usePrivyWallet();
  const { market, loading, error, refetch, openMarket, resolveMarket } =
    useMarket(id);
  const {
    position,
    loading: positionLoading,
    refetch: refetchPosition,
    computePayout,
    claimPayout,
  } = usePosition(id);
  const { placeBet, loading: betLoading } = useBet();

  const [betAmount, setBetAmount] = useState("");
  const [selectedOutcome, setSelectedOutcome] = useState<"yes" | "no" | null>(
    null,
  );

  const handleRealtimeUpdate = useCallback(() => {
    refetch();
    refetchPosition();
  }, [refetch, refetchPosition]);

  const { connected: wsConnected } = useHeliusWebSocket(
    market?.publicKey?.toBase58() || null,
    handleRealtimeUpdate,
  );

  const isAuthority =
    wallet.publicKey && market?.authority === wallet.publicKey.toBase58();

  const handlePlaceBet = async () => {
    if (!selectedOutcome || !betAmount || !market) return;

    const result = await placeBet({
      marketId: market.marketId,
      outcome: selectedOutcome,
      amount: parseFloat(betAmount),
      tokenMint: new PublicKey(market.tokenMint),
    });

    if (result.success) {
      toast.success("Bet placed successfully!");
      setBetAmount("");
      setSelectedOutcome(null);
      refetch();
      refetchPosition();
    } else {
      toast.error(result.error || "Failed to place bet");
    }
  };

  const handleOpenMarket = async () => {
    const tx = await openMarket();
    if (tx) {
      toast.success("Market opened for betting!");
      refetch();
    } else {
      toast.error("Failed to open market");
    }
  };

  const handleResolve = async (outcome: 0 | 1) => {
    const tx = await resolveMarket(outcome);
    if (tx) {
      toast.success(`Market resolved to ${outcome === 1 ? "YES" : "NO"}`);
      refetch();
    }
  };

  const handleComputePayout = async () => {
    if (!market || !position) return;
    const marketPda = new PublicKey(market.publicKey);
    const result = await computePayout(marketPda, position.publicKey);
    if (result.success) {
      toast.success("Payout computation queued");
      refetchPosition();
    } else {
      toast.error(result.error || "Failed to compute payout");
    }
  };

  const handleClaimPayout = async () => {
    if (!market) return;
    const marketPda = new PublicKey(market.publicKey);
    const result = await claimPayout(marketPda);
    if (result.success) {
      toast.success("Payout claimed!");
      refetchPosition();
    } else {
      toast.error(result.error || "Failed to claim payout");
    }
  };

  if (loading) {
    return (
      <div className="bg-background min-h-screen">
        <Header showLive={wsConnected} />
        <main className="mx-auto max-w-6xl px-4 py-8">
          <Skeleton className="mb-4 h-8 w-3/4" />
          <Skeleton className="h-64 w-full" />
        </main>
      </div>
    );
  }

  if (error || !market) {
    return (
      <div className="bg-background min-h-screen">
        <Header showLive={wsConnected} />
        <main className="mx-auto max-w-6xl px-4 py-8">
          <Card className="py-12 text-center border-rose-200 dark:border-rose-500/20 bg-rose-50 dark:bg-rose-500/10">
            <p className="text-rose-700 dark:text-rose-400">{error || "Market not found"}</p>
          </Card>
        </main>
      </div>
    );
  }

  const canBet = market.status === MarketStatus.Open && market.canBet;
  const isResolved = market.status === MarketStatus.Resolved;

  return (
    <div className="bg-background text-foreground min-h-screen">
      <Toaster />
      <Header showLive={wsConnected} />

      <main className="mx-auto max-w-6xl px-4 py-8">
        {/* Market Header */}
        <div className="mb-6">
          <div className="mb-3 flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
            <h1 className="text-lg leading-tight font-bold tracking-tight sm:text-xl">
              {market.question}
            </h1>
            <Badge variant={getStatusVariant(market.status)} className="shrink-0">
              {market.status}
            </Badge>
          </div>

          {isResolved && market.winningOutcome && (
            <div className="inline-flex items-center gap-2">
              <span className="text-muted-foreground text-[13px]">Outcome:</span>
              <Badge variant={market.winningOutcome === "yes" ? "success" : "destructive"}>
                {market.winningOutcome.toUpperCase()}
              </Badge>
            </div>
          )}
        </div>

        <div className="space-y-4">
          {/* Open Market for Authority */}
          {isAuthority && market.status === MarketStatus.Created && (
            <Card className="p-5 hover:border-border">
              <div className="mb-3 flex items-center gap-2">
                <div className="h-1.5 w-1.5 bg-amber-500 dark:bg-amber-400" />
                <h2 className="text-sm font-medium">Market Not Open</h2>
              </div>
              <p className="text-muted-foreground mb-4 text-[13px]">
                This market is created but not yet open for betting. Open it to
                allow users to place bets.
              </p>
              <Button onClick={handleOpenMarket}>
                Open Market for Betting
              </Button>
            </Card>
          )}

          {/* Waiting for Market to Open - for non-authority users */}
          {!isAuthority && market.status === MarketStatus.Created && (
            <Card className="p-5 hover:border-border">
              <div className="mb-2 flex items-center gap-2">
                <div className="h-1.5 w-1.5 bg-amber-500 dark:bg-amber-400" />
                <h2 className="text-sm font-medium">Market Not Active</h2>
              </div>
              <p className="text-muted-foreground text-[13px]">
                This market needs to be opened by the market authority before
                betting can begin.
              </p>
            </Card>
          )}

          {/* Betting Ended - Awaiting Resolution */}
          {market.status === MarketStatus.Open &&
            !canBet &&
            new Date() >= market.bettingEndTime && (
              <Card className="p-5 hover:border-border">
                <div className="mb-2 flex items-center gap-2">
                  <div className="h-1.5 w-1.5 bg-emerald-500 dark:bg-emerald-400" />
                  <h2 className="text-sm font-medium">Betting Closed</h2>
                </div>
                <p className="text-muted-foreground text-[13px]">
                  The betting period has ended. Awaiting market resolution.
                </p>
                {isAuthority && (
                  <p className="text-foreground mt-2 text-[13px]">
                    As the market authority, you can resolve this market below.
                  </p>
                )}
              </Card>
            )}

          {/* Betting Not Started Yet */}
          {market.status === MarketStatus.Open &&
            !canBet &&
            new Date() < market.bettingStartTime && (
              <Card className="p-5 hover:border-border">
                <div className="mb-2 flex items-center gap-2">
                  <div className="h-1.5 w-1.5 bg-sky-500 dark:bg-sky-400" />
                  <h2 className="text-sm font-medium">Betting Opens Soon</h2>
                </div>
                <p className="text-muted-foreground text-[13px]">
                  Betting starts on {market.bettingStartTime.toLocaleString()}
                </p>
              </Card>
            )}

          {/* Betting Card */}
          {canBet && (
            <Card className="p-6 hover:border-border">
              <div className="mb-5 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 dark:bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500 dark:bg-emerald-400 shadow-[0_0_10px_3px_rgba(16,185,129,0.5)]"></span>
                  </span>
                  <h2 className="text-lg font-medium">Place Your Bet</h2>
                </div>
                <CountdownBadge
                  targetDate={market.bettingEndTime}
                  label="Ends in"
                />
              </div>

              <div className="mb-5 grid grid-cols-2 gap-3">
                <Button
                  onClick={() => setSelectedOutcome("yes")}
                  className={`h-14 text-base font-semibold ${
                    selectedOutcome === "yes"
                      ? "bg-emerald-500 text-white hover:bg-emerald-600"
                      : "bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-500/20 shadow-none"
                  }`}
                >
                  YES
                </Button>
                <Button
                  onClick={() => setSelectedOutcome("no")}
                  className={`h-14 text-base font-semibold ${
                    selectedOutcome === "no"
                      ? "bg-rose-500 text-white hover:bg-rose-600"
                      : "bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/30 text-rose-600 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-500/20 shadow-none"
                  }`}
                >
                  NO
                </Button>
              </div>

              <div className="mb-5">
                <label className="text-muted-foreground mb-2 block text-sm">
                  Amount (SOL)
                </label>
                <div className="flex gap-3">
                  <Input
                    type="number"
                    placeholder="0.00"
                    value={betAmount}
                    onChange={(e) => setBetAmount(e.target.value)}
                    className="h-12 flex-1 text-base"
                  />
                  {[0.1, 0.5, 1].map((amount) => (
                    <Button
                      key={amount}
                      variant="secondary"
                      onClick={() => setBetAmount(amount.toString())}
                      className="h-12 px-5"
                    >
                      {amount}
                    </Button>
                  ))}
                </div>
              </div>

              {wallet.publicKey ? (
                <Button
                  onClick={handlePlaceBet}
                  disabled={!selectedOutcome || !betAmount || betLoading}
                  className="h-12 w-full text-base font-semibold"
                >
                  {betLoading ? "Placing Bet..." : "Place Bet"}
                </Button>
              ) : (
                <WalletButton />
              )}

              <p className="text-muted-foreground mt-4 text-center text-xs">
                Your bet is encrypted with Arcium MPC
              </p>
            </Card>
          )}

          {/* Resolved State */}
          {isResolved && (
            <Card className="p-5 hover:border-border">
              <div className="py-3 text-center">
                <p className="text-muted-foreground mb-2 text-[13px]">
                  Market Resolved
                </p>
                <Badge
                  variant={market.winningOutcome === "yes" ? "success" : "destructive"}
                  className="text-lg px-4 py-1"
                >
                  {market.winningOutcome?.toUpperCase()}
                </Badge>
              </div>
            </Card>
          )}

          {/* Resolution Controls for Authority */}
          {isAuthority &&
            !isResolved &&
            market.status !== MarketStatus.Cancelled &&
            new Date() >= market.bettingEndTime && (
              <Card className="p-5 hover:border-border">
                <h2 className="mb-3 text-sm font-medium">Resolve Market</h2>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    onClick={() => handleResolve(1)}
                    className="bg-emerald-500 text-white hover:bg-emerald-600"
                  >
                    Resolve YES
                  </Button>
                  <Button
                    onClick={() => handleResolve(0)}
                    variant="destructive"
                  >
                    Resolve NO
                  </Button>
                </div>
              </Card>
            )}

          {/* Info Cards Row - Equal Height */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {/* Position Card */}
            <Card className="p-4 hover:border-border">
              <h3 className="mb-3 text-sm font-medium">Your Position</h3>
              {!wallet.publicKey ? (
                <p className="text-muted-foreground text-[13px]">
                  Connect wallet to view
                </p>
              ) : positionLoading ? (
                <Skeleton className="h-12" />
              ) : position ? (
                <div className="space-y-2">
                  <div className="flex justify-between text-[13px]">
                    <span className="text-muted-foreground">Deposit</span>
                    <span className="font-medium">
                      {formatTokenAmount(BigInt(position.depositAmount))} SOL
                    </span>
                  </div>
                  <div className="flex justify-between text-[13px]">
                    <span className="text-muted-foreground">Status</span>
                    <Badge variant={getPositionStatusVariant(position.status)} className="text-xs">
                      {position.status}
                    </Badge>
                  </div>
                  {position.payoutAmount !== "0" && (
                    <div className="flex justify-between text-[13px]">
                      <span className="text-muted-foreground">Payout</span>
                      <span className="font-medium text-emerald-600 dark:text-emerald-400">
                        {formatTokenAmount(BigInt(position.payoutAmount))} SOL
                      </span>
                    </div>
                  )}
                  {isResolved &&
                    position.status === PositionStatus.Processed && (
                      <Button
                        onClick={handleComputePayout}
                        className="mt-2 w-full"
                        size="sm"
                      >
                        Compute Payout
                      </Button>
                    )}
                  {position.status === PositionStatus.PayoutComputed &&
                    position.payoutAmount !== "0" && (
                      <Button
                        onClick={handleClaimPayout}
                        className="mt-2 w-full"
                        size="sm"
                      >
                        Claim Payout
                      </Button>
                    )}
                  {position.status === PositionStatus.Pending && isResolved && (
                    <Badge variant="warning" className="mt-2 w-full justify-center">
                      Waiting for MPC...
                    </Badge>
                  )}
                </div>
              ) : (
                <p className="text-muted-foreground text-[13px]">
                  No position yet
                </p>
              )}
            </Card>

            {/* Market Info */}
            <Card className="p-4 hover:border-border">
              <h3 className="mb-3 text-sm font-medium">Market Info</h3>
              <div className="space-y-2 text-[13px]">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Positions</span>
                  <span>{market.totalPositions}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Betting Ends</span>
                  <span>{market.bettingEndTime.toLocaleDateString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Resolution</span>
                  <span>{market.resolutionEndTime.toLocaleDateString()}</span>
                </div>
              </div>
            </Card>

            {/* Tech Stack */}
            <Card className="p-4 hover:border-border">
              <h3 className="mb-3 text-sm font-medium">Powered By</h3>
              <div className="flex flex-wrap gap-1.5">
                <Badge variant="secondary">Arcium MPC</Badge>
                <Badge variant="secondary">Helius</Badge>
                <Badge variant="secondary">Solana</Badge>
              </div>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
