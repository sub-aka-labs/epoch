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
          <div className="py-12 text-center text-rose-400">
            {error || "Market not found"}
          </div>
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
            <StatusBadge status={market.status} />
          </div>

          {isResolved && market.winningOutcome && (
            <div className="bg-muted inline-flex items-center gap-2 px-3 py-1.5 text-[13px]">
              <span className="text-muted-foreground">Outcome:</span>
              <span
                className={`font-medium ${market.winningOutcome === "yes" ? "text-emerald-400" : "text-rose-400"}`}
              >
                {market.winningOutcome.toUpperCase()}
              </span>
            </div>
          )}
        </div>

        <div className="space-y-4">
          {/* Main Status/Action Card - Full Width */}
          {/* Open Market for Authority */}
          {isAuthority && market.status === MarketStatus.Created && (
            <div className="bg-card border-border border p-5">
              <div className="mb-3 flex items-center gap-2">
                <div className="h-1.5 w-1.5 bg-amber-400" />
                <h2 className="text-sm font-medium">Market Not Open</h2>
              </div>
              <p className="text-muted-foreground mb-4 text-[13px]">
                This market is created but not yet open for betting. Open it to
                allow users to place bets.
              </p>
              <Button onClick={handleOpenMarket}>
                Open Market for Betting
              </Button>
            </div>
          )}

          {/* Waiting for Market to Open - for non-authority users */}
          {!isAuthority && market.status === MarketStatus.Created && (
            <div className="bg-card border-border border p-5">
              <div className="mb-2 flex items-center gap-2">
                <div className="h-1.5 w-1.5 bg-amber-400" />
                <h2 className="text-sm font-medium">Market Not Active</h2>
              </div>
              <p className="text-muted-foreground text-[13px]">
                This market needs to be opened by the market authority before
                betting can begin.
              </p>
            </div>
          )}

          {/* Betting Ended - Awaiting Resolution */}
          {market.status === MarketStatus.Open &&
            !canBet &&
            new Date() >= market.bettingEndTime && (
              <div className="bg-card border-border border p-5">
                <div className="mb-2 flex items-center gap-2">
                  <div className="h-1.5 w-1.5 bg-emerald-400" />
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
              </div>
            )}

          {/* Betting Not Started Yet */}
          {market.status === MarketStatus.Open &&
            !canBet &&
            new Date() < market.bettingStartTime && (
              <div className="bg-card border-border border p-5">
                <div className="mb-2 flex items-center gap-2">
                  <div className="h-1.5 w-1.5 bg-sky-400" />
                  <h2 className="text-sm font-medium">Betting Opens Soon</h2>
                </div>
                <p className="text-muted-foreground text-[13px]">
                  Betting starts on {market.bettingStartTime.toLocaleString()}
                </p>
              </div>
            )}

          {/* Betting Card */}
          {canBet && (
            <div className="bg-card border-border border p-6">
              <div className="mb-5 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_10px_3px_rgba(52,211,153,0.6)]"></span>
                  </span>
                  <h2 className="text-lg font-medium">Place Your Bet</h2>
                </div>
                <CountdownBadge
                  targetDate={market.bettingEndTime}
                  label="Ends in"
                />
              </div>

              <div className="mb-5 grid grid-cols-2 gap-3">
                <button
                  onClick={() => setSelectedOutcome("yes")}
                  className={`h-14 cursor-pointer border text-base font-semibold transition-colors ${
                    selectedOutcome === "yes"
                      ? "border-emerald-500 bg-emerald-500 text-black"
                      : "bg-muted border-border text-emerald-400 hover:border-emerald-500"
                  }`}
                >
                  YES
                </button>
                <button
                  onClick={() => setSelectedOutcome("no")}
                  className={`h-14 cursor-pointer border text-base font-semibold transition-colors ${
                    selectedOutcome === "no"
                      ? "border-rose-500 bg-rose-500 text-white"
                      : "bg-muted border-border text-rose-400 hover:border-rose-500"
                  }`}
                >
                  NO
                </button>
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
                    className="bg-muted border-border text-foreground h-12 flex-1 text-base"
                  />
                  {[0.1, 0.5, 1].map((amount) => (
                    <button
                      key={amount}
                      onClick={() => setBetAmount(amount.toString())}
                      className="bg-muted text-muted-foreground hover:bg-secondary hover:text-foreground border-border h-12 cursor-pointer border px-5 text-sm font-medium"
                    >
                      {amount}
                    </button>
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
            </div>
          )}

          {/* Resolved State */}
          {isResolved && (
            <div className="bg-card border-border border p-5">
              <div className="py-3 text-center">
                <p className="text-muted-foreground mb-1 text-[13px]">
                  Market Resolved
                </p>
                <p
                  className={`text-2xl font-bold ${market.winningOutcome === "yes" ? "text-emerald-400" : "text-rose-400"}`}
                >
                  {market.winningOutcome?.toUpperCase()}
                </p>
              </div>
            </div>
          )}

          {/* Resolution Controls for Authority */}
          {isAuthority &&
            !isResolved &&
            market.status !== MarketStatus.Cancelled &&
            new Date() >= market.bettingEndTime && (
              <div className="bg-card border-border border p-5">
                <h2 className="mb-3 text-sm font-medium">Resolve Market</h2>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    onClick={() => handleResolve(1)}
                    className="bg-emerald-500 text-black hover:bg-emerald-600"
                  >
                    Resolve YES
                  </Button>
                  <Button
                    onClick={() => handleResolve(0)}
                    className="bg-rose-500 text-white hover:bg-rose-600"
                  >
                    Resolve NO
                  </Button>
                </div>
              </div>
            )}

          {/* Info Cards Row - Equal Height */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {/* Position Card */}
            <div className="bg-card border-border border p-4">
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
                    <PositionStatusBadge status={position.status} />
                  </div>
                  {position.payoutAmount !== "0" && (
                    <div className="flex justify-between text-[13px]">
                      <span className="text-muted-foreground">Payout</span>
                      <span className="font-medium text-emerald-400">
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
                    <p className="mt-2 text-xs text-amber-400">
                      Waiting for MPC...
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-muted-foreground text-[13px]">
                  No position yet
                </p>
              )}
            </div>

            {/* Market Info */}
            <div className="bg-card border-border border p-4">
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
            </div>

            {/* Tech Stack */}
            <div className="bg-card border-border border p-4">
              <h3 className="mb-3 text-sm font-medium">Powered By</h3>
              <div className="flex flex-wrap gap-1.5">
                <span className="bg-muted text-muted-foreground px-2 py-0.5 text-xs">
                  Arcium MPC
                </span>
                <span className="bg-muted text-muted-foreground px-2 py-0.5 text-xs">
                  Helius
                </span>
                <span className="bg-muted text-muted-foreground px-2 py-0.5 text-xs">
                  Solana
                </span>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

function StatusBadge({ status }: { status: MarketStatus }) {
  const styles: Record<MarketStatus, { bg: string; text: string }> = {
    [MarketStatus.Created]: { bg: "bg-amber-500/10", text: "text-amber-400" },
    [MarketStatus.Open]: { bg: "bg-emerald-500/10", text: "text-emerald-400" },
    [MarketStatus.BettingClosed]: {
      bg: "bg-emerald-500/10",
      text: "text-emerald-400",
    },
    [MarketStatus.Resolved]: { bg: "bg-sky-500/10", text: "text-sky-400" },
    [MarketStatus.Settled]: { bg: "bg-zinc-500/10", text: "text-zinc-400" },
    [MarketStatus.Cancelled]: { bg: "bg-rose-500/10", text: "text-rose-400" },
  };

  return (
    <span
      className={`shrink-0 px-2 py-0.5 text-xs font-medium ${styles[status].bg} ${styles[status].text}`}
    >
      {status}
    </span>
  );
}

function PositionStatusBadge({ status }: { status: PositionStatus }) {
  const styles: Record<PositionStatus, string> = {
    [PositionStatus.Pending]: "text-amber-400",
    [PositionStatus.Processed]: "text-violet-400",
    [PositionStatus.PayoutComputed]: "text-sky-400",
    [PositionStatus.Claimed]: "text-emerald-400",
    [PositionStatus.Refunded]: "text-zinc-400",
  };

  return (
    <span className={`text-[13px] font-medium ${styles[status]}`}>
      {status}
    </span>
  );
}
