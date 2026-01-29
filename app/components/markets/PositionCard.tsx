"use client";

import { PositionDisplay } from "@/hooks/usePosition";
import { PositionStatus } from "@/types/market";
import { formatTokenAmount } from "@/lib/contracts/program";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";

interface PositionCardProps {
  position: PositionDisplay;
  onClaim?: () => void;
  claimLoading?: boolean;
}

function getStatusVariant(status: PositionStatus) {
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

export function PositionCard({
  position,
  onClaim,
  claimLoading,
}: PositionCardProps) {
  const canClaim =
    position.status === PositionStatus.PayoutComputed &&
    BigInt(position.payoutAmount) > BigInt(0);

  const hasClaimed = position.status === PositionStatus.Claimed;
  const hasRefunded = position.status === PositionStatus.Refunded;

  return (
    <Card className="p-4">
      {/* Header */}
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <p className="text-muted-foreground text-[13px]">Position</p>
          <p className="text-foreground font-mono text-[13px]">
            {position.publicKey.toBase58().slice(0, 8)}...
          </p>
        </div>
        <Badge variant={getStatusVariant(position.status)}>
          {position.status}
        </Badge>
      </div>

      {/* Amounts */}
      <div className="mb-3 grid grid-cols-2 gap-2">
        <div className="bg-secondary/50 dark:bg-muted p-2.5">
          <p className="text-muted-foreground mb-0.5 text-xs">Deposit</p>
          <p className="text-foreground text-sm font-medium">
            {formatTokenAmount(BigInt(position.depositAmount))}{" "}
            <span className="text-muted-foreground text-xs">SOL</span>
          </p>
        </div>
        <div className="bg-secondary/50 dark:bg-muted p-2.5">
          <p className="text-muted-foreground mb-0.5 text-xs">Payout</p>
          <p className="text-sm font-medium">
            {position.status === PositionStatus.PayoutComputed ||
            position.status === PositionStatus.Claimed ? (
              <span className="text-emerald-600 dark:text-emerald-400">
                {formatTokenAmount(BigInt(position.payoutAmount))}{" "}
                <span className="text-xs text-emerald-600/70 dark:text-emerald-400/70">
                  SOL
                </span>
              </span>
            ) : (
              <span className="text-muted-foreground">Pending...</span>
            )}
          </p>
        </div>
      </div>

      {/* Timestamps */}
      <div className="text-muted-foreground mb-3 space-y-0.5 text-xs">
        <p>Created {position.createdAt.toLocaleDateString()}</p>
        {position.processedAt && (
          <p>Processed {position.processedAt.toLocaleString()}</p>
        )}
        {position.claimedAt && (
          <p>Claimed {position.claimedAt.toLocaleString()}</p>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <Link
          href={`/markets/${position.market.toBase58()}`}
          className="flex-1"
        >
          <Button variant="secondary" className="w-full">
            View Market
          </Button>
        </Link>
        {canClaim && (
          <Button onClick={onClaim} disabled={claimLoading} className="flex-1">
            {claimLoading ? "Claiming..." : "Claim Payout"}
          </Button>
        )}
        {hasClaimed && (
          <Badge
            variant="success"
            className="flex h-8 flex-1 items-center justify-center"
          >
            Claimed
          </Badge>
        )}
        {hasRefunded && (
          <Badge
            variant="muted"
            className="flex h-8 flex-1 items-center justify-center"
          >
            Refunded
          </Badge>
        )}
      </div>
    </Card>
  );
}
