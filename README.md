# PayGuard — Freelancer Payment Protection with AI Arbitration

A real dApp frontend built on **GenLayer Testnet Studionet** for the **Aleph Hackathon (Onchain Justice Track)**.

## What it does

1. **Client creates a job** with a description and sends native GEN as transaction value
2. **Contract escrows the GEN** in the PayGuard contract balance and records the exact wei amount
3. **Freelancer accepts** and does the work
4. **Freelancer submits** a deliverable description
5. **Client can approve** to release escrow OR **dispute** for AI arbitration
6. **AI verdict** releases GEN to the freelancer or refunds GEN to the client

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
  args: [title, description, escrowAmount],
  value: escrowAmountWei, // native GEN sent into contract escrow
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
| `create_job(title, description, escrow_amount)` | payable write | Create a job and lock the attached native GEN value in escrow |
| `cancel_job(job_id)` | write | Client cancels an open job and receives an escrow refund |
| `accept_job(job_id)` | write | Accept an open job as the freelancer wallet |
| `submit_deliverable(job_id, deliverable)` | write | Assigned freelancer submits completed work |
| `approve_delivery(job_id)` | write | Client approves delivery and releases escrow to freelancer |
| `raise_dispute(job_id, client_complaint)` | write | Trigger AI arbitration and release/refund escrow based on verdict |
| `get_job(job_id)` | view | Get single job |
| `get_all_jobs()` | view | Get all jobs |
| `get_stats()` | view | Get job count |


## Escrow implementation

PayGuard now uses GenLayer native value transfers instead of only storing a display string:

- `create_job` is decorated with `@gl.public.write.payable` and requires `gl.message.value > 0`.
- The contract records both the human display amount and the exact `escrow_amount_wei`.
- `cancel_job` refunds the client while the job is still open.
- `approve_delivery` releases the full escrow to the assigned freelancer.
- `raise_dispute` runs AI arbitration, then releases escrow to the freelancer for a `FREELANCER` verdict or refunds the client for a `CLIENT` verdict.
- The frontend sends the GEN amount as `value` in the `create_job` transaction and shows whether funds are held, released, or refunded.

## Deploy to Vercel

```bash
npm run build
# Then deploy the .next output to Vercel
```

Or connect your GitHub repo to Vercel for automatic deploys.
