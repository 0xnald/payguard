import { createClient } from "genlayer-js";
import { studionet } from "genlayer-js/chains";

export const CONTRACT_ADDRESS =
  "0xe83614ADef6703C69AF9C649B92D750c3faD6FD8";

export const FAUCET_URL = "https://testnet-faucet.genlayer.foundation/";
export const EXPLORER_URL = "https://explorer-studio.genlayer.com";

function createGaslessProvider(provider: any) {
  return {
    ...provider,
    request: async (request: { method: string; params?: any[] }) => {
      if (
        request.method === "eth_gasPrice" ||
        request.method === "eth_maxPriorityFeePerGas"
      ) {
        return "0x0";
      }

      if (request.method === "eth_sendTransaction" && request.params?.[0]) {
        const tx = request.params[0];
        const {
          gasPrice: _gasPrice,
          maxFeePerGas: _maxFeePerGas,
          maxPriorityFeePerGas: _maxPriorityFeePerGas,
          type: _type,
          ...txWithoutFees
        } = tx;

        request = {
          ...request,
          params: [{
            ...txWithoutFees,
            type: "0x2",
            maxFeePerGas: "0x0",
            maxPriorityFeePerGas: "0x0",
          }],
        };

        if (process.env.NODE_ENV === "development") {
          console.debug("PayGuard Studionet transaction", request.params?.[0]);
        }
      }

      return provider.request(request);
    },
  };
}

// Read-only client - no wallet needed, talks directly to Studionet RPC
export function createReadClient() {
  return createClient({ chain: studionet });
}

// Write client - requires connected wallet address + MetaMask provider
export function createWriteClient(address: `0x${string}`, provider: any) {
  return createClient({
    chain: studionet,
    account: address,
    provider: createGaslessProvider(provider),
  });
}
