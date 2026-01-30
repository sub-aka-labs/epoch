"use client";

import { useState } from "react";
import { PublicKey } from "@solana/web3.js";
import { usePrivyWallet } from "@/hooks/usePrivyWallet";
import { MarketDisplay, MarketStatus } from "@/types/market";
import { useBet } from "@/hooks/useBet";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Countdown } from "@/components/ui/countdown";
import { toast } from "sonner";
import Link from "next/link";

interface MarketCardProps {
  market: MarketDisplay;
  onBetPlaced?: () => void;
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

export function MarketCard({ market, onBetPlaced }: MarketCardProps) {
  const wallet = usePrivyWallet();
  const { placeBet, loading: betLoading } = useBet();
  const [betAmount, setBetAmount] = useState("");

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
    <Card className="cursor-pointer p-4">
      {/* Header - Clickable to go to detail page */}
      <Link href={`/markets/${market.publicKey.toBase58()}`}>
        <div className="group mb-3 flex items-start justify-between gap-3">
          <h3 className="text-foreground group-hover:text-muted-foreground line-clamp-2 text-sm leading-tight font-medium transition-colors">
            {market.question}
          </h3>
          <Badge variant={getStatusVariant(market.status)} className="shrink-0">
            {market.status}
          </Badge>
        </div>
      </Link>

      {/* Resolved Outcome */}
      {market.isResolved && market.winningOutcome && (
        <div className="mb-3 flex items-center gap-2">
          <span className="text-muted-foreground text-[13px]">Outcome:</span>
          <Badge
            variant={
              market.winningOutcome === "yes" ? "success" : "destructive"
            }
          >
            {market.winningOutcome.toUpperCase()}
          </Badge>
        </div>
      )}

      {/* Quick Bet Section - Only when betting is open */}
      {market.canBet && (
        <div className="mb-3 space-y-2">
          {/* Amount Input */}
          <div className="flex gap-1.5">
            <Input
              type="number"
              placeholder="SOL"
              value={betAmount}
              onChange={(e) => setBetAmount(e.target.value)}
              onClick={(e) => e.stopPropagation()}
              className="flex-1"
            />
            <div className="flex gap-1">
              {[0.1, 0.5, 1].map((amount) => (
                <Button
                  key={amount}
                  variant="secondary"
                  size="default"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setBetAmount(amount.toString());
                  }}
                >
                  {amount}
                </Button>
              ))}
            </div>
          </div>

          {/* YES/NO Buttons */}
          <div className="grid grid-cols-2 gap-1.5">
            <Button
              onClick={(e) => handleQuickBet("yes", e)}
              disabled={betLoading || !betAmount}
              className="border border-emerald-200 bg-emerald-50 text-emerald-600 shadow-none hover:border-emerald-500 hover:bg-emerald-500 hover:text-white dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-400"
            >
              {betLoading ? "..." : "YES"}
            </Button>
            <Button
              onClick={(e) => handleQuickBet("no", e)}
              disabled={betLoading || !betAmount}
              className="border border-rose-200 bg-rose-50 text-rose-600 shadow-none hover:border-rose-500 hover:bg-rose-500 hover:text-white dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-400"
            >
              {betLoading ? "..." : "NO"}
            </Button>
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
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-75 dark:bg-emerald-400"></span>
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_2px_rgba(16,185,129,0.5)] dark:bg-emerald-400"></span>
            </span>
            <Countdown
              targetDate={market.bettingEndTime}
              size="sm"
              className="font-medium text-emerald-600 dark:text-emerald-400"
            />
          </div>
        ) : (
          <BettingStatusBadge market={market} />
        )}
      </div>
    </Card>
  );
}

function BettingStatusBadge({ market }: { market: MarketDisplay }) {
  const now = new Date();

  if (
    market.status === MarketStatus.Resolved ||
    market.status === MarketStatus.Settled
  ) {
    return <Badge variant="info">Resolved</Badge>;
  }

  if (market.status === MarketStatus.Cancelled) {
    return <Badge variant="destructive">Cancelled</Badge>;
  }

  if (now < market.bettingStartTime) {
    return <Badge variant="warning">Starts Soon</Badge>;
  }

  if (now >= market.bettingEndTime) {
    return <Badge variant="success">Awaiting Result</Badge>;
  }

  return <Badge variant="muted">{market.status}</Badge>;
}
