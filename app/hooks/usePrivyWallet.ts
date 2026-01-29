"use client";

import { useCallback, useMemo } from "react";
import { usePrivy } from "@privy-io/react-auth";
import {
  useWallets,
  useSignTransaction,
  useSignMessage,
} from "@privy-io/react-auth/solana";
import {
  Connection,
  PublicKey,
  Transaction,
  VersionedTransaction,
} from "@solana/web3.js";
import { HELIUS_RPC_URL } from "@/lib/helius";

export interface PrivyWalletAdapter {
  publicKey: PublicKey | null;
  connected: boolean;
  connecting: boolean;
  signTransaction:
    | (<T extends Transaction | VersionedTransaction>(tx: T) => Promise<T>)
    | null;
  signAllTransactions:
    | (<T extends Transaction | VersionedTransaction>(txs: T[]) => Promise<T[]>)
    | null;
  signMessage: ((message: Uint8Array) => Promise<Uint8Array>) | null;
}

export function usePrivyWallet(): PrivyWalletAdapter {
  const { ready, authenticated } = usePrivy();
  const { wallets } = useWallets();
  const { signTransaction: privySignTransaction } = useSignTransaction();
  const { signMessage: privySignMessage } = useSignMessage();

  // Get the first connected wallet (either embedded or external)
  const activeWallet = useMemo(() => {
    if (!wallets || wallets.length === 0) return null;
    return wallets[0];
  }, [wallets]);

  const publicKey = useMemo(() => {
    if (!activeWallet?.address) return null;
    try {
      return new PublicKey(activeWallet.address);
    } catch {
      return null;
    }
  }, [activeWallet]);

  const signTransaction = useCallback(
    async <T extends Transaction | VersionedTransaction>(tx: T): Promise<T> => {
      if (!activeWallet) {
        throw new Error("No wallet connected");
      }

      // Serialize the transaction to Uint8Array
      const serializedTx = tx.serialize({ requireAllSignatures: false });

      const { signedTransaction } = await privySignTransaction({
        transaction: serializedTx,
        wallet: activeWallet,
      });

      // Deserialize back to the appropriate transaction type
      if (tx instanceof VersionedTransaction) {
        return VersionedTransaction.deserialize(signedTransaction) as T;
      } else {
        return Transaction.from(signedTransaction) as T;
      }
    },
    [activeWallet, privySignTransaction],
  );

  const signAllTransactions = useCallback(
    async <T extends Transaction | VersionedTransaction>(
      txs: T[],
    ): Promise<T[]> => {
      if (!activeWallet) {
        throw new Error("No wallet connected");
      }

      const signedTxs: T[] = [];
      for (const tx of txs) {
        const signed = await signTransaction(tx);
        signedTxs.push(signed);
      }
      return signedTxs;
    },
    [activeWallet, signTransaction],
  );

  const signMessage = useCallback(
    async (message: Uint8Array): Promise<Uint8Array> => {
      if (!activeWallet) {
        throw new Error("No wallet connected");
      }

      const { signature } = await privySignMessage({
        message,
        wallet: activeWallet,
      });

      return signature;
    },
    [activeWallet, privySignMessage],
  );

  const connected = Boolean(ready && authenticated && activeWallet);
  const connecting = !ready;

  return {
    publicKey,
    connected,
    connecting,
    signTransaction: connected ? signTransaction : null,
    signAllTransactions: connected ? signAllTransactions : null,
    signMessage: connected ? signMessage : null,
  };
}

// Hook to get connection - since we're not using ConnectionProvider anymore
export function usePrivyConnection() {
  const connection = useMemo(() => {
    return new Connection(HELIUS_RPC_URL, {
      commitment: "confirmed",
    });
  }, []);

  return { connection };
}
