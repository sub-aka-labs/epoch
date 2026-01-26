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
    <div className="bg-zinc-900 p-5 border border-zinc-800 hover:border-zinc-600 transition-colors">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-4">
        <div>
          <p className="text-sm text-zinc-500">Position</p>
          <p className="font-mono text-white">
            {position.publicKey.toBase58().slice(0, 8)}...
          </p>
        </div>
        <span className={`px-2 py-0.5 text-xs font-medium ${statusStyle.bg} ${statusStyle.text}`}>
          {position.status}
        </span>
      </div>

      {/* Amounts */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="bg-zinc-800 p-3">
          <p className="text-xs text-zinc-500 mb-1">Deposit</p>
          <p className="text-lg font-medium text-white">
            {formatTokenAmount(BigInt(position.depositAmount))} <span className="text-zinc-500 text-sm">SOL</span>
          </p>
        </div>
        <div className="bg-zinc-800 p-3">
          <p className="text-xs text-zinc-500 mb-1">Payout</p>
          <p className="text-lg font-medium">
            {position.status === PositionStatus.PayoutComputed ||
            position.status === PositionStatus.Claimed ? (
              <span className="text-emerald-400">
                {formatTokenAmount(BigInt(position.payoutAmount))} <span className="text-emerald-400/70 text-sm">SOL</span>
              </span>
            ) : (
              <span className="text-zinc-600">Pending...</span>
            )}
          </p>
        </div>
      </div>

      {/* Timestamps */}
      <div className="text-xs text-zinc-600 mb-4 space-y-1">
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
          <button className="w-full py-2.5 px-4 bg-zinc-800 text-zinc-300 hover:bg-zinc-700 hover:text-white transition-colors text-sm font-medium border border-zinc-700">
            View Market
          </button>
        </Link>
        {canClaim && (
          <button
            onClick={onClaim}
            disabled={claimLoading}
            className="flex-1 py-2.5 px-4 bg-white text-black hover:bg-zinc-200 transition-colors text-sm font-medium disabled:opacity-50"
          >
            {claimLoading ? "Claiming..." : "Claim Payout"}
          </button>
        )}
        {hasClaimed && (
          <div className="flex-1 py-2.5 px-4 bg-zinc-800 text-zinc-500 text-center text-sm font-medium">
            Claimed
          </div>
        )}
        {hasRefunded && (
          <div className="flex-1 py-2.5 px-4 bg-zinc-800 text-zinc-500 text-center text-sm font-medium">
            Refunded
          </div>
        )}
      </div>
    </div>
  );
}
