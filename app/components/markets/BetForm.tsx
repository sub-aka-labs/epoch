"use client";

import { useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { PublicKey } from "@solana/web3.js";
import { MarketDisplay } from "@/types/market";
import { useBet } from "@/hooks/useBet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

interface BetFormProps {
  market: MarketDisplay;
  onBetPlaced?: () => void;
}

export function BetForm({ market, onBetPlaced }: BetFormProps) {
  const wallet = useWallet();
  const { placeBet, loading: betLoading } = useBet();
  const [outcome, setOutcome] = useState<"yes" | "no">("yes");
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);

  const handlePlaceBet = async () => {
    if (!wallet.publicKey) {
      toast.error("Please connect your wallet");
      return;
    }

    if (!amount || parseFloat(amount) <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }

    try {
      setLoading(true);

      const result = await placeBet({
        marketId: market.marketId,
        outcome,
        amount: parseFloat(amount),
        tokenMint: new PublicKey(market.tokenMint),
      });

      if (result.success && result.tx) {
        toast.success("Bet placed successfully!", {
          description: `Transaction: ${result.tx.slice(0, 8)}...`,
        });
        setAmount("");
        onBetPlaced?.();
      } else {
        toast.error(result.error || "Failed to place bet");
      }
    } catch {
      toast.error("Failed to place bet");
    } finally {
      setLoading(false);
    }
  };

  const isLoading = loading || betLoading;

  if (!market.canBet) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <p className="text-muted-foreground">
            {market.status === "Open"
              ? "Betting period has not started yet"
              : "Betting is closed for this market"}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Place Your Bet</CardTitle>
          <Badge variant="secondary">Devnet</Badge>
        </div>
        <CardDescription>
          Your bet will be encrypted and private until the market resolves
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label>Select Outcome</Label>
          <Tabs value={outcome} onValueChange={(v) => setOutcome(v as "yes" | "no")}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="yes" className="data-[state=active]:bg-green-500 data-[state=active]:text-white">
                YES
              </TabsTrigger>
              <TabsTrigger value="no" className="data-[state=active]:bg-red-500 data-[state=active]:text-white">
                NO
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        <div className="space-y-2">
          <Label htmlFor="amount">Amount (SOL)</Label>
          <Input
            id="amount"
            type="number"
            placeholder="0.00"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            min="0"
            step="0.01"
          />
        </div>

        <div className="p-4 rounded-lg bg-muted space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Your prediction</span>
            <span className="font-medium">{outcome.toUpperCase()}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Bet amount</span>
            <span className="font-medium">{amount || "0"} SOL</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Privacy</span>
            <span className="font-medium text-green-600">Encrypted (Arcium MPC)</span>
          </div>
        </div>

        {/* Devnet Notice */}
        <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800">
          <p className="text-xs text-blue-800 dark:text-blue-200">
            <strong>Note:</strong> Your bet will be encrypted using Arcium MPC before submission.
            Your prediction remains private until the market resolves.
          </p>
        </div>
      </CardContent>
      <CardFooter>
        {!wallet.publicKey ? (
          <Button className="w-full" variant="outline" disabled>
            Connect Wallet to Bet
          </Button>
        ) : (
          <Button
            className="w-full"
            onClick={handlePlaceBet}
            disabled={isLoading || !amount}
          >
            {isLoading ? "Encrypting & Submitting..." : "Place Encrypted Bet"}
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}
