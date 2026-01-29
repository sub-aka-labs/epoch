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
  const { market, loading, error, refetch, openMarket, resolveMarket } = useMarket(id);
  const { position, loading: positionLoading, refetch: refetchPosition, computePayout, claimPayout } = usePosition(id);
  const { placeBet, loading: betLoading } = useBet();

  const [betAmount, setBetAmount] = useState("");
  const [selectedOutcome, setSelectedOutcome] = useState<"yes" | "no" | null>(null);

  const handleRealtimeUpdate = useCallback(() => {
    refetch();
    refetchPosition();
  }, [refetch, refetchPosition]);

  const { connected: wsConnected } = useHeliusWebSocket(
    market?.publicKey?.toBase58() || null,
    handleRealtimeUpdate
  );

  const isAuthority = wallet.publicKey && market?.authority === wallet.publicKey.toBase58();

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
      <div className="min-h-screen bg-background">
        <Header showLive={wsConnected} />
        <main className="max-w-6xl mx-auto px-4 py-8">
          <Skeleton className="h-8 w-3/4 mb-4" />
          <Skeleton className="h-64 w-full" />
        </main>
      </div>
    );
  }

  if (error || !market) {
    return (
      <div className="min-h-screen bg-background">
        <Header showLive={wsConnected} />
        <main className="max-w-6xl mx-auto px-4 py-8">
          <div className="text-center text-rose-400 py-12">
            {error || "Market not found"}
          </div>
        </main>
      </div>
    );
  }

  const canBet = market.status === MarketStatus.Open && market.canBet;
  const isResolved = market.status === MarketStatus.Resolved;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Toaster />
      <Header showLive={wsConnected} />

      <main className="max-w-6xl mx-auto px-4 py-8">
        {/* Market Header */}
        <div className="mb-6">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 mb-3">
            <h1 className="text-lg sm:text-xl font-bold leading-tight tracking-tight">{market.question}</h1>
            <StatusBadge status={market.status} />
          </div>

          {isResolved && market.winningOutcome && (
            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-muted text-[13px]">
              <span className="text-muted-foreground">Outcome:</span>
              <span className={`font-medium ${market.winningOutcome === "yes" ? "text-emerald-400" : "text-rose-400"}`}>
                {market.winningOutcome.toUpperCase()}
              </span>
            </div>
          )}
        </div>

        <div className="space-y-4">
          {/* Main Status/Action Card - Full Width */}
          {/* Open Market for Authority */}
          {isAuthority && market.status === MarketStatus.Created && (
            <div className="bg-card p-5 border border-border">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-1.5 h-1.5 bg-amber-400" />
                <h2 className="text-sm font-medium">Market Not Open</h2>
              </div>
              <p className="text-muted-foreground text-[13px] mb-4">
                This market is created but not yet open for betting. Open it to allow users to place bets.
              </p>
              <Button onClick={handleOpenMarket}>
                Open Market for Betting
              </Button>
            </div>
          )}

          {/* Waiting for Market to Open - for non-authority users */}
          {!isAuthority && market.status === MarketStatus.Created && (
            <div className="bg-card p-5 border border-border">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-1.5 h-1.5 bg-amber-400" />
                <h2 className="text-sm font-medium">Market Not Active</h2>
              </div>
              <p className="text-muted-foreground text-[13px]">
                This market needs to be opened by the market authority before betting can begin.
              </p>
            </div>
          )}

          {/* Betting Ended - Awaiting Resolution */}
          {market.status === MarketStatus.Open && !canBet && new Date() >= market.bettingEndTime && (
            <div className="bg-card p-5 border border-border">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-1.5 h-1.5 bg-emerald-400" />
                <h2 className="text-sm font-medium">Betting Closed</h2>
              </div>
              <p className="text-muted-foreground text-[13px]">
                The betting period has ended. Awaiting market resolution.
              </p>
              {isAuthority && (
                <p className="text-foreground text-[13px] mt-2">
                  As the market authority, you can resolve this market below.
                </p>
              )}
            </div>
          )}

          {/* Betting Not Started Yet */}
          {market.status === MarketStatus.Open && !canBet && new Date() < market.bettingStartTime && (
            <div className="bg-card p-5 border border-border">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-1.5 h-1.5 bg-sky-400" />
                <h2 className="text-sm font-medium">Betting Opens Soon</h2>
              </div>
              <p className="text-muted-foreground text-[13px]">
                Betting starts on {market.bettingStartTime.toLocaleString()}
              </p>
            </div>
          )}

          {/* Betting Card */}
          {canBet && (
            <div className="bg-card p-6 border border-border">
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-2">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_10px_3px_rgba(52,211,153,0.6)]"></span>
                  </span>
                  <h2 className="text-lg font-medium">Place Your Bet</h2>
                </div>
                <CountdownBadge targetDate={market.bettingEndTime} label="Ends in" />
              </div>

              <div className="grid grid-cols-2 gap-3 mb-5">
                <button
                  onClick={() => setSelectedOutcome("yes")}
                  className={`h-14 font-semibold text-base transition-colors border cursor-pointer ${
                    selectedOutcome === "yes"
                      ? "bg-emerald-500 text-black border-emerald-500"
                      : "bg-muted text-emerald-400 border-border hover:border-emerald-500"
                  }`}
                >
                  YES
                </button>
                <button
                  onClick={() => setSelectedOutcome("no")}
                  className={`h-14 font-semibold text-base transition-colors border cursor-pointer ${
                    selectedOutcome === "no"
                      ? "bg-rose-500 text-white border-rose-500"
                      : "bg-muted text-rose-400 border-border hover:border-rose-500"
                  }`}
                >
                  NO
                </button>
              </div>

              <div className="mb-5">
                <label className="text-sm text-muted-foreground mb-2 block">Amount (SOL)</label>
                <div className="flex gap-3">
                  <Input
                    type="number"
                    placeholder="0.00"
                    value={betAmount}
                    onChange={(e) => setBetAmount(e.target.value)}
                    className="bg-muted border-border text-foreground flex-1 h-12 text-base"
                  />
                  {[0.1, 0.5, 1].map((amount) => (
                    <button
                      key={amount}
                      onClick={() => setBetAmount(amount.toString())}
                      className="h-12 px-5 bg-muted text-muted-foreground hover:bg-secondary hover:text-foreground text-sm font-medium border border-border cursor-pointer"
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
                  className="w-full h-12 text-base font-semibold"
                >
                  {betLoading ? "Placing Bet..." : "Place Bet"}
                </Button>
              ) : (
                <WalletButton />
              )}

              <p className="text-xs text-muted-foreground text-center mt-4">
                Your bet is encrypted with Arcium MPC
              </p>
            </div>
          )}

          {/* Resolved State */}
          {isResolved && (
            <div className="bg-card p-5 border border-border">
              <div className="text-center py-3">
                <p className="text-muted-foreground text-[13px] mb-1">Market Resolved</p>
                <p className={`text-2xl font-bold ${market.winningOutcome === "yes" ? "text-emerald-400" : "text-rose-400"}`}>
                  {market.winningOutcome?.toUpperCase()}
                </p>
              </div>
            </div>
          )}

          {/* Resolution Controls for Authority */}
          {isAuthority && !isResolved && market.status !== MarketStatus.Cancelled && new Date() >= market.bettingEndTime && (
            <div className="bg-card p-5 border border-border">
              <h2 className="text-sm font-medium mb-3">Resolve Market</h2>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  onClick={() => handleResolve(1)}
                  className="bg-emerald-500 hover:bg-emerald-600 text-black"
                >
                  Resolve YES
                </Button>
                <Button
                  onClick={() => handleResolve(0)}
                  className="bg-rose-500 hover:bg-rose-600 text-white"
                >
                  Resolve NO
                </Button>
              </div>
            </div>
          )}

          {/* Info Cards Row - Equal Height */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Position Card */}
            <div className="bg-card p-4 border border-border">
              <h3 className="text-sm font-medium mb-3">Your Position</h3>
              {!wallet.publicKey ? (
                <p className="text-muted-foreground text-[13px]">Connect wallet to view</p>
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
                      <span className="text-emerald-400 font-medium">
                        {formatTokenAmount(BigInt(position.payoutAmount))} SOL
                      </span>
                    </div>
                  )}
                  {isResolved && position.status === PositionStatus.Processed && (
                    <Button onClick={handleComputePayout} className="w-full mt-2" size="sm">
                      Compute Payout
                    </Button>
                  )}
                  {position.status === PositionStatus.PayoutComputed && position.payoutAmount !== "0" && (
                    <Button onClick={handleClaimPayout} className="w-full mt-2" size="sm">
                      Claim Payout
                    </Button>
                  )}
                  {position.status === PositionStatus.Pending && isResolved && (
                    <p className="text-xs text-amber-400 mt-2">Waiting for MPC...</p>
                  )}
                </div>
              ) : (
                <p className="text-muted-foreground text-[13px]">No position yet</p>
              )}
            </div>

            {/* Market Info */}
            <div className="bg-card p-4 border border-border">
              <h3 className="text-sm font-medium mb-3">Market Info</h3>
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
            <div className="bg-card p-4 border border-border">
              <h3 className="text-sm font-medium mb-3">Powered By</h3>
              <div className="flex flex-wrap gap-1.5">
                <span className="px-2 py-0.5 text-xs bg-muted text-muted-foreground">Arcium MPC</span>
                <span className="px-2 py-0.5 text-xs bg-muted text-muted-foreground">Helius</span>
                <span className="px-2 py-0.5 text-xs bg-muted text-muted-foreground">Solana</span>
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
    [MarketStatus.BettingClosed]: { bg: "bg-emerald-500/10", text: "text-emerald-400" },
    [MarketStatus.Resolved]: { bg: "bg-sky-500/10", text: "text-sky-400" },
    [MarketStatus.Settled]: { bg: "bg-zinc-500/10", text: "text-zinc-400" },
    [MarketStatus.Cancelled]: { bg: "bg-rose-500/10", text: "text-rose-400" },
  };

  return (
    <span className={`px-2 py-0.5 text-xs font-medium shrink-0 ${styles[status].bg} ${styles[status].text}`}>
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

  return <span className={`font-medium text-[13px] ${styles[status]}`}>{status}</span>;
}
