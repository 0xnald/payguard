import { createClient } from "genlayer-js";
import { studionet } from "genlayer-js/chains";

export const CONTRACT_ADDRESS =
  "0x4Da6D68a1401A8CD9B7eD109013b43c19c75f79F";

export const FAUCET_URL = "https://testnet-faucet.genlayer.foundation/";
export const EXPLORER_URL = "https://explorer-studio.genlayer.com";

// Read-only client — no wallet needed, talks directly to Studionet RPC
export function createReadClient() {
  return createClient({ chain: studionet });
}

// Write client — requires connected wallet address + MetaMask provider
export function createWriteClient(address: `0x${string}`, provider: any) {
  return createClient({
    chain: studionet,
    account: address,
    provider,
  });
}
