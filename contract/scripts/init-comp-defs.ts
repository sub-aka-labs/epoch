import * as anchor from "@coral-xyz/anchor";
import { Program, AnchorProvider, Wallet } from "@coral-xyz/anchor";
import { Connection, Keypair, PublicKey } from "@solana/web3.js";
import {
  getMXEAccAddress,
  getCompDefAccOffset,
  getArciumAccountBaseSeed,
  getArciumProgramId,
  buildFinalizeCompDefTx,
} from "@arcium-hq/client";
import * as fs from "fs";
import * as path from "path";

import { Contract } from "../target/types/contract";

const CLUSTER_OFFSET = 456;
const RPC_URL = "https://devnet.helius-rpc.com/?api-key=ddb0234e-0765-42fa-88e8-41825d43dbdd";
const KEYPAIR_PATH = process.env.HOME + "/.config/solana/id.json";

const PROCESS_BET_COMP_DEF = "process_bet";
const COMPUTE_PAYOUT_COMP_DEF = "compute_payout";

async function main() {
  console.log("Initializing computation definitions on devnet...\n");

  const keypairData = JSON.parse(fs.readFileSync(KEYPAIR_PATH, "utf-8"));
  const owner = Keypair.fromSecretKey(Uint8Array.from(keypairData));
  console.log("Using wallet:", owner.publicKey.toBase58());

  const connection = new Connection(RPC_URL, "confirmed");
  const wallet = new Wallet(owner);
  const provider = new AnchorProvider(connection, wallet, {
    commitment: "confirmed",
  });

  const idlPath = path.join(__dirname, "../target/idl/contract.json");
  const idl = JSON.parse(fs.readFileSync(idlPath, "utf-8"));
  const program = new Program<Contract>(idl, provider);

  console.log("Program ID:", program.programId.toBase58());

  const mxeAccount = getMXEAccAddress(program.programId);
  console.log("MXE Account:", mxeAccount.toBase58());

  const balance = await connection.getBalance(owner.publicKey);
  console.log("Wallet balance:", balance / 1e9, "SOL\n");

  const baseSeedCompDefAcc = getArciumAccountBaseSeed("ComputationDefinitionAccount");
  const arciumProgramId = getArciumProgramId();

  console.log("1. Initializing process_bet computation definition...");
  try {
    const processBetOffset = getCompDefAccOffset(PROCESS_BET_COMP_DEF);
    const processBetCompDefPDA = PublicKey.findProgramAddressSync(
      [baseSeedCompDefAcc, program.programId.toBuffer(), processBetOffset],
      arciumProgramId
    )[0];
    console.log("   Comp Def Account:", processBetCompDefPDA.toBase58());

    const accountInfo = await connection.getAccountInfo(processBetCompDefPDA);
    if (accountInfo !== null) {
      console.log("   process_bet comp def already exists, skipping initialization.\n");
    } else {
      const tx1 = await program.methods
        .initProcessBetCompDef()
        .accounts({
          payer: owner.publicKey,
          mxeAccount: mxeAccount,
          compDefAccount: processBetCompDefPDA,
        })
        .signers([owner])
        .rpc({ commitment: "confirmed" });

      console.log("   Transaction:", tx1);
      console.log("   process_bet comp def initialized successfully!\n");

      try {
        const offsetNumber = Buffer.from(processBetOffset).readUInt32LE();
        const finalizeTx = await buildFinalizeCompDefTx(
          provider,
          offsetNumber,
          program.programId
        );
        const finalizeSig = await provider.sendAndConfirm(finalizeTx);
        console.log("   Finalized process_bet comp def:", finalizeSig, "\n");
      } catch (e: any) {
        console.log("   WARNING: Could not finalize process_bet comp def:", e.message);
        console.log("   On devnet, circuits need to be uploaded separately.\n");
      }
    }
  } catch (error: any) {
    console.error("   Error initializing process_bet comp def:", error.message || error);
    if (error.logs) {
      console.log("   Logs:", error.logs.slice(-5).join("\n   "));
    }
    console.log("   Continuing...\n");
  }

  console.log("2. Initializing compute_payout computation definition...");
  try {
    const computePayoutOffset = getCompDefAccOffset(COMPUTE_PAYOUT_COMP_DEF);
    const computePayoutCompDefPDA = PublicKey.findProgramAddressSync(
      [baseSeedCompDefAcc, program.programId.toBuffer(), computePayoutOffset],
      arciumProgramId
    )[0];
    console.log("   Comp Def Account:", computePayoutCompDefPDA.toBase58());

    const accountInfo = await connection.getAccountInfo(computePayoutCompDefPDA);
    if (accountInfo !== null) {
      console.log("   compute_payout comp def already exists, skipping initialization.\n");
    } else {
      const tx2 = await program.methods
        .initComputePayoutCompDef()
        .accounts({
          payer: owner.publicKey,
          mxeAccount: mxeAccount,
          compDefAccount: computePayoutCompDefPDA,
        })
        .signers([owner])
        .rpc({ commitment: "confirmed" });

      console.log("   Transaction:", tx2);
      console.log("   compute_payout comp def initialized successfully!\n");

      try {
        const offsetNumber = Buffer.from(computePayoutOffset).readUInt32LE();
        const finalizeTx = await buildFinalizeCompDefTx(
          provider,
          offsetNumber,
          program.programId
        );
        const finalizeSig = await provider.sendAndConfirm(finalizeTx);
        console.log("   Finalized compute_payout comp def:", finalizeSig, "\n");
      } catch (e: any) {
        console.log("   WARNING: Could not finalize compute_payout comp def:", e.message);
        console.log("   On devnet, circuits need to be uploaded separately.\n");
      }
    }
  } catch (error: any) {
    console.error("   Error initializing compute_payout comp def:", error.message || error);
    if (error.logs) {
      console.log("   Logs:", error.logs.slice(-5).join("\n   "));
    }
    console.log("   Continuing...\n");
  }

  console.log("Done! Computation definitions initialization complete.");
  console.log("\n========================================");
  console.log("Summary:");
  console.log("- Program ID: ", program.programId.toBase58());
  console.log("- MXE Account:", mxeAccount.toBase58());
  console.log("- Cluster Offset:", CLUSTER_OFFSET);
  console.log("========================================");
  console.log("\nNext steps:");
  console.log("1. If comp defs were newly created, Arcium network needs to finalize them");
  console.log("2. This requires circuit upload (may happen automatically or need manual upload)");
  console.log("3. Once finalized, encrypted betting will be available");
  console.log("4. Check Arcium Discord for devnet status updates");
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
