"use client";

import { useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { BN } from "@coral-xyz/anchor";
import { PublicKey } from "@solana/web3.js";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
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
  const wallet = useWallet();
  const { createMarket, loading, error } = useMarket();
  const [open, setOpen] = useState(false);
  const [question, setQuestion] = useState("");
  // Default to wrapped SOL for devnet testing
  const [tokenMint, setTokenMint] = useState("So11111111111111111111111111111111111111112");

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
        toast.success("Market created successfully!");
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
    setTokenMint("So11111111111111111111111111111111111111112");
    setBettingStart(newDefaults.start);
    setBettingEnd(newDefaults.end);
    setResolutionEnd(newDefaults.resolution);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button>Create Market</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Create Prediction Market</DialogTitle>
          <DialogDescription>
            Create a new private prediction market. All bets will be encrypted
            using Arcium MPC.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="question">Question</Label>
            <Input
              id="question"
              placeholder="Will ETH reach $10,000 by end of 2025?"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              maxLength={200}
            />
            <p className="text-xs text-muted-foreground">
              {question.length}/200 characters
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="tokenMint">Token Mint Address</Label>
            <Input
              id="tokenMint"
              placeholder="So11111111111111111111111111111111111111112"
              value={tokenMint}
              onChange={(e) => setTokenMint(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              The SPL token used for betting (e.g., USDC, SOL)
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="bettingStart">Betting Starts</Label>
              <Input
                id="bettingStart"
                type="datetime-local"
                value={bettingStart}
                onChange={(e) => setBettingStart(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="bettingEnd">Betting Ends</Label>
              <Input
                id="bettingEnd"
                type="datetime-local"
                value={bettingEnd}
                onChange={(e) => setBettingEnd(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="resolutionEnd">Resolution Deadline</Label>
            <Input
              id="resolutionEnd"
              type="datetime-local"
              value={resolutionEnd}
              onChange={(e) => setResolutionEnd(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleCreate} disabled={loading || !wallet.publicKey}>
            {loading ? "Creating..." : "Create Market"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
