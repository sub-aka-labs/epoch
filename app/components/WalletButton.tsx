"use client";

import { usePrivy } from "@privy-io/react-auth";
import { useWallets } from "@privy-io/react-auth/solana";
import { Button } from "./ui/button";

export function WalletButton() {
  const { ready, authenticated, login, logout } = usePrivy();
  const { wallets } = useWallets();

  const activeWallet = wallets?.[0];

  if (!ready) {
    return (
      <Button variant="outline" disabled className="min-w-[140px]">
        Loading...
      </Button>
    );
  }

  if (!authenticated) {
    return (
      <Button onClick={login} variant="outline" className="min-w-[140px]">
        Connect Wallet
      </Button>
    );
  }

  const displayAddress = activeWallet?.address
    ? `${activeWallet.address.slice(0, 4)}...${activeWallet.address.slice(-4)}`
    : "Connected";

  return (
    <Button onClick={logout} variant="outline" className="min-w-[140px]">
      {displayAddress}
    </Button>
  );
}
