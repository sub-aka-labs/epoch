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

export function PositionCard({
  position,
  onClaim,
  claimLoading,
}: PositionCardProps) {
  const canClaim =
    position.status === PositionStatus.PayoutComputed &&
    BigInt(position.payoutAmount) > BigInt(0);

  const hasClaimed = position.status === PositionStatus.Claimed;
  const statusStyle = getStatusStyle(position.status);

  return (
    <div className="bg-card border-border hover:border-ring border p-4 transition-colors">
      {/* Header */}
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <p className="text-muted-foreground text-[13px]">Position</p>
          <p className="text-foreground font-mono text-[13px]">
            {position.publicKey.toBase58().slice(0, 8)}...
          </p>
        </div>
        <span
          className={`px-2 py-0.5 text-xs font-medium ${statusStyle.bg} ${statusStyle.text}`}
        >
          {position.status}
        </span>
      </div>

      {/* Amounts */}
      <div className="mb-3 grid grid-cols-2 gap-2">
        <div className="bg-muted p-2.5">
          <p className="text-muted-foreground mb-0.5 text-xs">Deposit</p>
          <p className="text-foreground text-sm font-medium">
            {formatTokenAmount(BigInt(position.depositAmount))}{" "}
            <span className="text-muted-foreground text-xs">SOL</span>
          </p>
        </div>
        <div className="bg-muted p-2.5">
          <p className="text-muted-foreground mb-0.5 text-xs">Payout</p>
          <p className="text-sm font-medium">
            {position.status === PositionStatus.PayoutComputed ||
            position.status === PositionStatus.Claimed ? (
              <span className="text-emerald-400">
                {formatTokenAmount(BigInt(position.payoutAmount))}{" "}
                <span className="text-xs text-emerald-400/70">SOL</span>
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
          <button className="bg-muted text-muted-foreground hover:bg-secondary hover:text-foreground border-border h-8 w-full cursor-pointer border px-3 text-[13px] font-medium transition-colors">
            View Market
          </button>
        </Link>
        {canClaim && (
          <button
            onClick={onClaim}
            disabled={claimLoading}
            className="h-8 flex-1 cursor-pointer bg-[#10b981] px-3 text-[13px] font-medium text-black transition-colors hover:bg-[#059669] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {claimLoading ? "Claiming..." : "Claim Payout"}
          </button>
        )}
        {hasClaimed && (
          <div className="bg-muted text-muted-foreground flex h-8 flex-1 items-center justify-center px-3 text-center text-[13px] font-medium">
            Claimed
          </div>
        )}
      </div>
    </div>
  );
}
