# PayGuard — Freelancer Payment Protection with AI Arbitration

A real dApp frontend built on **GenLayer Testnet Studionet** for the **Aleph Hackathon (Onchain Justice Track)**.

## What it does

1. **Client creates a job** with a description
2. **Freelancer accepts** and does the work
3. **Freelancer submits** a deliverable description
4. **Client can approve** (instant release) OR **dispute**
5. **If disputed**, AI validators judge: does the deliverable match the job?
6. **AI verdict** releases funds to freelancer OR refunds client

## Deployed Contract

- **Address:** `0x4Da6D68a1401A8CD9B7eD109013b43c19c75f79F`
- **Network:** GenLayer Testnet Studionet (Chain ID: 61999)
- **RPC:** `https://studio.genlayer.com/api`

## Tech Stack

- **Next.js 14** + TypeScript + Tailwind CSS
- **genlayer-js SDK** for contract reads/writes (NOT standard EVM ABI calls)
- **MetaMask** for wallet connection and transaction signing
- GenLayer Studionet added as custom chain via `wallet_addEthereumChain`

## Getting Started

### Prerequisites

- Node.js >= 18
- MetaMask (or Rabby, or any EIP-1193 wallet)
- Testnet GEN tokens from the [faucet](https://testnet-faucet.genlayer.foundation/)

### Install & Run

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### How it works under the hood

**Reads (free, no wallet needed):**
```ts
const readClient = createClient({ chain: studionet });
const result = await readClient.readContract({
  address: CONTRACT_ADDRESS,
  functionName: "get_all_jobs",
  args: [],
});
```

**Writes (MetaMask popup for signing):**
```ts
const writeClient = createClient({
  chain: studionet,
  account: walletAddress,    // from MetaMask
  provider: window.ethereum, // MetaMask provider
});
const txHash = await writeClient.writeContract({
  address: CONTRACT_ADDRESS,
  functionName: "create_job",
  args: [title, description, walletAddress],
  value: BigInt(0),
});
const receipt = await readClient.waitForTransactionReceipt({
  hash: txHash,
  status: "ACCEPTED",
});
```

## Project Structure

```
src/
├── app/
│   ├── globals.css        # Tailwind + custom fonts
│   ├── layout.tsx         # Root layout with metadata
│   └── page.tsx           # Main app (all views)
├── lib/
│   ├── genlayer.ts        # SDK client factory + constants
│   ├── useWallet.ts       # MetaMask connection hook
│   └── useContract.ts     # Contract interaction hook
└── types/
    └── global.d.ts        # window.ethereum types
```

## Contract Methods

| Method | Type | Description |
|--------|------|-------------|
| `create_job(title, description, client_address)` | write | Create a new job |
| `accept_job(job_id, freelancer_address)` | write | Accept an open job |
| `submit_deliverable(job_id, deliverable)` | write | Submit completed work |
| `approve_delivery(job_id)` | write | Client approves delivery |
| `raise_dispute(job_id, client_complaint)` | write | Trigger AI arbitration |
| `get_job(job_id)` | view | Get single job |
| `get_all_jobs()` | view | Get all jobs |
| `get_stats()` | view | Get job count |

## Deploy to Vercel

```bash
npm run build
# Then deploy the .next output to Vercel
```

Or connect your GitHub repo to Vercel for automatic deploys.
