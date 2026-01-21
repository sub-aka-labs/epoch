import { Connection } from "@solana/web3.js";

const HELIUS_API_KEY = process.env.NEXT_PUBLIC_HELIUS_API_KEY;

if (!HELIUS_API_KEY) {
  console.warn("NEXT_PUBLIC_HELIUS_API_KEY not set, using public devnet");
}

export const HELIUS_RPC_URL = HELIUS_API_KEY
  ? `https://devnet.helius-rpc.com/?api-key=${HELIUS_API_KEY}`
  : "https://api.devnet.solana.com";

export const HELIUS_WS_URL = HELIUS_API_KEY
  ? `wss://devnet.helius-rpc.com/?api-key=${HELIUS_API_KEY}`
  : "wss://api.devnet.solana.com";

export const heliusConnection = new Connection(HELIUS_RPC_URL, {
  commitment: "confirmed",
  wsEndpoint: HELIUS_WS_URL,
});
