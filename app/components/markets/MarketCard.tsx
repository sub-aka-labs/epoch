"use client";

import { useState } from "react";
import { PublicKey } from "@solana/web3.js";
import { usePrivyWallet } from "@/hooks/usePrivyWallet";
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
    default:
      return { bg: "bg-zinc-500/10", text: "text-zinc-400" };
  }
}

export function MarketCard({ market, onBetPlaced }: MarketCardProps) {
  const wallet = usePrivyWallet();
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
    <div className="bg-card border-border hover:border-ring cursor-pointer border p-4 transition-colors">
      {/* Header - Clickable to go to detail page */}
      <Link href={`/markets/${market.marketId}`}>
        <div className="group mb-3 flex items-start justify-between gap-3">
          <h3 className="text-foreground group-hover:text-muted-foreground line-clamp-2 text-sm leading-tight font-medium transition-colors">
            {market.question}
          </h3>
          <span
            className={`shrink-0 px-2 py-0.5 text-xs font-medium ${statusStyle.bg} ${statusStyle.text}`}
          >
            {market.status}
          </span>
        </div>
      </Link>

      {/* Resolved Outcome */}
      {market.isResolved && market.winningOutcome && (
        <div className="mb-3 flex items-center gap-2">
          <span className="text-muted-foreground text-[13px]">Outcome:</span>
          <span
            className={`text-[13px] font-medium ${market.winningOutcome === "yes" ? "text-emerald-400" : "text-rose-400"}`}
          >
            {market.winningOutcome.toUpperCase()}
          </span>
        </div>
      )}

      {/* Quick Bet Section - Only when betting is open */}
      {market.canBet && (
        <div className="mb-3 space-y-2">
          {/* Amount Input */}
          <div className="flex gap-1.5">
            <input
              type="number"
              placeholder="SOL"
              value={betAmount}
              onChange={(e) => setBetAmount(e.target.value)}
              onClick={(e) => e.stopPropagation()}
              className="bg-muted border-border text-foreground placeholder-muted-foreground focus:border-ring h-8 flex-1 border px-3 text-[13px] focus:outline-none"
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
                  className="bg-muted text-muted-foreground hover:bg-secondary hover:text-foreground border-border h-8 cursor-pointer border px-2 text-[13px] transition-colors"
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
              className="bg-muted border-border h-8 cursor-pointer border text-[13px] font-medium text-emerald-400 transition-colors hover:border-emerald-500 hover:bg-emerald-500 hover:text-black disabled:cursor-not-allowed disabled:opacity-50"
            >
              {betLoading ? "..." : "YES"}
            </button>
            <button
              onClick={(e) => handleQuickBet("no", e)}
              disabled={betLoading || !betAmount}
              className="bg-muted border-border h-8 cursor-pointer border text-[13px] font-medium text-rose-400 transition-colors hover:border-rose-500 hover:bg-rose-500 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              {betLoading ? "..." : "NO"}
            </button>
          </div>
        </div>
      )}

      {/* Footer Info */}
      <div className="flex items-center justify-between text-[13px]">
        <div className="flex items-center gap-4">
          <div className="text-muted-foreground">
            <span className="text-foreground font-medium">
              {market.totalPositions}
            </span>{" "}
            positions
          </div>
        </div>

        {/* Timer or Status */}
        {market.canBet ? (
          <div className="flex items-center gap-2 text-xs">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_2px_rgba(52,211,153,0.6)]"></span>
            </span>
            <Countdown
              targetDate={market.bettingEndTime}
              size="sm"
              className="text-emerald-400"
            />
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

  if (
    market.status === MarketStatus.Resolved ||
    market.status === MarketStatus.Settled
  ) {
    return (
      <div className="bg-sky-500/10 px-2 py-1 text-xs text-sky-400">
        Resolved
      </div>
    );
  }

  if (now < market.bettingStartTime) {
    return (
      <div className="bg-amber-500/10 px-2 py-1 text-xs text-amber-400">
        Starts Soon
      </div>
    );
  }

  if (now >= market.bettingEndTime) {
    return (
      <div className="bg-emerald-500/10 px-2 py-1 text-xs text-emerald-400">
        Awaiting Result
      </div>
    );
  }

  return (
    <div className="bg-zinc-500/10 px-2 py-1 text-xs text-zinc-400">
      {market.status}
    </div>
  );
}
