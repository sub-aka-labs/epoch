"use client";

import { useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { PublicKey } from "@solana/web3.js";
import { MarketDisplay, MarketStatus } from "@/types/market";
import { useBet } from "@/hooks/useBet";
import { Countdown } from "@/components/ui/countdown";
import { toast } from "sonner";
import Link from "next/link";

interface MarketCardProps {
  market: MarketDisplay;
  onBetPlaced?: () => void;
}

function getStatusStyle(status: MarketStatus): { bg: string; text: string } {
  switch (status) {
    case MarketStatus.Open:
      return { bg: "bg-green-500/20", text: "text-green-400" };
    case MarketStatus.Created:
      return { bg: "bg-yellow-500/20", text: "text-yellow-400" };
    case MarketStatus.BettingClosed:
      return { bg: "bg-orange-500/20", text: "text-orange-400" };
    case MarketStatus.Resolved:
      return { bg: "bg-blue-500/20", text: "text-blue-400" };
    case MarketStatus.Settled:
      return { bg: "bg-purple-500/20", text: "text-purple-400" };
    case MarketStatus.Cancelled:
      return { bg: "bg-red-500/20", text: "text-red-400" };
    default:
      return { bg: "bg-zinc-500/20", text: "text-zinc-400" };
  }
}

export function MarketCard({ market, onBetPlaced }: MarketCardProps) {
  const wallet = useWallet();
  const { placeBet, loading: betLoading } = useBet();
  const [betAmount, setBetAmount] = useState("");
  const statusStyle = getStatusStyle(market.status);

  const handleQuickBet = async (outcome: "yes" | "no", e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!wallet.publicKey) {
      toast.error("Connect your wallet first");
      return;
    }

    if (!betAmount || parseFloat(betAmount) <= 0) {
      toast.error("Enter a bet amount");
      return;
    }

    const result = await placeBet({
      marketId: market.marketId,
      outcome,
      amount: parseFloat(betAmount),
      tokenMint: new PublicKey(market.tokenMint),
    });

    if (result.success) {
      toast.success(`Bet placed on ${outcome.toUpperCase()}!`);
      setBetAmount("");
      onBetPlaced?.();
    } else {
      toast.error(result.error || "Failed to place bet");
    }
  };

  return (
    <div className="bg-zinc-900 rounded-2xl p-5 border border-zinc-800 hover:border-zinc-700 transition-all">
      {/* Header - Clickable to go to detail page */}
      <Link href={`/markets/${market.marketId}`}>
        <div className="flex items-start justify-between gap-3 mb-4 cursor-pointer group">
          <h3 className="text-lg font-semibold text-white leading-tight group-hover:text-blue-400 transition-colors line-clamp-2">
            {market.question}
          </h3>
          <span className={`px-2.5 py-1 rounded-full text-xs font-medium shrink-0 ${statusStyle.bg} ${statusStyle.text}`}>
            {market.status}
          </span>
        </div>
      </Link>

      {/* Resolved Outcome */}
      {market.isResolved && market.winningOutcome && (
        <div className="mb-4 flex items-center gap-2">
          <span className="text-zinc-400 text-sm">Outcome:</span>
          <span className={`font-bold ${market.winningOutcome === "yes" ? "text-green-400" : "text-red-400"}`}>
            {market.winningOutcome.toUpperCase()}
          </span>
        </div>
      )}

      {/* Quick Bet Section - Only when betting is open */}
      {market.canBet && (
        <div className="space-y-3 mb-4">
          {/* Amount Input */}
          <div className="flex gap-2">
            <input
              type="number"
              placeholder="SOL"
              value={betAmount}
              onChange={(e) => setBetAmount(e.target.value)}
              onClick={(e) => e.stopPropagation()}
              className="flex-1 px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-white text-sm placeholder-zinc-500 focus:outline-none focus:border-zinc-600"
            />
            <div className="flex gap-1">
              {[0.1, 0.5, 1].map((amount) => (
                <button
                  key={amount}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setBetAmount(amount.toString());
                  }}
                  className="px-2 py-1 text-xs rounded bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-white transition-colors"
                >
                  {amount}
                </button>
              ))}
            </div>
          </div>

          {/* YES/NO Buttons */}
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={(e) => handleQuickBet("yes", e)}
              disabled={betLoading || !betAmount}
              className="py-2.5 px-4 rounded-xl font-semibold text-sm transition-all bg-green-500/20 text-green-400 hover:bg-green-500 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {betLoading ? "..." : "YES"}
            </button>
            <button
              onClick={(e) => handleQuickBet("no", e)}
              disabled={betLoading || !betAmount}
              className="py-2.5 px-4 rounded-xl font-semibold text-sm transition-all bg-red-500/20 text-red-400 hover:bg-red-500 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {betLoading ? "..." : "NO"}
            </button>
          </div>
        </div>
      )}

      {/* Footer Info */}
      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center gap-4">
          <div className="text-zinc-400">
            <span className="text-white font-medium">{market.totalPositions}</span> positions
          </div>
        </div>

        {/* Timer or Status */}
        {market.canBet ? (
          <div className="flex items-center gap-2 text-xs">
            <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            <Countdown targetDate={market.bettingEndTime} size="sm" className="text-green-400" />
          </div>
        ) : (
          <BettingStatusBadge market={market} />
        )}
      </div>
    </div>
  );
}

function BettingStatusBadge({ market }: { market: MarketDisplay }) {
  const now = new Date();

  if (market.status === MarketStatus.Resolved || market.status === MarketStatus.Settled) {
    return (
      <div className="text-xs px-2 py-1 rounded bg-blue-500/20 text-blue-400">
        Resolved
      </div>
    );
  }

  if (market.status === MarketStatus.Cancelled) {
    return (
      <div className="text-xs px-2 py-1 rounded bg-red-500/20 text-red-400">
        Cancelled
      </div>
    );
  }

  if (now < market.bettingStartTime) {
    return (
      <div className="text-xs px-2 py-1 rounded bg-yellow-500/20 text-yellow-400">
        Starts Soon
      </div>
    );
  }

  if (now >= market.bettingEndTime) {
    return (
      <div className="text-xs px-2 py-1 rounded bg-orange-500/20 text-orange-400">
        Awaiting Result
      </div>
    );
  }

  return (
    <div className="text-xs px-2 py-1 rounded bg-zinc-800 text-zinc-400">
      {market.status}
    </div>
  );
}
