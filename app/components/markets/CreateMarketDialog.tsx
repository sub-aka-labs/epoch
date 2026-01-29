"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
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
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useMarket } from "@/hooks/useMarket";
import { getMarketPDA } from "@/lib/contracts/program";

interface CreateMarketDialogProps {
  onMarketCreated?: () => void;
}

export function CreateMarketDialog({
  onMarketCreated,
}: CreateMarketDialogProps) {
  const router = useRouter();
  const wallet = usePrivyWallet();
  const { createMarket, openMarket, loading, error } = useMarket();
  const [open, setOpen] = useState(false);
  const [question, setQuestion] = useState("");
  const [tokenMint, setTokenMint] = useState("");

  const formatDateTimeLocal = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  const getDefaultTimes = () => {
    const now = new Date();
    const start = new Date(now.getTime() + 5 * 60 * 1000);
    const end = new Date(now.getTime() + 2 * 60 * 60 * 1000);
    const resolution = new Date(now.getTime() + 3 * 60 * 60 * 1000);
    return {
      start: formatDateTimeLocal(start),
      end: formatDateTimeLocal(end),
      resolution: formatDateTimeLocal(resolution),
    };
  };

  const [bettingStart, setBettingStart] = useState("");
  const [bettingEnd, setBettingEnd] = useState("");
  const [resolutionEnd, setResolutionEnd] = useState("");
  const [startTimeError, setStartTimeError] = useState("");
  const [endTimeError, setEndTimeError] = useState("");
  const [resolutionTimeError, setResolutionTimeError] = useState("");

  const validateStartTime = (value: string, endValue?: string, resValue?: string) => {
    if (!value) {
      setStartTimeError("");
      return;
    }
    const selectedTime = new Date(value).getTime();
    const minTime = Date.now() + 5 * 60 * 1000;
    if (selectedTime < minTime) {
      setStartTimeError("Must be at least 5 minutes from now");
    } else {
      setStartTimeError("");
    }
    if (endValue) {
      validateEndTime(endValue, value, resValue);
    }
  };

  const validateEndTime = (value: string, startValue?: string, resValue?: string) => {
    const start = startValue || bettingStart;
    if (!value || !start) {
      setEndTimeError("");
      return;
    }
    const endTime = new Date(value).getTime();
    const startTime = new Date(start).getTime();
    const minGap = 15 * 60 * 1000; 
    if (endTime < startTime + minGap) {
      setEndTimeError("Must be at least 15 min after start");
    } else {
      setEndTimeError("");
    }
    if (resValue) {
      validateResolutionTime(resValue, value);
    }
  };

  const validateResolutionTime = (value: string, endValue?: string) => {
    const end = endValue || bettingEnd;
    if (!value || !end) {
      setResolutionTimeError("");
      return;
    }
    const resTime = new Date(value).getTime();
    const endTime = new Date(end).getTime();
    const minGap = 10 * 60 * 1000; // 10 minutes
    if (resTime < endTime + minGap) {
      setResolutionTimeError("Must be at least 10 min after betting ends");
    } else {
      setResolutionTimeError("");
    }
  };

  const handleStartTimeChange = (value: string) => {
    setBettingStart(value);
    validateStartTime(value, bettingEnd, resolutionEnd);
  };

  const handleEndTimeChange = (value: string) => {
    setBettingEnd(value);
    validateEndTime(value, bettingStart, resolutionEnd);
  };

  const handleResolutionTimeChange = (value: string) => {
    setResolutionEnd(value);
    validateResolutionTime(value, bettingEnd);
  };

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

    if (
      !question ||
      !tokenMint ||
      !bettingStart ||
      !bettingEnd ||
      !resolutionEnd
    ) {
      toast.error("Please fill in all fields");
      return;
    }

    if (question.length > 200) {
      toast.error("Question must be 200 characters or less");
      return;
    }

    try {
      const bettingStartTime = new Date(bettingStart).getTime();
      const minStartTime = Date.now() + 5 * 60 * 1000; // 5 minutes buffer
      if (bettingStartTime < minStartTime) {
        toast.error("Betting start time must be at least 5 minutes in the future");
        return;
      }

      const marketId = new BN(Date.now());
      const bettingStartTs = new BN(
        Math.floor(new Date(bettingStart).getTime() / 1000),
      );
      const bettingEndTs = new BN(
        Math.floor(new Date(bettingEnd).getTime() / 1000),
      );
      const resolutionEndTs = new BN(
        Math.floor(new Date(resolutionEnd).getTime() / 1000),
      );

      let mintPubkey: PublicKey;
      try {
        mintPubkey = new PublicKey(tokenMint);
      } catch (e) {
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

        const openTx = await openMarket(marketId.toNumber());
        if (openTx) {
          toast.success("Market is now open for betting!");
        } else {
          toast.warning(
            "Market created but failed to auto-open. You can open it manually.",
          );
        }

        setOpen(false);
        resetForm();
        onMarketCreated?.();

        const [marketPda] = getMarketPDA(marketId.toNumber());
        router.push(`/markets/${marketPda.toBase58()}`);
      } else {
        toast.error(
          error || "Failed to create market. Please refresh the page and try again.",
        );
      }
    } catch (error: any) {
      toast.error(error?.message || error || "Failed to create market");
    }
  };

  const resetForm = () => {
    const newDefaults = getDefaultTimes();
    setQuestion("");
    setTokenMint("");
    setBettingStart(newDefaults.start);
    setBettingEnd(newDefaults.end);
    setResolutionEnd(newDefaults.resolution);
    setStartTimeError("");
    setEndTimeError("");
    setResolutionTimeError("");
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <Button
        onClick={() => wallet.connected && setOpen(true)}
        className={
          !wallet.connected
            ? "pointer-events-auto cursor-not-allowed opacity-50"
            : ""
        }
      >
        <IconPlus size={18} stroke={2} />
        Create Market
      </Button>
      <DialogSlideOver>
        <DialogHeader>
          <DialogTitle className="text-xl">Create Market</DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Create a new private prediction market with encrypted bets.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 space-y-6 overflow-y-auto py-6">
          <div className="space-y-2">
            <Label htmlFor="question" className="text-muted-foreground text-sm">
              Question
            </Label>
            <Input
              id="question"
              placeholder="Will ETH reach $10,000 by end of 2025?"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              maxLength={200}
              className="bg-muted/50 border-border focus:border-ring"
            />
            <p className="text-muted-foreground text-xs">
              {question.length}/200 characters
            </p>
          </div>

          <div className="space-y-2">
            <Label
              htmlFor="tokenMint"
              className="text-muted-foreground text-sm"
            >
              Token Mint Address
            </Label>
            <Input
              id="tokenMint"
              placeholder="Enter SPL token mint address"
              value={tokenMint}
              onChange={(e) => setTokenMint(e.target.value)}
              className="bg-muted/50 border-border focus:border-ring font-mono text-sm"
            />
            <p className="text-muted-foreground text-xs">
              The SPL token used for betting (e.g., USDC, SOL)
            </p>
          </div>

          <div className="space-y-3">
            <p className="text-muted-foreground text-sm">Betting Period</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label
                  htmlFor="bettingStart"
                  className="text-muted-foreground text-xs"
                >
                  Starts
                </Label>
                <Input
                  id="bettingStart"
                  type="datetime-local"
                  value={bettingStart}
                  onChange={(e) => handleStartTimeChange(e.target.value)}
                  className={`bg-muted/50 focus:border-ring text-sm ${
                    startTimeError
                      ? "border-rose-500 focus:border-rose-500"
                      : "border-border"
                  }`}
                />
                {startTimeError && (
                  <p className="text-xs text-rose-500">{startTimeError}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label
                  htmlFor="bettingEnd"
                  className="text-muted-foreground text-xs"
                >
                  Ends
                </Label>
                <Input
                  id="bettingEnd"
                  type="datetime-local"
                  value={bettingEnd}
                  onChange={(e) => handleEndTimeChange(e.target.value)}
                  className={`bg-muted/50 focus:border-ring text-sm ${
                    endTimeError
                      ? "border-rose-500 focus:border-rose-500"
                      : "border-border"
                  }`}
                />
                {endTimeError && (
                  <p className="text-xs text-rose-500">{endTimeError}</p>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label
              htmlFor="resolutionEnd"
              className="text-muted-foreground text-sm"
            >
              Resolution Deadline
            </Label>
            <Input
              id="resolutionEnd"
              type="datetime-local"
              value={resolutionEnd}
              onChange={(e) => handleResolutionTimeChange(e.target.value)}
              className={`bg-muted/50 focus:border-ring text-sm ${
                resolutionTimeError
                  ? "border-rose-500 focus:border-rose-500"
                  : "border-border"
              }`}
            />
            {resolutionTimeError ? (
              <p className="text-xs text-rose-500">{resolutionTimeError}</p>
            ) : (
              <p className="text-muted-foreground text-xs">
                Deadline for the market to be resolved
              </p>
            )}
          </div>
        </div>

        <DialogFooter className="border-border mt-auto border-t pt-4">
          <Button variant="ghost" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleCreate}
            disabled={
              loading ||
              !wallet.publicKey ||
              !!startTimeError ||
              !!endTimeError ||
              !!resolutionTimeError
            }
          >
            <IconPlus size={16} stroke={2} />
            {loading ? "Creating..." : "Create Market"}
          </Button>
        </DialogFooter>
      </DialogSlideOver>
    </Dialog>
  );
}
