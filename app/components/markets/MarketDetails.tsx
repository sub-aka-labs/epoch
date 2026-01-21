"use client";

import { MarketDisplay, MarketStatus } from "@/types/market";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { BetForm } from "./BetForm";
import { Skeleton } from "@/components/ui/skeleton";

interface MarketDetailsProps {
  market: MarketDisplay | null;
  loading?: boolean;
  onRefresh?: () => void;
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

export function MarketDetailsSkeleton() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-8 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
      </div>
      <div className="grid gap-6 md:grid-cols-2">
        <div className="space-y-4">
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-60 w-full" />
        </div>
        <Skeleton className="h-80 w-full" />
      </div>
    </div>
  );
}

export function MarketDetails({ market, loading, onRefresh }: MarketDetailsProps) {
  if (loading) {
    return <MarketDetailsSkeleton />;
  }

  if (!market) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-muted-foreground">Market not found</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <div className="flex items-start justify-between gap-4">
          <h1 className="text-2xl font-bold">{market.question}</h1>
          <Badge variant={getStatusBadgeVariant(market.status)} className="shrink-0">
            {market.status}
          </Badge>
        </div>
        <p className="text-muted-foreground">
          Market ID: {market.marketId} | Created by{" "}
          {market.authority.slice(0, 8)}...{market.authority.slice(-8)}
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Market Info */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Market Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <InfoItem
                  label="Total Positions"
                  value={market.totalPositions.toString()}
                />
                <InfoItem
                  label="Status"
                  value={market.status}
                />
              </div>

              <Separator />

              <div className="space-y-3">
                <InfoItem
                  label="Betting Start"
                  value={market.bettingStartTime.toLocaleString()}
                />
                <InfoItem
                  label="Betting End"
                  value={market.bettingEndTime.toLocaleString()}
                />
                <InfoItem
                  label="Resolution Deadline"
                  value={market.resolutionEndTime.toLocaleString()}
                />
              </div>

              {market.isResolved && market.winningOutcome && (
                <>
                  <Separator />
                  <div className="p-4 rounded-lg bg-muted">
                    <p className="text-sm text-muted-foreground mb-1">
                      Winning Outcome
                    </p>
                    <p className="text-2xl font-bold">
                      {market.winningOutcome === "yes" ? "YES" : "NO"}
                    </p>
                    {market.resolvedAt && (
                      <p className="text-xs text-muted-foreground mt-2">
                        Resolved on {market.resolvedAt.toLocaleString()}
                      </p>
                    )}
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Privacy Notice */}
          <Card className="border-blue-200 bg-blue-50 dark:border-blue-900 dark:bg-blue-950">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Privacy Protected</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                This market uses Arcium MPC technology. Your bet amount and
                prediction are encrypted and remain private until the market
                resolves. Only the final outcome and your payout are revealed.
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Betting Form */}
        <div>
          <BetForm market={market} onBetPlaced={onRefresh} />
        </div>
      </div>
    </div>
  );
}

function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="font-medium">{value}</p>
    </div>
  );
}
