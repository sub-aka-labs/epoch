"use client";

import { useCallback, useState } from "react";
import { PublicKey, SystemProgram } from "@solana/web3.js";
import { AnchorProvider, BN } from "@coral-xyz/anchor";
import {
  x25519,
  RescueCipher,
  getMXEPublicKey,
  getMXEAccAddress,
  getMempoolAccAddress,
  getExecutingPoolAccAddress,
  getCompDefAccAddress,
  getComputationAccAddress,
  getClusterAccAddress,
  getCompDefAccOffset,
  deserializeLE,
} from "@arcium-hq/client";
import {
  getProgram,
  getMarketPDA,
  getPoolStatePDA,
  getVaultPDA,
  getPositionPDA,
  PROGRAM_ID,
  parseContractError,
} from "@/lib/contracts/program";
import {
  getAssociatedTokenAddress,
  createAssociatedTokenAccountInstruction,
  createSyncNativeInstruction,
  TOKEN_PROGRAM_ID,
  NATIVE_MINT,
} from "@solana/spl-token";
import { usePrivyWallet, usePrivyConnection } from "./usePrivyWallet";

const CLUSTER_OFFSET = 456;
const POOL_ACCOUNT = new PublicKey(
  "G2sRWJvi3xoyh5k2gY49eG9L8YhAEWQPtNb1zb1GXTtC",
);
const CLOCK_ACCOUNT = new PublicKey(
  "7EbMUTLo5DjdzbN7s8BXeZwXzEwNQb1hScfRvWg8a6ot",
);
const ARCIUM_PROGRAM = new PublicKey(
  "Arcj82pX7HxYKLR92qvgZUAd7vGS1k4hQvAFcPATFdEQ",
);

export interface PlaceBetInput {
  marketId: string;
  outcome: "yes" | "no";
  amount: number;
  tokenMint: PublicKey;
}

export interface BetResult {
  success: boolean;
  tx?: string;
  error?: string;
}

