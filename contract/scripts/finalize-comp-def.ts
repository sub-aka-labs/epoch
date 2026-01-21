import { AnchorProvider, Wallet } from "@coral-xyz/anchor";
import { Connection, Keypair, PublicKey } from "@solana/web3.js";
import { buildFinalizeCompDefTx, getCompDefAccOffset } from "@arcium-hq/client";
import * as fs from "fs";

const HELIUS_API_KEY = process.env.HELIUS_API_KEY;
const RPC_URL = HELIUS_API_KEY
  ? `https://devnet.helius-rpc.com/?api-key=${HELIUS_API_KEY}`
  : "https://api.devnet.solana.com";

const KEYPAIR_PATH = process.env.HOME + "/.config/solana/id.json";
const PROGRAM_ID = new PublicKey("6eUsJ9n3LM4FoRWx9MyN7SGyZzvs63Bu43xERvgGPWrd");

async function main() {
  console.log("Finalizing computation definitions...\n");
  console.log("RPC:", HELIUS_API_KEY ? "Helius" : "Public Devnet");

  const keypairData = JSON.parse(fs.readFileSync(KEYPAIR_PATH, "utf-8"));
  const owner = Keypair.fromSecretKey(Uint8Array.from(keypairData));
  console.log("Wallet:", owner.publicKey.toBase58());

  const connection = new Connection(RPC_URL, "confirmed");
  const wallet = new Wallet(owner);
  const provider = new AnchorProvider(connection, wallet, {
    commitment: "confirmed",
  });

  console.log("Finalizing process_bet...");
  try {
    const processBetOffset = getCompDefAccOffset("process_bet");
    const offsetNumber = Buffer.from(processBetOffset).readUInt32LE();

    const finalizeTx = await buildFinalizeCompDefTx(provider, offsetNumber, PROGRAM_ID);

    const latestBlockhash = await connection.getLatestBlockhash();
    finalizeTx.recentBlockhash = latestBlockhash.blockhash;
    finalizeTx.lastValidBlockHeight = latestBlockhash.lastValidBlockHeight;
    finalizeTx.sign(owner);

    const sig = await connection.sendRawTransaction(finalizeTx.serialize(), {
      skipPreflight: true,
    });
    console.log("  Tx:", sig);

    await connection.confirmTransaction({
      signature: sig,
      blockhash: latestBlockhash.blockhash,
      lastValidBlockHeight: latestBlockhash.lastValidBlockHeight,
    });
    console.log("  Done!");
  } catch (error: any) {
    console.log("  Error:", error.message);
  }

  console.log("\nDone!");
}

main().catch(console.error);
