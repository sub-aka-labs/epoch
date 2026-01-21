import * as anchor from "@coral-xyz/anchor";
import { AnchorProvider, Wallet } from "@coral-xyz/anchor";
import { Connection, Keypair } from "@solana/web3.js";
import { uploadCircuit } from "@arcium-hq/client";
import * as fs from "fs";

const HELIUS_API_KEY = process.env.HELIUS_API_KEY;
const RPC_URL = HELIUS_API_KEY
  ? `https://devnet.helius-rpc.com/?api-key=${HELIUS_API_KEY}`
  : "https://api.devnet.solana.com";

const KEYPAIR_PATH = process.env.HOME + "/.config/solana/id.json";
const PROGRAM_ID = "6eUsJ9n3LM4FoRWx9MyN7SGyZzvs63Bu43xERvgGPWrd";

async function main() {
  console.log("Uploading circuits to Arcium devnet...\n");
  console.log("RPC:", HELIUS_API_KEY ? "Helius" : "Public Devnet");

  const keypairData = JSON.parse(fs.readFileSync(KEYPAIR_PATH, "utf-8"));
  const owner = Keypair.fromSecretKey(Uint8Array.from(keypairData));
  console.log("Wallet:", owner.publicKey.toBase58());

  const connection = new Connection(RPC_URL, "confirmed");
  const wallet = new Wallet(owner);
  const provider = new AnchorProvider(connection, wallet, {
    commitment: "confirmed",
  });

  const programId = new anchor.web3.PublicKey(PROGRAM_ID);

  const circuits = [
    { name: "process_bet", file: "build/process_bet.arcis" },
    { name: "compute_payout", file: "build/compute_payout.arcis" },
  ];

  for (const circuit of circuits) {
    console.log(`\nUploading ${circuit.name}...`);

    try {
      const circuitPath = `${__dirname}/../${circuit.file}`;
      if (!fs.existsSync(circuitPath)) {
        console.log(`  File not found: ${circuitPath}`);
        continue;
      }

      const rawCircuit = fs.readFileSync(circuitPath);
      console.log(`  Size: ${rawCircuit.length} bytes`);

      await uploadCircuit(provider, circuit.name, programId, rawCircuit, true);

      console.log(`  ${circuit.name} uploaded!`);
    } catch (error: any) {
      console.error(`  Error: ${error.message}`);
    }
  }

  console.log("\nDone!");
}

main().catch((error) => {
  console.error("Fatal:", error);
  process.exit(1);
});
