"use client";

import { useState } from "react";
import { usePrivyWallet } from "@/hooks/usePrivyWallet";
import { BN } from "@coral-xyz/anchor";
import { PublicKey } from "@solana/web3.js";
import { IconPlus } from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogSlideOver,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useMarket } from "@/hooks/useMarket";

interface CreateMarketDialogProps {
  onMarketCreated?: () => void;
}

export function CreateMarketDialog({ onMarketCreated }: CreateMarketDialogProps) {
  const wallet = usePrivyWallet();
  const { createMarket, openMarket, loading, error } = useMarket();
  const [open, setOpen] = useState(false);
  const [question, setQuestion] = useState("");
  const [tokenMint, setTokenMint] = useState("");

  // Helper to format date for datetime-local input (local time, not UTC)
  const formatDateTimeLocal = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  // Default times: start in 5 min, end in 1 hour, resolution in 2 hours
  const getDefaultTimes = () => {
    const now = new Date();
    const start = new Date(now.getTime() + 5 * 60 * 1000); // +5 minutes
    const end = new Date(now.getTime() + 60 * 60 * 1000); // +1 hour
    const resolution = new Date(now.getTime() + 2 * 60 * 60 * 1000); // +2 hours
    return {
      start: formatDateTimeLocal(start),
      end: formatDateTimeLocal(end),
      resolution: formatDateTimeLocal(resolution),
    };
  };

  const [bettingStart, setBettingStart] = useState("");
  const [bettingEnd, setBettingEnd] = useState("");
  const [resolutionEnd, setResolutionEnd] = useState("");

  // Update defaults when dialog opens
  const handleOpenChange = (newOpen: boolean) => {
    if (newOpen && !bettingStart) {
      const defaults = getDefaultTimes();
      setBettingStart(defaults.start);
      setBettingEnd(defaults.end);
      setResolutionEnd(defaults.resolution);
    }
    setOpen(newOpen);
  };

  const handleCreate = async () => {
    if (!wallet.publicKey) {
      toast.error("Please connect your wallet");
      return;
    }

    if (!question || !tokenMint || !bettingStart || !bettingEnd || !resolutionEnd) {
      toast.error("Please fill in all fields");
      return;
    }

    if (question.length > 200) {
      toast.error("Question must be 200 characters or less");
      return;
    }

    try {
      const marketId = new BN(Date.now());
      const nowTs = Math.floor(Date.now() / 1000);
      const bettingStartTs = new BN(Math.floor(new Date(bettingStart).getTime() / 1000));
      const bettingEndTs = new BN(Math.floor(new Date(bettingEnd).getTime() / 1000));
      const resolutionEndTs = new BN(Math.floor(new Date(resolutionEnd).getTime() / 1000));

      let mintPubkey: PublicKey;
      try {
        mintPubkey = new PublicKey(tokenMint);
      } catch {
        toast.error("Invalid token mint address");
        return;
      }

      const tx = await createMarket({
        marketId,
        question,
        bettingStartTs,
        bettingEndTs,
        resolutionEndTs,
        tokenMint: mintPubkey,
      });

      if (tx) {
        toast.success("Market created! Opening for betting...");

        // Auto-open the market so users can bet immediately when betting starts
        const openTx = await openMarket(marketId.toNumber());
        if (openTx) {
          toast.success("Market is now open for betting!");
        } else {
          toast.warning("Market created but failed to auto-open. You can open it manually.");
        }

        setOpen(false);
        resetForm();
        onMarketCreated?.();
      }
    } catch {
      toast.error(error || "Failed to create market");
    }
  };

  const resetForm = () => {
    const newDefaults = getDefaultTimes();
    setQuestion("");
    setTokenMint("");
    setBettingStart(newDefaults.start);
    setBettingEnd(newDefaults.end);
    setResolutionEnd(newDefaults.resolution);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button>
          <IconPlus size={18} stroke={2} />
          Create Market
        </Button>
      </DialogTrigger>
      <DialogSlideOver>
        <DialogHeader>
          <DialogTitle className="text-xl">Create Market</DialogTitle>
          <DialogDescription className="text-zinc-500">
            Create a new private prediction market with encrypted bets.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto py-6 space-y-6">
          {/* Question */}
          <div className="space-y-2">
            <Label htmlFor="question" className="text-zinc-400 text-sm">
              Question
            </Label>
            <Input
              id="question"
              placeholder="Will ETH reach $10,000 by end of 2025?"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              maxLength={200}
              className="bg-zinc-800/50 border-zinc-700 focus:border-zinc-600"
            />
            <p className="text-xs text-zinc-600">
              {question.length}/200 characters
            </p>
          </div>

          {/* Token Mint */}
          <div className="space-y-2">
            <Label htmlFor="tokenMint" className="text-zinc-400 text-sm">
              Token Mint Address
            </Label>
            <Input
              id="tokenMint"
              placeholder="Enter SPL token mint address"
              value={tokenMint}
              onChange={(e) => setTokenMint(e.target.value)}
              className="bg-zinc-800/50 border-zinc-700 focus:border-zinc-600 font-mono text-sm"
            />
            <p className="text-xs text-zinc-600">
              The SPL token used for betting (e.g., USDC, SOL)
            </p>
          </div>

          {/* Betting Period */}
          <div className="space-y-3">
            <p className="text-zinc-400 text-sm">Betting Period</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="bettingStart" className="text-zinc-500 text-xs">
                  Starts
                </Label>
                <Input
                  id="bettingStart"
                  type="datetime-local"
                  value={bettingStart}
                  onChange={(e) => setBettingStart(e.target.value)}
                  className="bg-zinc-800/50 border-zinc-700 focus:border-zinc-600 text-sm "
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="bettingEnd" className="text-zinc-500 text-xs">
                  Ends
                </Label>
                <Input
                  id="bettingEnd"
                  type="datetime-local"
                  value={bettingEnd}
                  onChange={(e) => setBettingEnd(e.target.value)}
                  className="bg-zinc-800/50 border-zinc-700 focus:border-zinc-600 text-sm "
                />
              </div>
            </div>
          </div>

          {/* Resolution Deadline */}
          <div className="space-y-2">
            <Label htmlFor="resolutionEnd" className="text-zinc-400 text-sm">
              Resolution Deadline
            </Label>
            <Input
              id="resolutionEnd"
              type="datetime-local"
              value={resolutionEnd}
              onChange={(e) => setResolutionEnd(e.target.value)}
              className="bg-zinc-800/50 border-zinc-700 focus:border-zinc-600 text-sm "
            />
            <p className="text-xs text-zinc-600">
              Deadline for the market to be resolved
            </p>
          </div>
        </div>

        <DialogFooter className="border-t border-zinc-800 pt-4 mt-auto">
          <Button variant="ghost" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleCreate} disabled={loading || !wallet.publicKey}>
            <IconPlus size={16} stroke={2} />
            {loading ? "Creating..." : "Create Market"}
          </Button>
        </DialogFooter>
      </DialogSlideOver>
    </Dialog>
  );
}
