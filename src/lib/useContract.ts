"use client";

import { useState, useCallback } from "react";
import {
  createReadClient,
  createWriteClient,
  CONTRACT_ADDRESS,
} from "./genlayer";

export interface Job {
  id: string;
  title: string;
  description: string;
  client: string;
  freelancer: string;
  deliverable: string;
  escrow_amount: string;
  escrow_amount_wei: string;
  status: string;
  verdict: string;
  verdict_reasoning: string;
  match_percentage?: number;
  paid_to: string;
  payment_tx: string;
}

const NATIVE_TOKEN_DECIMALS = 18;

function parseGenAmount(amount: string): bigint {
  const trimmed = amount.trim();
  if (!/^\d+(\.\d{1,18})?$/.test(trimmed)) {
    throw new Error("Enter a valid GEN amount with up to 18 decimals");
  }

  const [whole, fraction = ""] = trimmed.split(".");
  const paddedFraction = fraction.padEnd(NATIVE_TOKEN_DECIMALS, "0");
  const wei = BigInt(whole) * BigInt(10) ** BigInt(NATIVE_TOKEN_DECIMALS) + BigInt(paddedFraction);

  if (wei <= BigInt(0)) {
    throw new Error("Escrow amount must be greater than 0 GEN");
  }

  return wei;
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

  const getStats = useCallback(async (): Promise<{ total_jobs: number }> => {
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
        // Ensure MetaMask is on the Studionet chain before sending.
        // If it's on a different chain it uses that chain's gas price.
        const eth = (window as any).ethereum;
        try {
          await eth.request({
            method: "wallet_switchEthereumChain",
            params: [{ chainId: "0xF22F" }], // 61999 in hex
          });
        } catch (switchErr: any) {
          // 4902 = chain not added yet — add it first, then it auto-switches
          if (switchErr.code === 4902) {
            try {
              await eth.request({
                method: "wallet_addEthereumChain",
                params: [{
                  chainId: "0xF22F",
                  chainName: "GenLayer Studionet",
                  nativeCurrency: { name: "GEN", symbol: "GEN", decimals: 18 },
                  rpcUrls: ["https://studio.genlayer.com/api"],
                  blockExplorerUrls: ["https://explorer-studio.genlayer.com"],
                }],
              });
            } catch (addErr: any) {
              // MetaMask may say "already exists" even after returning 4902 on
              // switch — in that case just retry the switch directly.
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

        // Wait for acceptance — use retries since studionet can be slow
        const receipt = await readClient.waitForTransactionReceipt({
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
        const escrowValue = parseGenAmount(escrowAmount);
        return writeTx("create_job", [title, description, escrowAmount], escrowValue);
      } catch (err: any) {
        setError(err.message || "Invalid escrow amount");
        return null;
      }
    },
    [writeTx]
  );

  const cancelJob = useCallback(
    async (jobId: string) => {
      return writeTx("cancel_job", [jobId]);
    },
    [writeTx]
  );

  const acceptJob = useCallback(
    async (jobId: string) => {
      return writeTx("accept_job", [jobId]);
    },
    [writeTx]
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
    // State
    loading,
    txHash,
    error,
    // Reads
    getJob,
    getAllJobs,
    getStats,
    // Writes
    createJob,
    cancelJob,
    acceptJob,
    submitDeliverable,
    approveDelivery,
    raiseDispute,
    // Reset
    clearError: () => setError(null),
  };
}