export function useBet() {
  const { connection } = usePrivyConnection();
  const wallet = usePrivyWallet();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const placeBet = useCallback(
    async (input: PlaceBetInput): Promise<BetResult> => {
      console.log("=== placeBet called ===");
      console.log("Input:", {
        marketId: input.marketId,
        outcome: input.outcome,
        amount: input.amount,
        tokenMint: input.tokenMint.toBase58(),
      });

      if (!wallet.publicKey || !wallet.signTransaction) {
        const err = "Wallet not connected";
        console.error("placeBet error:", err);
        setError(err);
        return { success: false, error: err };
      }

      console.log("Wallet publicKey:", wallet.publicKey.toBase58());

      try {
        setLoading(true);
        setError(null);

        // Create a wallet adapter compatible object for AnchorProvider
        const walletAdapter = {
          publicKey: wallet.publicKey,
          signTransaction: wallet.signTransaction,
          signAllTransactions: wallet.signAllTransactions,
        };

        const provider = new AnchorProvider(connection, walletAdapter as any, {
          commitment: "confirmed",
        });
        const program = getProgram(provider);
        console.log("Program ID:", program.programId.toBase58());

        // generate keypair and get MXE shared secret
        console.log("Generating x25519 keypair...");
        const privateKey = x25519.utils.randomPrivateKey();
        const publicKey = x25519.getPublicKey(privateKey);
        console.log("User x25519 publicKey generated");

        console.log("Fetching MXE public key...");
        const mxePublicKey = await getMXEPublicKey(provider, PROGRAM_ID);
        if (!mxePublicKey) {
          throw new Error("MXE public key not available");
        }
        console.log("MXE public key fetched successfully");

        const sharedSecret = x25519.getSharedSecret(privateKey, mxePublicKey);
        const cipher = new RescueCipher(sharedSecret);
        console.log("Shared secret and cipher created");

        // encrypt bet data
        const outcomeValue = input.outcome === "yes" ? BigInt(1) : BigInt(0);
        const amountValue = BigInt(Math.floor(input.amount * 1e9));
        const plaintext = [outcomeValue, amountValue];
        console.log("Plaintext bet data:", {
          outcome: outcomeValue.toString(),
          amountLamports: amountValue.toString(),
        });

        const nonceBytes = crypto.getRandomValues(new Uint8Array(16));
        const nonce = deserializeLE(nonceBytes);
        const ciphertext = cipher.encrypt(plaintext, nonceBytes);
        console.log("Bet encrypted, nonce:", nonce.toString());

        const encryptedBet = new Uint8Array(64);
        encryptedBet.set(new Uint8Array(ciphertext[0]), 0);
        encryptedBet.set(new Uint8Array(ciphertext[1]), 32);
        console.log("Encrypted bet size:", encryptedBet.length);

        const computationOffsetBytes = crypto.getRandomValues(
          new Uint8Array(8),
        );
        const computationOffset = new BN(computationOffsetBytes);
        const depositAmount = new BN(Math.floor(input.amount * 1e9));
        console.log("Computation offset:", computationOffset.toString());
        console.log("Deposit amount (lamports):", depositAmount.toString());

        // derive PDAs
        const marketIdNum = parseInt(input.marketId);
        console.log("Market ID (numeric):", marketIdNum);

        const [marketPda] = getMarketPDA(marketIdNum);
        const [poolStatePda] = getPoolStatePDA(marketIdNum);
        const [vaultPda] = getVaultPDA(marketIdNum);
        const [positionPda] = getPositionPDA(marketPda, wallet.publicKey);

        console.log("PDAs derived:", {
          marketPda: marketPda.toBase58(),
          poolStatePda: poolStatePda.toBase58(),
          vaultPda: vaultPda.toBase58(),
          positionPda: positionPda.toBase58(),
        });

        const bettorTokenAccount = await getAssociatedTokenAddress(
          input.tokenMint,
          wallet.publicKey,
        );
        console.log("Bettor token account:", bettorTokenAccount.toBase58());

        // wrap SOL if needed
        const isNativeSol = input.tokenMint.equals(NATIVE_MINT);
        console.log("Is native SOL:", isNativeSol);
        const wrapInstructions: any[] = [];

        if (isNativeSol) {
          const accountInfo =
            await connection.getAccountInfo(bettorTokenAccount);
          console.log("Token account exists:", !!accountInfo);

          if (!accountInfo) {
            console.log("Creating associated token account instruction");
            wrapInstructions.push(
              createAssociatedTokenAccountInstruction(
                wallet.publicKey,
                bettorTokenAccount,
                wallet.publicKey,
                NATIVE_MINT,
              ),
            );
          }

          console.log("Adding SOL transfer instruction");
          wrapInstructions.push(
            SystemProgram.transfer({
              fromPubkey: wallet.publicKey,
              toPubkey: bettorTokenAccount,
              lamports: depositAmount.toNumber(),
            }),
          );

          console.log("Adding sync native instruction");
          wrapInstructions.push(
            createSyncNativeInstruction(bettorTokenAccount),
          );
        }
        console.log("Wrap instructions count:", wrapInstructions.length);

        // arcium accounts
        const mxeAccount = getMXEAccAddress(PROGRAM_ID);
        const mempoolAccount = getMempoolAccAddress(CLUSTER_OFFSET);
        const executingPool = getExecutingPoolAccAddress(CLUSTER_OFFSET);
        const clusterAccount = getClusterAccAddress(CLUSTER_OFFSET);

        const compDefOffset = getCompDefAccOffset("process_bet");
        const compDefOffsetNumber = Buffer.from(compDefOffset).readUInt32LE();
        const compDefAccount = getCompDefAccAddress(
          PROGRAM_ID,
          compDefOffsetNumber,
        );

        const computationAccount = getComputationAccAddress(
          CLUSTER_OFFSET,
          computationOffset,
        );

        const [signPdaAccount] = PublicKey.findProgramAddressSync(
          [Buffer.from("ArciumSignerAccount")],
          PROGRAM_ID,
        );

        console.log("Arcium accounts:", {
          mxeAccount: mxeAccount.toBase58(),
          mempoolAccount: mempoolAccount.toBase58(),
          executingPool: executingPool.toBase58(),
          clusterAccount: clusterAccount.toBase58(),
          compDefAccount: compDefAccount.toBase58(),
          computationAccount: computationAccount.toBase58(),
          signPdaAccount: signPdaAccount.toBase58(),
        });

        const accounts = {
          payer: wallet.publicKey,
          bettor: wallet.publicKey,
          market: marketPda,
          poolState: poolStatePda,
          userPosition: positionPda,
          bettorTokenAccount: bettorTokenAccount,
          vault: vaultPda,
          signPdaAccount: signPdaAccount,
          mxeAccount: mxeAccount,
          mempoolAccount: mempoolAccount,
          executingPool: executingPool,
          computationAccount: computationAccount,
          compDefAccount: compDefAccount,
          clusterAccount: clusterAccount,
          poolAccount: POOL_ACCOUNT,
          clockAccount: CLOCK_ACCOUNT,
          tokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
          arciumProgram: ARCIUM_PROGRAM,
        };

        const encryptedBetBuffer = Buffer.from(encryptedBet);

        console.log("Building placeBet instruction...");
        const instruction = await program.methods
          .placeBet(
            computationOffset,
            encryptedBetBuffer,
            Array.from(publicKey) as number[],
            new BN(nonce.toString()),
            depositAmount,
          )
          .accountsPartial(accounts)
          .instruction();
        console.log("Instruction built successfully");

        const { Transaction } = await import("@solana/web3.js");
        const transaction = new Transaction();

        for (const ix of wrapInstructions) {
          transaction.add(ix);
        }
        transaction.add(instruction);
        console.log("Transaction instructions count:", transaction.instructions.length);

        const { blockhash, lastValidBlockHeight } =
          await connection.getLatestBlockhash();
        transaction.recentBlockhash = blockhash;
        transaction.feePayer = wallet.publicKey;
        console.log("Blockhash:", blockhash);

        console.log("Requesting wallet signature...");
        const signedTx = await wallet.signTransaction!(transaction);
        console.log("Transaction signed successfully");

        console.log("Sending raw transaction...");
        const txSignature = await connection.sendRawTransaction(
          signedTx.serialize(),
          {
            skipPreflight: true,
          },
        );
        console.log("Transaction sent, signature:", txSignature);

        console.log("Waiting for confirmation...");
        const confirmation = await connection.confirmTransaction({
          signature: txSignature,
          blockhash,
          lastValidBlockHeight,
        });

        if (confirmation.value.err) {
          const errMsg = `Transaction failed: ${JSON.stringify(confirmation.value.err)}`;
          console.error("Transaction confirmation error:", confirmation.value.err);
          setError(errMsg);
          return { success: false, error: errMsg, tx: txSignature };
        }

        console.log("=== placeBet SUCCESS ===", txSignature);
        return { success: true, tx: txSignature };
      } catch (err) {
        console.error("=== placeBet ERROR ===", err);
        const errMsg = parseContractError(err);
        console.error("Parsed error message:", errMsg);
        setError(errMsg);
        return { success: false, error: errMsg };
      } finally {
        setLoading(false);
      }
    },
    [connection, wallet],
  );

  return { placeBet, loading, error };
}
