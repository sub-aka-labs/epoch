const { getMXEPublicKey } = require("@arcium-hq/client");
const { PublicKey, Connection } = require("@solana/web3.js");
const anchor = require("@coral-xyz/anchor");

const PROGRAM_ID = "JAycaSPgFD8hd4Ys7RuJ5pJFzBL8pf11BT8z5HMa1zhZ";
const CHECK_INTERVAL_MS = 30000; // Check every 30 seconds
const MAX_ATTEMPTS = 60; // Max 30 minutes

async function checkMXEKey() {
  const connection = new Connection(
    "https://api.devnet.solana.com",
    "confirmed"
  );
  const wallet = {
    publicKey: new PublicKey("9hDm7WhrEL3MK3hA2knrF6ynnNKKiLYfV2qhZ4hSQeUB"),
    signTransaction: async (tx) => tx,
    signAllTransactions: async (txs) => txs,
  };
  const provider = new anchor.AnchorProvider(connection, wallet, {});
  const programId = new PublicKey(PROGRAM_ID);

  return await getMXEPublicKey(provider, programId);
}

async function main() {
  console.log("Waiting for MXE keygen to complete...");
  console.log(`Program ID: ${PROGRAM_ID}`);
  console.log(
    `Checking every ${
      CHECK_INTERVAL_MS / 1000
    } seconds (max ${MAX_ATTEMPTS} attempts)\n`
  );

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    const timestamp = new Date().toLocaleTimeString();
    process.stdout.write(`[${timestamp}] Attempt ${attempt}/${MAX_ATTEMPTS}: `);

    try {
      const mxeKey = await checkMXEKey();

      if (mxeKey) {
        console.log("SUCCESS!");
        console.log("\n========================================");
        console.log("MXE PUBLIC KEY IS READY!");
        console.log("Key:", Buffer.from(mxeKey).toString("hex"));
        console.log("========================================\n");
        console.log(
          "You can now run: anchor test --skip-local-validator --skip-deploy --provider.cluster devnet"
        );
        process.exit(0);
      } else {
        console.log("Still waiting...");
      }
    } catch (e) {
      console.log(`Error: ${e.message}`);
    }

    if (attempt < MAX_ATTEMPTS) {
      await new Promise((resolve) => setTimeout(resolve, CHECK_INTERVAL_MS));
    }
  }

  console.log(
    "\nTimeout: MXE keygen did not complete within the expected time."
  );
  console.log(
    "The Arcium cluster may be busy. Try again later or contact Arcium support."
  );
  process.exit(1);
}

main();
