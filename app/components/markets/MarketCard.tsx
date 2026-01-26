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
      return { bg: "bg-emerald-500/10", text: "text-emerald-400" };
    case MarketStatus.Created:
      return { bg: "bg-amber-500/10", text: "text-amber-400" };
    case MarketStatus.BettingClosed:
      return { bg: "bg-emerald-500/10", text: "text-emerald-400" };
    case MarketStatus.Resolved:
      return { bg: "bg-sky-500/10", text: "text-sky-400" };
    case MarketStatus.Settled:
      return { bg: "bg-zinc-500/10", text: "text-zinc-400" };
    case MarketStatus.Cancelled:
      return { bg: "bg-rose-500/10", text: "text-rose-400" };
    default:
      return { bg: "bg-zinc-500/10", text: "text-zinc-400" };
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
    <div className="bg-zinc-900 p-4 border border-zinc-800 hover:border-zinc-600 transition-colors cursor-pointer">
      {/* Header - Clickable to go to detail page */}
      <Link href={`/markets/${market.marketId}`}>
        <div className="flex items-start justify-between gap-3 mb-3 group">
          <h3 className="text-sm font-medium text-white leading-tight group-hover:text-zinc-300 transition-colors line-clamp-2">
            {market.question}
          </h3>
          <span className={`px-2 py-0.5 text-xs font-medium shrink-0 ${statusStyle.bg} ${statusStyle.text}`}>
            {market.status}
          </span>
        </div>
      </Link>

      {/* Resolved Outcome */}
      {market.isResolved && market.winningOutcome && (
        <div className="mb-3 flex items-center gap-2">
          <span className="text-zinc-500 text-[13px]">Outcome:</span>
          <span className={`font-medium text-[13px] ${market.winningOutcome === "yes" ? "text-emerald-400" : "text-rose-400"}`}>
            {market.winningOutcome.toUpperCase()}
          </span>
        </div>
      )}

      {/* Quick Bet Section - Only when betting is open */}
      {market.canBet && (
        <div className="space-y-2 mb-3">
          {/* Amount Input */}
          <div className="flex gap-1.5">
            <input
              type="number"
              placeholder="SOL"
              value={betAmount}
              onChange={(e) => setBetAmount(e.target.value)}
              onClick={(e) => e.stopPropagation()}
              className="flex-1 h-8 px-3 bg-zinc-800 border border-zinc-700 text-white text-[13px] placeholder-zinc-500 focus:outline-none focus:border-zinc-500"
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
                  className="h-8 px-2 text-[13px] bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-white transition-colors border border-zinc-700 cursor-pointer"
                >
                  {amount}
                </button>
              ))}
            </div>
          </div>

          {/* YES/NO Buttons */}
          <div className="grid grid-cols-2 gap-1.5">
            <button
              onClick={(e) => handleQuickBet("yes", e)}
              disabled={betLoading || !betAmount}
              className="h-8 font-medium text-[13px] transition-colors bg-zinc-800 text-emerald-400 hover:bg-emerald-500 hover:text-black disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer border border-zinc-700 hover:border-emerald-500"
            >
              {betLoading ? "..." : "YES"}
            </button>
            <button
              onClick={(e) => handleQuickBet("no", e)}
              disabled={betLoading || !betAmount}
              className="h-8 font-medium text-[13px] transition-colors bg-zinc-800 text-rose-400 hover:bg-rose-500 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer border border-zinc-700 hover:border-rose-500"
            >
              {betLoading ? "..." : "NO"}
            </button>
          </div>
        </div>
      )}

      {/* Footer Info */}
      <div className="flex items-center justify-between text-[13px]">
        <div className="flex items-center gap-4">
          <div className="text-zinc-500">
            <span className="text-white font-medium">{market.totalPositions}</span> positions
          </div>
        </div>

        {/* Timer or Status */}
        {market.canBet ? (
          <div className="flex items-center gap-2 text-xs">
            <span className="relative flex h-1.5 w-1.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_2px_rgba(52,211,153,0.6)]"></span>
            </span>
            <Countdown targetDate={market.bettingEndTime} size="sm" className="text-emerald-400" />
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
      <div className="text-xs px-2 py-1 bg-sky-500/10 text-sky-400">
        Resolved
      </div>
    );
  }

  if (market.status === MarketStatus.Cancelled) {
    return (
      <div className="text-xs px-2 py-1 bg-rose-500/10 text-rose-400">
        Cancelled
      </div>
    );
  }

  if (now < market.bettingStartTime) {
    return (
      <div className="text-xs px-2 py-1 bg-amber-500/10 text-amber-400">
        Starts Soon
      </div>
    );
  }

  if (now >= market.bettingEndTime) {
    return (
      <div className="text-xs px-2 py-1 bg-emerald-500/10 text-emerald-400">
        Awaiting Result
      </div>
    );
  }

  return (
    <div className="text-xs px-2 py-1 bg-zinc-500/10 text-zinc-400">
      {market.status}
    </div>
  );
}
