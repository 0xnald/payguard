"use client";

import { useState, useCallback } from "react";
import {
  createReadClient,
  createWriteClient,
  CONTRACT_ADDRESS,
} from "./genlayer";

const WEI_PER_GEN = BigInt("1000000000000000000");
const STUDIONET_CHAIN_CONFIG = {
  chainId: "0xF22F",
  chainName: "GenLayer Studionet",
  nativeCurrency: { name: "GEN", symbol: "GEN", decimals: 18 },
  rpcUrls: ["https://studio.genlayer.com/api"],
  blockExplorerUrls: ["https://explorer-studio.genlayer.com"],
};

function parseGenToWei(amount: string): bigint {
  const trimmed = amount.trim();
  if (!/^\d+(\.\d{1,18})?$/.test(trimmed)) {
    throw new Error("Enter a valid GEN amount with up to 18 decimals");
  }

  const [whole, fraction = ""] = trimmed.split(".");
  const paddedFraction = fraction.padEnd(18, "0");
  const wei = BigInt(whole) * WEI_PER_GEN + BigInt(paddedFraction);

  if (wei <= BigInt(0)) {
    throw new Error("Escrow amount must be greater than 0 GEN");
  }

  return wei;
}

export interface Job {
  id: string;
  title: string;
  description: string;
  client: string;
  freelancer: string;
  deliverable: string;
  escrow_amount: string;
  escrow_label?: string;
  escrow_released?: boolean;
  escrow_status?: string;
  status: string;
  verdict: string;
  verdict_reasoning: string;
  match_percentage?: number;
}

export function useContract(
  address: string | null,
  provider: any
) {
  const [loading, setLoading] = useState(false);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const readClient = createReadClient();

  // ---------- READ METHODS ----------

  const getJob = useCallback(async (jobId: string): Promise<Job | null> => {
    try {
      const result = await readClient.readContract({
        address: CONTRACT_ADDRESS as `0x${string}`,
        functionName: "get_job",
        args: [jobId],
      });
      if (!result) return null;
      const parsed = typeof result === "string" ? JSON.parse(result) : result;
      if (parsed.error) return null;
      return parsed as Job;
    } catch (err: any) {
      console.error("getJob error:", err);
      return null;
    }
  }, []);

  const getAllJobs = useCallback(async (): Promise<{
    total: number;
    jobs: Record<string, Job>;
  }> => {
    try {
      const result = await readClient.readContract({
        address: CONTRACT_ADDRESS as `0x${string}`,
        functionName: "get_all_jobs",
        args: [],
      });
      const parsed = typeof result === "string" ? JSON.parse(result) : result;
      return parsed;
    } catch (err: any) {
      console.error("getAllJobs error:", err);
      return { total: 0, jobs: {} };
    }
  }, []);

  const getStats = useCallback(async (): Promise<{ total_jobs: number; contract_balance?: string }> => {
    try {
      const result = await readClient.readContract({
        address: CONTRACT_ADDRESS as `0x${string}`,
        functionName: "get_stats",
        args: [],
      });
      const parsed = typeof result === "string" ? JSON.parse(result) : result;
      return parsed;
    } catch (err: any) {
      console.error("getStats error:", err);
      return { total_jobs: 0 };
    }
  }, []);

  // ---------- WRITE METHODS ----------

  const writeTx = useCallback(
    async (functionName: string, args: any[], value: bigint = BigInt(0)): Promise<string | null> => {
      if (!address || !provider) {
        setError("Wallet not connected");
        return null;
      }

      setLoading(true);
      setError(null);
      setTxHash(null);

      try {
        const eth = (window as any).ethereum;
        try {
          await eth.request({
            method: "wallet_addEthereumChain",
            params: [STUDIONET_CHAIN_CONFIG],
          });
        } catch (addErr: any) {
          if (addErr.code !== -32602 && addErr.code !== 4902) {
            console.warn("Studionet network add/update skipped:", addErr);
          }
        }

        try {
          await eth.request({
            method: "wallet_switchEthereumChain",
            params: [{ chainId: "0xF22F" }], // 61999 in hex
          });
        } catch (switchErr: any) {
          if (switchErr.code === 4902) {
            try {
              await eth.request({
                method: "wallet_addEthereumChain",
                params: [{
                  ...STUDIONET_CHAIN_CONFIG,
                }],
              });
            } catch (addErr: any) {
              await eth.request({
                method: "wallet_switchEthereumChain",
                params: [{ chainId: "0xF22F" }],
              });
            }
          } else {
            throw switchErr;
          }
        }

        const writeClient = createWriteClient(
          address as `0x${string}`,
          provider
        );

        const hash = await writeClient.writeContract({
          address: CONTRACT_ADDRESS as `0x${string}`,
          functionName,
          args,
          value,
        });

        setTxHash(hash);

        await readClient.waitForTransactionReceipt({
          hash,
          status: "ACCEPTED" as any,
          retries: 30,
          interval: 3000,
        });

        setLoading(false);
        return hash;
      } catch (err: any) {
        console.error(`${functionName} error:`, err);
        setError(err.message || `${functionName} failed`);
        setLoading(false);
        return null;
      }
    },
    [address, provider]
  );

  const createJob = useCallback(
    async (title: string, description: string, escrowAmount: string) => {
      try {
        const escrowValue = parseGenToWei(escrowAmount);
        return writeTx("create_job", [title, description, address || "", escrowAmount], escrowValue);
      } catch (err: any) {
        setError(err.message || "Invalid escrow amount");
        return null;
      }
    },
    [writeTx, address]
  );

  const cancelJob = useCallback(
    async (jobId: string) => {
      return writeTx("cancel_job", [jobId, address || ""]);
    },
    [writeTx, address]
  );

  const acceptJob = useCallback(
    async (jobId: string) => {
      return writeTx("accept_job", [jobId, address || ""]);
    },
    [writeTx, address]
  );

  const submitDeliverable = useCallback(
    async (jobId: string, deliverable: string) => {
      return writeTx("submit_deliverable", [jobId, deliverable]);
    },
    [writeTx]
  );

  const approveDelivery = useCallback(
    async (jobId: string) => {
      return writeTx("approve_delivery", [jobId]);
    },
    [writeTx]
  );

  const raiseDispute = useCallback(
    async (jobId: string, complaint: string) => {
      return writeTx("raise_dispute", [jobId, complaint]);
    },
    [writeTx]
  );

  return {
    loading,
    txHash,
    error,
    getJob,
    getAllJobs,
    getStats,
    createJob,
    cancelJob,
    acceptJob,
    submitDeliverable,
    approveDelivery,
    raiseDispute,
    clearError: () => setError(null),
  };
}
