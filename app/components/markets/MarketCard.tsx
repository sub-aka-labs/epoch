"use client";

import { MarketDisplay, MarketStatus } from "@/types/market";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";

interface MarketCardProps {
  market: MarketDisplay;
}

function getStatusBadgeVariant(
  status: MarketStatus
): "default" | "secondary" | "destructive" | "outline" {
  switch (status) {
    case MarketStatus.Open:
      return "default";
    case MarketStatus.Created:
      return "secondary";
    case MarketStatus.Resolved:
      return "outline";
    case MarketStatus.Cancelled:
      return "destructive";
    default:
      return "secondary";
  }
}

function formatTimeRemaining(date: Date): string {
  const now = new Date();
  const diff = date.getTime() - now.getTime();

  if (diff < 0) return "Ended";

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

  if (days > 0) return `${days}d ${hours}h remaining`;
  if (hours > 0) return `${hours}h ${minutes}m remaining`;
  return `${minutes}m remaining`;
}

export function MarketCard({ market }: MarketCardProps) {
  const timeRemaining = market.canBet
    ? formatTimeRemaining(market.bettingEndTime)
    : market.status === MarketStatus.Open
    ? "Betting starts soon"
    : null;

  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-lg line-clamp-2">{market.question}</CardTitle>
          <Badge variant={getStatusBadgeVariant(market.status)}>
            {market.status}
          </Badge>
        </div>
        <CardDescription>
          Market ID: {market.marketId} | {market.totalPositions} positions
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {market.isResolved && market.winningOutcome && (
          <div className="p-3 rounded-lg bg-muted">
            <p className="text-sm text-muted-foreground">Outcome</p>
            <p className="text-lg font-semibold">
              {market.winningOutcome === "yes" ? "YES" : "NO"}
            </p>
          </div>
        )}

        {timeRemaining && (
          <div className="text-sm text-muted-foreground">{timeRemaining}</div>
        )}

        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-muted-foreground">Betting Ends</p>
            <p className="font-medium">
              {market.bettingEndTime.toLocaleDateString()}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground">Resolution</p>
            <p className="font-medium">
              {market.resolutionEndTime.toLocaleDateString()}
            </p>
          </div>
        </div>
      </CardContent>
      <CardFooter>
        <Link href={`/markets/${market.marketId}`} className="w-full">
          <Button className="w-full" variant={market.canBet ? "default" : "secondary"}>
            {market.canBet ? "Place Bet" : "View Details"}
          </Button>
        </Link>
      </CardFooter>
    </Card>
  );
}
