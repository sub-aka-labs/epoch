"use client";

import { PositionDisplay } from "@/hooks/usePosition";
import { PositionStatus } from "@/types/market";
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
import { formatTokenAmount } from "@/lib/contracts/program";
import Link from "next/link";

interface PositionCardProps {
  position: PositionDisplay;
  onClaim?: () => void;
  claimLoading?: boolean;
}

function getStatusBadgeVariant(
  status: PositionStatus
): "default" | "secondary" | "destructive" | "outline" {
  switch (status) {
    case PositionStatus.Claimed:
    case PositionStatus.Refunded:
      return "outline";
    case PositionStatus.PayoutComputed:
      return "default";
    case PositionStatus.Processed:
      return "secondary";
    case PositionStatus.Pending:
      return "secondary";
    default:
      return "secondary";
  }
}

export function PositionCard({ position, onClaim, claimLoading }: PositionCardProps) {
  const canClaim =
    position.status === PositionStatus.PayoutComputed &&
    BigInt(position.payoutAmount) > BigInt(0);

  const hasClaimed = position.status === PositionStatus.Claimed;
  const hasRefunded = position.status === PositionStatus.Refunded;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <div>
            <CardTitle className="text-base">
              Position #{position.publicKey.toBase58().slice(0, 8)}...
            </CardTitle>
            <CardDescription>
              Created {position.createdAt.toLocaleDateString()}
            </CardDescription>
          </div>
          <Badge variant={getStatusBadgeVariant(position.status)}>
            {position.status}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-muted-foreground">Deposit</p>
            <p className="font-medium">
              {formatTokenAmount(BigInt(position.depositAmount))} SOL
            </p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Payout</p>
            <p className="font-medium">
              {position.status === PositionStatus.PayoutComputed ||
              position.status === PositionStatus.Claimed
                ? `${formatTokenAmount(BigInt(position.payoutAmount))} SOL`
                : "Pending..."}
            </p>
          </div>
        </div>

        {position.processedAt && (
          <div className="text-xs text-muted-foreground">
            Processed on {position.processedAt.toLocaleString()}
          </div>
        )}

        {position.claimedAt && (
          <div className="text-xs text-muted-foreground">
            Claimed on {position.claimedAt.toLocaleString()}
          </div>
        )}
      </CardContent>
      <CardFooter className="gap-2">
        <Link
          href={`/markets/${position.market.toBase58()}`}
          className="flex-1"
        >
          <Button variant="outline" className="w-full">
            View Market
          </Button>
        </Link>
        {canClaim && (
          <Button onClick={onClaim} disabled={claimLoading} className="flex-1">
            {claimLoading ? "Claiming..." : "Claim Payout"}
          </Button>
        )}
        {hasClaimed && (
          <Badge variant="outline" className="flex-1 justify-center py-2">
            Claimed
          </Badge>
        )}
        {hasRefunded && (
          <Badge variant="outline" className="flex-1 justify-center py-2">
            Refunded
          </Badge>
        )}
      </CardFooter>
    </Card>
  );
}
