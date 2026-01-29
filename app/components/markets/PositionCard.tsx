"use client";

import { PositionDisplay } from "@/hooks/usePosition";
import { PositionStatus } from "@/types/market";
import { formatTokenAmount } from "@/lib/contracts/program";
import Link from "next/link";

interface PositionCardProps {
  position: PositionDisplay;
  onClaim?: () => void;
  claimLoading?: boolean;
}

function getStatusStyle(status: PositionStatus): { bg: string; text: string } {
  switch (status) {
    case PositionStatus.Claimed:
      return { bg: "bg-emerald-500/10", text: "text-emerald-400" };
    case PositionStatus.Refunded:
      return { bg: "bg-zinc-500/10", text: "text-zinc-400" };
    case PositionStatus.PayoutComputed:
      return { bg: "bg-sky-500/10", text: "text-sky-400" };
    case PositionStatus.Processed:
      return { bg: "bg-violet-500/10", text: "text-violet-400" };
    case PositionStatus.Pending:
      return { bg: "bg-amber-500/10", text: "text-amber-400" };
    default:
      return { bg: "bg-zinc-500/10", text: "text-zinc-400" };
  }
}

export function PositionCard({ position, onClaim, claimLoading }: PositionCardProps) {
  const canClaim =
    position.status === PositionStatus.PayoutComputed &&
    BigInt(position.payoutAmount) > BigInt(0);

  const hasClaimed = position.status === PositionStatus.Claimed;
  const hasRefunded = position.status === PositionStatus.Refunded;
  const statusStyle = getStatusStyle(position.status);

  return (
    <div className="bg-card p-4 border border-border hover:border-ring transition-colors">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <p className="text-[13px] text-muted-foreground">Position</p>
          <p className="font-mono text-[13px] text-foreground">
            {position.publicKey.toBase58().slice(0, 8)}...
          </p>
        </div>
        <span className={`px-2 py-0.5 text-xs font-medium ${statusStyle.bg} ${statusStyle.text}`}>
          {position.status}
        </span>
      </div>

      {/* Amounts */}
      <div className="grid grid-cols-2 gap-2 mb-3">
        <div className="bg-muted p-2.5">
          <p className="text-xs text-muted-foreground mb-0.5">Deposit</p>
          <p className="text-sm font-medium text-foreground">
            {formatTokenAmount(BigInt(position.depositAmount))} <span className="text-muted-foreground text-xs">SOL</span>
          </p>
        </div>
        <div className="bg-muted p-2.5">
          <p className="text-xs text-muted-foreground mb-0.5">Payout</p>
          <p className="text-sm font-medium">
            {position.status === PositionStatus.PayoutComputed ||
            position.status === PositionStatus.Claimed ? (
              <span className="text-emerald-400">
                {formatTokenAmount(BigInt(position.payoutAmount))} <span className="text-emerald-400/70 text-xs">SOL</span>
              </span>
            ) : (
              <span className="text-muted-foreground">Pending...</span>
            )}
          </p>
        </div>
      </div>

      {/* Timestamps */}
      <div className="text-xs text-muted-foreground mb-3 space-y-0.5">
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
        <Link href={`/markets/${position.market.toBase58()}`} className="flex-1">
          <button className="w-full h-8 px-3 bg-muted text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors text-[13px] font-medium border border-border cursor-pointer">
            View Market
          </button>
        </Link>
        {canClaim && (
          <button
            onClick={onClaim}
            disabled={claimLoading}
            className="flex-1 h-8 px-3 bg-[#10b981] text-black hover:bg-[#059669] transition-colors text-[13px] font-medium disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            {claimLoading ? "Claiming..." : "Claim Payout"}
          </button>
        )}
        {hasClaimed && (
          <div className="flex-1 h-8 px-3 bg-muted text-muted-foreground text-center text-[13px] font-medium flex items-center justify-center">
            Claimed
          </div>
        )}
        {hasRefunded && (
          <div className="flex-1 h-8 px-3 bg-muted text-muted-foreground text-center text-[13px] font-medium flex items-center justify-center">
            Refunded
          </div>
        )}
      </div>
    </div>
  );
}
