"use client";

import { use, useCallback, useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { PublicKey } from "@solana/web3.js";
import Link from "next/link";
import { WalletButton } from "@/components/WalletButton";
import { useMarket } from "@/hooks/useMarket";
import { usePosition } from "@/hooks/usePosition";
import { useBet } from "@/hooks/useBet";
import { useHeliusWebSocket } from "@/hooks/useHeliusWebSocket";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Toaster } from "@/components/ui/sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { CountdownBadge } from "@/components/ui/countdown";
import { toast } from "sonner";
import { formatTokenAmount } from "@/lib/contracts/program";
import { MarketDisplay, MarketStatus, PositionStatus } from "@/types/market";
import { NATIVE_MINT } from "@solana/spl-token";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function MarketPage({ params }: PageProps) {
  const { id } = use(params);
  const wallet = useWallet();
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
      <div className="min-h-screen bg-[#0d0d0d]">
        <Header wsConnected={wsConnected} />
        <main className="max-w-4xl mx-auto px-4 py-8">
          <Skeleton className="h-8 w-3/4 mb-4 bg-zinc-800" />
          <Skeleton className="h-64 w-full bg-zinc-800" />
        </main>
      </div>
    );
  }

  if (error || !market) {
    return (
      <div className="min-h-screen bg-[#0d0d0d]">
        <Header wsConnected={wsConnected} />
        <main className="max-w-4xl mx-auto px-4 py-8">
          <div className="text-center text-red-400 py-12">
            {error || "Market not found"}
          </div>
        </main>
      </div>
    );
  }

  const canBet = market.status === MarketStatus.Open && market.canBet;
  const isResolved = market.status === MarketStatus.Resolved;

  return (
    <div className="min-h-screen bg-[#0d0d0d] text-white">
      <Toaster theme="dark" />
      <Header wsConnected={wsConnected} />

      <main className="max-w-4xl mx-auto px-4 py-8">
        {/* Market Header */}
        <div className="mb-8">
          <div className="flex items-start justify-between gap-4 mb-4">
            <h1 className="text-2xl font-bold leading-tight">{market.question}</h1>
            <StatusBadge status={market.status} />
          </div>

          {isResolved && market.winningOutcome && (
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-zinc-800">
              <span className="text-zinc-400">Outcome:</span>
              <span className={`font-bold ${market.winningOutcome === "yes" ? "text-green-400" : "text-red-400"}`}>
                {market.winningOutcome.toUpperCase()}
              </span>
            </div>
          )}
        </div>

        <div className="grid gap-6 lg:grid-cols-5">
          {/* Main Content */}
          <div className="lg:col-span-3 space-y-6">
            {/* Open Market for Authority */}
            {isAuthority && market.status === MarketStatus.Created && (
              <div className="bg-zinc-900 rounded-2xl p-6 border border-zinc-800">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-3 h-3 rounded-full bg-yellow-400 animate-pulse" />
                  <h2 className="text-lg font-semibold">Market Not Open</h2>
                </div>
                <p className="text-zinc-400 text-sm mb-4">
                  This market is created but not yet open for betting. Open it to allow users to place bets.
                </p>
                <Button
                  onClick={handleOpenMarket}
                  className="w-full h-12 text-lg font-semibold bg-blue-600 hover:bg-blue-700"
                >
                  Open Market for Betting
                </Button>
              </div>
            )}

            {/* Waiting for Market to Open - for non-authority users */}
            {!isAuthority && market.status === MarketStatus.Created && (
              <div className="bg-zinc-900 rounded-2xl p-6 border border-zinc-800">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-3 h-3 rounded-full bg-yellow-400 animate-pulse" />
                  <h2 className="text-lg font-semibold">Market Not Active</h2>
                </div>
                <p className="text-zinc-400 text-sm">
                  This market needs to be opened by the market authority before betting can begin.
                </p>
              </div>
            )}

            {/* Betting Ended - Awaiting Resolution */}
            {market.status === MarketStatus.Open && !canBet && new Date() >= market.bettingEndTime && (
              <div className="bg-zinc-900 rounded-2xl p-6 border border-zinc-800">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-3 h-3 rounded-full bg-orange-400 animate-pulse" />
                  <h2 className="text-lg font-semibold">Betting Closed</h2>
                </div>
                <p className="text-zinc-400 text-sm">
                  The betting period has ended. Awaiting market resolution.
                </p>
                {isAuthority && (
                  <p className="text-blue-400 text-sm mt-2">
                    As the market authority, you can resolve this market below.
                  </p>
                )}
              </div>
            )}

            {/* Betting Not Started Yet */}
            {market.status === MarketStatus.Open && !canBet && new Date() < market.bettingStartTime && (
              <div className="bg-zinc-900 rounded-2xl p-6 border border-zinc-800">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-3 h-3 rounded-full bg-blue-400 animate-pulse" />
                  <h2 className="text-lg font-semibold">Betting Opens Soon</h2>
                </div>
                <p className="text-zinc-400 text-sm">
                  Betting starts on {market.bettingStartTime.toLocaleString()}
                </p>
              </div>
            )}

            {/* Betting Card */}
            {canBet && (
              <div className="bg-zinc-900 rounded-2xl p-6 border border-zinc-800">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold">Place Your Bet</h2>
                  <CountdownBadge targetDate={market.bettingEndTime} label="Ends in" />
                </div>

                <div className="grid grid-cols-2 gap-3 mb-4">
                  <button
                    onClick={() => setSelectedOutcome("yes")}
                    className={`py-4 rounded-xl font-semibold text-lg transition-all ${
                      selectedOutcome === "yes"
                        ? "bg-green-500 text-white"
                        : "bg-green-500/10 text-green-400 hover:bg-green-500/20"
                    }`}
                  >
                    YES
                  </button>
                  <button
                    onClick={() => setSelectedOutcome("no")}
                    className={`py-4 rounded-xl font-semibold text-lg transition-all ${
                      selectedOutcome === "no"
                        ? "bg-red-500 text-white"
                        : "bg-red-500/10 text-red-400 hover:bg-red-500/20"
                    }`}
                  >
                    NO
                  </button>
                </div>

                <div className="mb-4">
                  <label className="text-sm text-zinc-400 mb-2 block">Amount (SOL)</label>
                  <Input
                    type="number"
                    placeholder="0.00"
                    value={betAmount}
                    onChange={(e) => setBetAmount(e.target.value)}
                    className="bg-zinc-800 border-zinc-700 text-white text-lg h-12"
                  />
                </div>

                <div className="flex gap-2 mb-4">
                  {[0.1, 0.5, 1].map((amount) => (
                    <button
                      key={amount}
                      onClick={() => setBetAmount(amount.toString())}
                      className="px-4 py-2 rounded-lg bg-zinc-800 text-zinc-400 hover:bg-zinc-700 text-sm"
                    >
                      {amount} SOL
                    </button>
                  ))}
                </div>

                {wallet.publicKey ? (
                  <Button
                    onClick={handlePlaceBet}
                    disabled={!selectedOutcome || !betAmount || betLoading}
                    className="w-full h-12 text-lg font-semibold bg-blue-600 hover:bg-blue-700"
                  >
                    {betLoading ? "Placing Bet..." : "Place Bet"}
                  </Button>
                ) : (
                  <WalletButton />
                )}

                <p className="text-xs text-zinc-500 text-center mt-3">
                  Your bet is encrypted with Arcium MPC
                </p>
              </div>
            )}

            {/* Resolved State */}
            {isResolved && (
              <div className="bg-zinc-900 rounded-2xl p-6 border border-zinc-800">
                <div className="text-center py-4">
                  <p className="text-zinc-400 mb-2">Market Resolved</p>
                  <p className={`text-4xl font-bold ${market.winningOutcome === "yes" ? "text-green-400" : "text-red-400"}`}>
                    {market.winningOutcome?.toUpperCase()}
                  </p>
                </div>
              </div>
            )}

            {/* Resolution Controls for Authority - only show after betting ends */}
            {isAuthority && !isResolved && market.status !== MarketStatus.Cancelled && new Date() >= market.bettingEndTime && (
              <div className="bg-zinc-900 rounded-2xl p-6 border border-zinc-800">
                <h2 className="text-lg font-semibold mb-4">Resolve Market</h2>
                <div className="grid grid-cols-2 gap-3">
                  <Button
                    onClick={() => handleResolve(1)}
                    className="h-12 bg-green-600 hover:bg-green-700 font-semibold"
                  >
                    Resolve YES
                  </Button>
                  <Button
                    onClick={() => handleResolve(0)}
                    className="h-12 bg-red-600 hover:bg-red-700 font-semibold"
                  >
                    Resolve NO
                  </Button>
                </div>
              </div>
            )}

          </div>

          {/* Sidebar */}
          <div className="lg:col-span-2 space-y-6">
            {/* Position Card */}
            {wallet.publicKey && (
              <div className="bg-zinc-900 rounded-2xl p-5 border border-zinc-800">
                <h3 className="font-semibold mb-4">Your Position</h3>
                {positionLoading ? (
                  <Skeleton className="h-16 bg-zinc-800" />
                ) : position ? (
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-zinc-400">Deposit</span>
                      <span className="font-medium">
                        {formatTokenAmount(BigInt(position.depositAmount))} SOL
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-zinc-400">Status</span>
                      <PositionStatusBadge status={position.status} />
                    </div>
                    {position.payoutAmount !== "0" && (
                      <div className="flex justify-between">
                        <span className="text-zinc-400">Payout</span>
                        <span className="text-green-400 font-medium">
                          {formatTokenAmount(BigInt(position.payoutAmount))} SOL
                        </span>
                      </div>
                    )}

                    {/* Position Actions */}
                    {isResolved && position.status === PositionStatus.Processed && (
                      <Button
                        onClick={handleComputePayout}
                        className="w-full mt-2 bg-blue-600 hover:bg-blue-700"
                      >
                        Compute Payout
                      </Button>
                    )}
                    {position.status === PositionStatus.PayoutComputed && position.payoutAmount !== "0" && (
                      <Button
                        onClick={handleClaimPayout}
                        className="w-full mt-2 bg-green-600 hover:bg-green-700"
                      >
                        Claim Payout
                      </Button>
                    )}
                    {position.status === PositionStatus.Pending && isResolved && (
                      <p className="text-xs text-amber-400 mt-2">
                        Waiting for MPC to process...
                      </p>
                    )}
                  </div>
                ) : (
                  <p className="text-zinc-500 text-sm">No position yet</p>
                )}
              </div>
            )}

            {/* Market Info */}
            <div className="bg-zinc-900 rounded-2xl p-5 border border-zinc-800">
              <h3 className="font-semibold mb-4">Market Info</h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-zinc-400">Positions</span>
                  <span>{market.totalPositions}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-400">Betting Ends</span>
                  <span>{market.bettingEndTime.toLocaleDateString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-400">Resolution</span>
                  <span>{market.resolutionEndTime.toLocaleDateString()}</span>
                </div>
              </div>
            </div>

            {/* Tech Stack */}
            <div className="bg-zinc-900 rounded-2xl p-5 border border-zinc-800">
              <h3 className="font-semibold mb-3">Powered By</h3>
              <div className="flex flex-wrap gap-2">
                <Badge className="bg-purple-500/20 text-purple-400 hover:bg-purple-500/30">
                  Arcium MPC
                </Badge>
                <Badge className="bg-blue-500/20 text-blue-400 hover:bg-blue-500/30">
                  Helius
                </Badge>
                <Badge className="bg-orange-500/20 text-orange-400 hover:bg-orange-500/30">
                  Solana
                </Badge>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

function Header({ wsConnected }: { wsConnected: boolean }) {
  return (
    <header className="border-b border-zinc-800">
      <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
        <div className="flex items-center gap-8">
          <Link href="/" className="text-xl font-bold">
            Epoch
          </Link>
          <nav className="hidden md:flex items-center gap-6">
            <Link href="/markets" className="text-sm text-zinc-400 hover:text-white transition-colors">
              Markets
            </Link>
            <Link href="/markets/positions" className="text-sm text-zinc-400 hover:text-white transition-colors">
              Portfolio
            </Link>
          </nav>
        </div>
        <div className="flex items-center gap-4">
          {wsConnected && (
            <div className="flex items-center gap-2 text-xs text-green-400">
              <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
              Live
            </div>
          )}
          <WalletButton />
        </div>
      </div>
    </header>
  );
}

function StatusBadge({ status }: { status: MarketStatus }) {
  const styles: Record<MarketStatus, string> = {
    [MarketStatus.Created]: "bg-yellow-500/20 text-yellow-400",
    [MarketStatus.Open]: "bg-green-500/20 text-green-400",
    [MarketStatus.BettingClosed]: "bg-orange-500/20 text-orange-400",
    [MarketStatus.Resolved]: "bg-blue-500/20 text-blue-400",
    [MarketStatus.Settled]: "bg-purple-500/20 text-purple-400",
    [MarketStatus.Cancelled]: "bg-red-500/20 text-red-400",
  };

  return (
    <span className={`px-3 py-1 rounded-full text-sm font-medium ${styles[status]}`}>
      {status}
    </span>
  );
}

function PositionStatusBadge({ status }: { status: PositionStatus }) {
  const styles: Record<PositionStatus, string> = {
    [PositionStatus.Pending]: "text-yellow-400",
    [PositionStatus.Processed]: "text-blue-400",
    [PositionStatus.PayoutComputed]: "text-green-400",
    [PositionStatus.Claimed]: "text-purple-400",
    [PositionStatus.Refunded]: "text-zinc-400",
  };

  return <span className={`font-medium ${styles[status]}`}>{status}</span>;
}
