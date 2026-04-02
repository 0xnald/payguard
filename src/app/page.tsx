"use client";

import { useState, useEffect, useCallback } from "react";
import { useWallet } from "@/lib/useWallet";
import { useContract, Job } from "@/lib/useContract";
import { CONTRACT_ADDRESS, FAUCET_URL, EXPLORER_URL } from "@/lib/genlayer";

// ============================================================================
// STATUS BADGE
// ============================================================================
function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { bg: string; text: string; label: string }> = {
    OPEN: { bg: "bg-cyan-50", text: "text-cyan-800", label: "Open" },
    IN_PROGRESS: { bg: "bg-orange-50", text: "text-orange-800", label: "In Progress" },
    SUBMITTED: { bg: "bg-indigo-50", text: "text-indigo-800", label: "Submitted" },
    APPROVED: { bg: "bg-green-50", text: "text-green-800", label: "Approved" },
    CANCELLED: { bg: "bg-gray-100", text: "text-gray-500", label: "Cancelled" },
    RESOLVED_FOR_FREELANCER: { bg: "bg-green-50", text: "text-green-800", label: "Freelancer Wins" },
    RESOLVED_FOR_CLIENT: { bg: "bg-red-50", text: "text-red-800", label: "Client Wins" },
  };
  const c = config[status] || config.OPEN;
  return (
    <span className={`${c.bg} ${c.text} px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap`}>
      {c.label}
    </span>
  );
}

// ============================================================================
// SHIELD ICON
// ============================================================================
function ShieldIcon({ size = 32 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none">
      <rect width="40" height="40" rx="10" fill="rgba(0,188,212,0.08)" />
      <path
        d="M20 8L10 13V19C10 25.05 14.26 30.74 20 32C25.74 30.74 30 25.05 30 19V13L20 8Z"
        fill="none" stroke="#00BCD4" strokeWidth="1.8"
      />
      <path d="M16 20L19 23L25 17" stroke="#00BCD4" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// ============================================================================
// HEADER
// ============================================================================
function Header({
  address, isConnecting, onConnect, onDisconnect, onGoHome,
}: {
  address: string | null;
  isConnecting: boolean;
  onConnect: () => void;
  onDisconnect: () => void;
  onGoHome: () => void;
}) {
  return (
    <header className="sticky top-0 z-50 bg-[#f4f8fb]/85 backdrop-blur-xl border-b border-black/5">
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        <button onClick={onGoHome} className="flex items-center gap-2.5 hover:opacity-80 transition">
          <ShieldIcon size={28} />
          <span className="font-display font-bold text-lg">PayGuard</span>
        </button>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/80 border border-black/5 text-xs text-gray-500">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
            Studionet
          </div>
          {address ? (
            <div className="flex items-center gap-2">
              <div className="px-3 py-1.5 rounded-full bg-brand-50 border border-brand-200 text-xs text-brand-800 font-medium font-mono">
                {address.slice(0, 6)}...{address.slice(-4)}
              </div>
              <button
                onClick={onDisconnect}
                className="px-4 py-1.5 rounded-full border border-black/10 text-xs text-gray-500 hover:border-red-400 hover:text-red-500 transition"
              >
                Disconnect
              </button>
            </div>
          ) : (
            <button
              onClick={onConnect}
              disabled={isConnecting}
              className="px-5 py-2 rounded-full bg-gradient-to-r from-brand-500 to-brand-700 text-white text-sm font-semibold shadow-lg shadow-brand-500/30 hover:shadow-brand-500/50 transition disabled:opacity-50"
            >
              {isConnecting ? "Connecting..." : "Connect Wallet"}
            </button>
          )}
        </div>
      </div>
    </header>
  );
}

// ============================================================================
// HOME VIEW
// ============================================================================
function HomeView({ onConnect }: { onConnect: () => void }) {
  return (
    <div className="max-w-6xl mx-auto px-6 py-20 text-center">
      <div className="animate-fade-up">
        <div className="w-20 h-20 mx-auto mb-8 rounded-2xl bg-brand-50 flex items-center justify-center">
          <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
            <path d="M20 4L6 11V21C6 29.28 12.08 37.04 20 39C27.92 37.04 34 29.28 34 21V11L20 4Z" stroke="#00BCD4" strokeWidth="2" fill="none" />
            <path d="M14 21L18 25L27 16" stroke="#00BCD4" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <h1 className="font-display text-5xl font-extrabold mb-4 tracking-tight">PayGuard</h1>
        <p className="text-lg text-gray-500 max-w-md mx-auto mb-12">
          Freelancer Payment Protection with AI Arbitration
        </p>
      </div>

      <div className="grid grid-cols-3 gap-5 max-w-2xl mx-auto mb-12">
        {[
          { icon: "📋", title: "Post Job", desc: "Client describes the work and locks escrow payment." },
          { icon: "🔨", title: "Do Work", desc: "Freelancer accepts, delivers, and submits." },
          { icon: "⚖️", title: "AI Resolves", desc: "If disputed, AI validators judge fairly." },
        ].map((c, i) => (
          <div key={i} className={`bg-white/70 backdrop-blur rounded-2xl p-8 border border-black/5 animate-fade-up-delay-${i + 1}`}>
            <div className="text-3xl mb-3">{c.icon}</div>
            <div className="font-semibold mb-2">{c.title}</div>
            <div className="text-sm text-gray-500 leading-relaxed">{c.desc}</div>
          </div>
        ))}
      </div>

      <button
        onClick={onConnect}
        className="px-10 py-3.5 rounded-full bg-gradient-to-r from-brand-500 to-brand-700 text-white text-base font-semibold shadow-lg shadow-brand-500/30 hover:shadow-brand-500/50 hover:-translate-y-0.5 transition animate-fade-up-delay-3"
      >
        Connect Wallet
      </button>

      <p className="mt-5 text-sm text-gray-400">
        Need testnet tokens?{" "}
        <a href={FAUCET_URL} target="_blank" rel="noopener" className="text-brand-500 font-medium hover:underline">
          Get from faucet →
        </a>
      </p>
    </div>
  );
}

// ============================================================================
// DASHBOARD VIEW
// ============================================================================
function DashboardView({
  jobs, totalJobs, isLoading, onRefresh, onCreateJob, onSelectJob,
}: {
  jobs: Job[];
  totalJobs: number;
  isLoading: boolean;
  onRefresh: () => void;
  onCreateJob: () => void;
  onSelectJob: (id: string) => void;
}) {
  const [filter, setFilter] = useState("ALL");

  const filtered = filter === "ALL" ? jobs : jobs.filter((j) => {
    if (filter === "OPEN") return j.status === "OPEN";
    if (filter === "ACTIVE") return ["IN_PROGRESS", "SUBMITTED"].includes(j.status);
    if (filter === "RESOLVED") return ["APPROVED", "RESOLVED_FOR_FREELANCER", "RESOLVED_FOR_CLIENT", "CANCELLED"].includes(j.status);
    return true;
  });

  const openCount = jobs.filter((j) => j.status === "OPEN").length;
  const activeCount = jobs.filter((j) => ["IN_PROGRESS", "SUBMITTED"].includes(j.status)).length;
  const resolvedCount = jobs.filter((j) => j.status.startsWith("RESOLVED") || j.status === "APPROVED").length;

  return (
    <div className="max-w-6xl mx-auto px-6 py-10 animate-fade-up">
      <div className="grid grid-cols-4 gap-4 mb-8">
        {[
          { label: "Total Jobs", value: totalJobs, color: "text-brand-500" },
          { label: "Open", value: openCount, color: "text-cyan-500" },
          { label: "Active", value: activeCount, color: "text-orange-500" },
          { label: "Resolved", value: resolvedCount, color: "text-green-500" },
        ].map((s, i) => (
          <div key={i} className="bg-white/70 backdrop-blur rounded-xl p-5 border border-black/5">
            <div className="text-xs text-gray-400 font-medium mb-1">{s.label}</div>
            <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
          </div>
        ))}
      </div>

      <div className="flex justify-between items-center mb-6">
        <div className="flex gap-1 bg-white/60 rounded-lg p-1">
          {["ALL", "OPEN", "ACTIVE", "RESOLVED"].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition ${
                filter === f ? "bg-white text-gray-900 shadow-sm" : "text-gray-400 hover:text-gray-600"
              }`}
            >
              {f === "ALL" ? "All" : f.charAt(0) + f.slice(1).toLowerCase()}
            </button>
          ))}
        </div>

        <div className="flex gap-2">
          <button
            onClick={onRefresh}
            disabled={isLoading}
            className="px-4 py-2 rounded-lg border border-black/10 text-sm text-gray-500 hover:border-brand-300 hover:text-brand-600 transition disabled:opacity-50"
          >
            {isLoading ? "Loading..." : "↻ Refresh"}
          </button>
          <button
            onClick={onCreateJob}
            className="px-5 py-2 rounded-lg bg-gradient-to-r from-brand-500 to-brand-700 text-white text-sm font-semibold shadow-lg shadow-brand-500/30 hover:shadow-brand-500/50 transition flex items-center gap-2"
          >
            <span className="text-lg leading-none">+</span> Create Job
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        {isLoading && jobs.length === 0 && (
          <div className="text-center py-16 bg-white/50 rounded-2xl text-gray-400">
            <div className="w-10 h-10 mx-auto mb-4 border-2 border-brand-200 border-t-brand-500 rounded-full animate-spin" />
            Loading jobs from Studionet...
          </div>
        )}
        {!isLoading && filtered.length === 0 && (
          <div className="text-center py-16 bg-white/50 rounded-2xl text-gray-400">
            <div className="text-4xl mb-3">📭</div>
            No jobs found.
          </div>
        )}
        {filtered.map((job) => (
          <button
            key={job.id}
            onClick={() => onSelectJob(job.id)}
            className="bg-white/75 backdrop-blur rounded-xl p-5 border border-black/5 flex justify-between items-center hover:shadow-lg hover:shadow-black/5 hover:-translate-y-px transition text-left group"
          >
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-3 mb-1">
                <span className="font-semibold text-sm truncate">{job.title}</span>
                <StatusBadge status={job.status} />
                {job.escrow_amount && (
                  <span className="px-2 py-0.5 rounded-full bg-brand-50 text-brand-700 text-xs font-semibold">
                    {job.escrow_amount} GEN
                  </span>
                )}
              </div>
              <div className="text-xs text-gray-400 truncate max-w-xl">{job.description}</div>
            </div>
            <span className="text-xs text-gray-300 group-hover:text-brand-400 transition ml-4 flex-shrink-0">
              #{job.id} →
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// CREATE JOB VIEW
// ============================================================================
function CreateJobView({
  onBack, onSubmit, loading, error,
}: {
  onBack: () => void;
  onSubmit: (title: string, description: string, escrowAmount: string) => Promise<void>;
  loading: boolean;
  error: string | null;
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [escrowAmount, setEscrowAmount] = useState("");

  const handleSubmit = async () => {
    if (!title.trim() || !description.trim() || !escrowAmount.trim()) return;
    await onSubmit(title.trim(), description.trim(), escrowAmount.trim());
  };

  return (
    <div className="max-w-xl mx-auto px-6 py-10 animate-fade-up">
      <button onClick={onBack} className="text-sm text-gray-400 hover:text-gray-600 mb-6 flex items-center gap-1">
        ← Back to Dashboard
      </button>

      <div className="bg-white/75 backdrop-blur rounded-2xl p-8 border border-black/5">
        <h2 className="font-display text-2xl font-bold mb-2">Create a Job</h2>
        <p className="text-sm text-gray-400 mb-7 leading-relaxed">
          Describe the work and set the escrow amount. Funds are held until the job is approved or resolved.
        </p>

        <div className="mb-5">
          <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5">
            Job Title
          </label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Design a Logo for SaaS Startup"
            className="w-full px-4 py-3 rounded-lg border border-black/10 text-sm bg-white/80 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 outline-none transition"
          />
        </div>

        <div className="mb-5">
          <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5">
            Job Description
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe what needs to be done, deliverables, requirements..."
            rows={5}
            className="w-full px-4 py-3 rounded-lg border border-black/10 text-sm bg-white/80 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 outline-none transition resize-y leading-relaxed"
          />
        </div>

        <div className="mb-6">
          <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5">
            Escrow Amount (GEN)
          </label>
          <div className="relative">
            <input
              value={escrowAmount}
              onChange={(e) => setEscrowAmount(e.target.value)}
              placeholder="e.g. 100"
              type="number"
              min="0"
              className="w-full px-4 py-3 rounded-lg border border-black/10 text-sm bg-white/80 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 outline-none transition pr-16"
            />
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-gray-400 font-semibold">GEN</span>
          </div>
          <p className="text-xs text-gray-400 mt-1.5">
            Amount held in escrow until the job is approved or dispute is resolved.
          </p>
        </div>

        <div className="flex items-center gap-2 px-4 py-3 rounded-lg bg-brand-50 border border-brand-100 mb-6 text-xs text-brand-800">
          <span>ℹ</span>
          <span>
            Contract:{" "}
            <code className="font-mono text-[11px]">
              {CONTRACT_ADDRESS.slice(0, 10)}...{CONTRACT_ADDRESS.slice(-6)}
            </code>{" "}
            on Studionet
          </span>
        </div>

        {error && (
          <div className="px-4 py-3 rounded-lg bg-red-50 border border-red-100 text-xs text-red-700 mb-4">
            {error}
          </div>
        )}

        <button
          onClick={handleSubmit}
          disabled={loading || !title.trim() || !description.trim() || !escrowAmount.trim()}
          className="w-full py-3.5 rounded-lg bg-gradient-to-r from-brand-500 to-brand-700 text-white font-semibold shadow-lg shadow-brand-500/30 hover:shadow-brand-500/50 transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Sending to Studionet...
            </span>
          ) : (
            "Create Job & Lock Escrow →"
          )}
        </button>
      </div>
    </div>
  );
}

// ============================================================================
// JOB DETAIL VIEW
// ============================================================================
function JobDetailView({
  job, walletAddress, onBack, onAccept, onCancel, onSubmitDeliverable, onApprove, onDispute,
  loading, error, txHash,
}: {
  job: Job | null;
  walletAddress: string | null;
  onBack: () => void;
  onAccept: (jobId: string) => Promise<void>;
  onCancel: (jobId: string) => Promise<void>;
  onSubmitDeliverable: (jobId: string, deliverable: string) => Promise<void>;
  onApprove: (jobId: string) => Promise<void>;
  onDispute: (jobId: string, complaint: string) => Promise<void>;
  loading: boolean;
  error: string | null;
  txHash: string | null;
}) {
  const [deliverable, setDeliverable] = useState("");
  const [complaint, setComplaint] = useState("");
  const [showDispute, setShowDispute] = useState(false);

  if (!job) {
    return <div className="max-w-xl mx-auto px-6 py-20 text-center text-gray-400">Job not found</div>;
  }

  const wallet = walletAddress?.toLowerCase();
  const isClient = wallet === job.client?.toLowerCase();
  const isFreelancer = wallet === job.freelancer?.toLowerCase();

  return (
    <div className="max-w-3xl mx-auto px-6 py-10 animate-fade-up">
      <button onClick={onBack} className="text-sm text-gray-400 hover:text-gray-600 mb-6 flex items-center gap-1">
        ← Back to Dashboard
      </button>

      {/* Job Header */}
      <div className="bg-white/75 backdrop-blur rounded-2xl p-6 border border-black/5 mb-4">
        <div className="flex justify-between items-start mb-4">
          <div>
            <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-1">Job #{job.id}</div>
            <h2 className="font-display text-xl font-bold">{job.title}</h2>
          </div>
          <div className="flex items-center gap-2">
            {job.escrow_amount && (
              <span className="px-3 py-1 rounded-full bg-brand-50 border border-brand-100 text-brand-700 text-xs font-bold">
                🔒 {job.escrow_amount} GEN
              </span>
            )}
            <StatusBadge status={job.status} />
          </div>
        </div>

        <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-1">Description</div>
        <p className="text-sm text-gray-600 leading-relaxed mb-4">{job.description}</p>

        <div className="flex gap-8 text-xs">
          <div>
            <span className="text-gray-400">Client: </span>
            <span className={`font-mono text-[11px] ${isClient ? "text-brand-600 font-semibold" : ""}`}>
              {job.client || "—"} {isClient && "(you)"}
            </span>
          </div>
          <div>
            <span className="text-gray-400">Freelancer: </span>
            <span className={`font-mono text-[11px] ${isFreelancer ? "text-brand-600 font-semibold" : ""}`}>
              {job.freelancer || "—"} {isFreelancer && "(you)"}
            </span>
          </div>
        </div>
      </div>

      {/* Deliverable */}
      {job.deliverable && (
        <div className="bg-white/75 backdrop-blur rounded-2xl p-6 border border-black/5 mb-4">
          <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-1">Deliverable</div>
          <p className="text-sm text-gray-600 leading-relaxed">{job.deliverable}</p>
        </div>
      )}

      {/* Verdict */}
      {job.verdict && (
        <div className={`rounded-2xl p-6 border mb-4 ${
          job.verdict === "FREELANCER" || job.verdict === "APPROVED_BY_CLIENT"
            ? "bg-green-50/60 border-green-200"
            : "bg-red-50/60 border-red-200"
        }`}>
          <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-2">
            {job.verdict === "APPROVED_BY_CLIENT" ? "✓ Client Approval" : "⚖ AI Verdict"}
          </div>
          <div className="flex items-center gap-3 mb-3">
            <span className={`text-lg font-bold ${
              job.verdict === "FREELANCER" || job.verdict === "APPROVED_BY_CLIENT"
                ? "text-green-700" : "text-red-700"
            }`}>
              {job.verdict === "APPROVED_BY_CLIENT"
                ? "Approved by Client"
                : `Ruled for ${job.verdict === "FREELANCER" ? "Freelancer" : "Client"}`}
            </span>
            {job.match_percentage !== undefined && job.match_percentage > 0 && (
              <span className="px-3 py-1 rounded-full bg-brand-50 text-xs font-semibold text-brand-800">
                {job.match_percentage}% match
              </span>
            )}
          </div>
          <p className="text-sm text-gray-500 italic leading-relaxed">&ldquo;{job.verdict_reasoning}&rdquo;</p>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="px-4 py-3 rounded-lg bg-red-50 border border-red-100 text-xs text-red-700 mb-4">{error}</div>
      )}

      {/* Tx Hash */}
      {txHash && (
        <div className="px-4 py-3 rounded-lg bg-green-50 border border-green-100 text-xs text-green-700 mb-4">
          Tx:{" "}
          <a href={`${EXPLORER_URL}/tx/${txHash}`} target="_blank" rel="noopener" className="font-mono underline">
            {txHash.slice(0, 14)}...{txHash.slice(-8)}
          </a>
        </div>
      )}

      {/* CLIENT: Cancel job (only when OPEN and no freelancer yet) */}
      {job.status === "OPEN" && isClient && (
        <div className="bg-white/75 backdrop-blur rounded-2xl p-6 border border-black/5 mb-4">
          <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-2">Manage Job</div>
          <p className="text-xs text-gray-400 mb-4">
            No one has accepted this job yet. You can cancel and withdraw your escrow.
          </p>
          <button
            onClick={() => onCancel(job.id)}
            disabled={loading}
            className="px-6 py-3 rounded-lg border border-red-300 text-red-500 text-sm font-semibold hover:bg-red-50 transition disabled:opacity-50"
          >
            {loading ? "Processing..." : "✕ Cancel Job & Withdraw Escrow"}
          </button>
        </div>
      )}

      {/* FREELANCER: Accept job (only if not the client) */}
      {job.status === "OPEN" && !isClient && (
        <div className="bg-white/75 backdrop-blur rounded-2xl p-6 border border-black/5 mb-4">
          <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-2">Accept this Job</div>
          <p className="text-xs text-gray-400 mb-4">
            Accept this job to start working. Your wallet address will be recorded as the freelancer.
          </p>
          <button
            onClick={() => onAccept(job.id)}
            disabled={loading}
            className="px-6 py-3 rounded-lg bg-gradient-to-r from-brand-500 to-brand-700 text-white text-sm font-semibold shadow-lg shadow-brand-500/30 disabled:opacity-50"
          >
            {loading ? "Submitting..." : "Accept Job"}
          </button>
        </div>
      )}

      {/* FREELANCER: Submit deliverable */}
      {job.status === "IN_PROGRESS" && isFreelancer && (
        <div className="bg-white/75 backdrop-blur rounded-2xl p-6 border border-black/5 mb-4">
          <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-2">Submit Deliverable</div>
          <textarea
            value={deliverable}
            onChange={(e) => setDeliverable(e.target.value)}
            placeholder="Describe your completed work..."
            rows={4}
            className="w-full px-4 py-3 rounded-lg border border-black/10 text-sm bg-white/80 focus:border-brand-500 outline-none transition resize-y leading-relaxed mb-3"
          />
          <button
            onClick={() => { if (deliverable.trim()) onSubmitDeliverable(job.id, deliverable.trim()); }}
            disabled={loading || !deliverable.trim()}
            className="px-6 py-3 rounded-lg bg-gradient-to-r from-brand-500 to-brand-700 text-white text-sm font-semibold shadow-lg shadow-brand-500/30 disabled:opacity-50"
          >
            {loading ? "Submitting..." : "Submit Deliverable →"}
          </button>
        </div>
      )}

      {/* CLIENT: Review deliverable — approve or dispute */}
      {job.status === "SUBMITTED" && isClient && (
        <div className="bg-white/75 backdrop-blur rounded-2xl p-6 border border-black/5 mb-4">
          <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-2">
            Review Deliverable
          </div>
          <p className="text-xs text-gray-400 mb-4">
            The freelancer has submitted their work above. Approve to release the{" "}
            <strong>{job.escrow_amount} GEN</strong> escrow, or raise a dispute for AI arbitration.
          </p>

          <div className="flex gap-3 mb-4">
            <button
              onClick={() => onApprove(job.id)}
              disabled={loading}
              className="flex-1 py-3 rounded-lg bg-gradient-to-r from-green-500 to-green-600 text-white text-sm font-semibold shadow-lg shadow-green-500/30 disabled:opacity-50"
            >
              {loading ? "Processing..." : "✓ Approve & Release Escrow"}
            </button>
            <button
              onClick={() => setShowDispute(!showDispute)}
              disabled={loading}
              className={`flex-1 py-3 rounded-lg text-sm font-semibold transition ${
                showDispute
                  ? "bg-white border border-red-400 text-red-500"
                  : "bg-gradient-to-r from-red-500 to-red-600 text-white shadow-lg shadow-red-500/30"
              } disabled:opacity-50`}
            >
              ⚖ Raise Dispute
            </button>
          </div>

          {showDispute && (
            <div className="animate-fade-up">
              <textarea
                value={complaint}
                onChange={(e) => setComplaint(e.target.value)}
                placeholder="Explain why the deliverable doesn't meet requirements..."
                rows={3}
                className="w-full px-4 py-3 rounded-lg border border-black/10 text-sm bg-white/80 focus:border-red-400 outline-none transition resize-y leading-relaxed mb-3"
              />
              <div className="flex items-start gap-2 px-4 py-3 rounded-lg bg-orange-50 border border-orange-200 mb-4 text-xs text-orange-700">
                <span>⚠</span>
                <span>
                  This triggers on-chain AI arbitration. Multiple validators will independently judge
                  whether the deliverable matches the job. This may take a minute.
                </span>
              </div>
              <button
                onClick={() => { if (complaint.trim()) onDispute(job.id, complaint.trim()); }}
                disabled={loading || !complaint.trim()}
                className="w-full py-3 rounded-lg bg-gradient-to-r from-red-500 to-red-600 text-white font-semibold shadow-lg shadow-red-500/30 disabled:opacity-50"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    AI Arbitrating on-chain...
                  </span>
                ) : (
                  "Submit Dispute for AI Judgment"
                )}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Waiting message for freelancer when submitted */}
      {job.status === "SUBMITTED" && isFreelancer && (
        <div className="px-4 py-3 rounded-lg bg-indigo-50 border border-indigo-100 text-xs text-indigo-700 mb-4">
          ⏳ Your deliverable has been submitted. Waiting for the client to review and approve or dispute.
        </div>
      )}

      {/* Contract info */}
      <div className="mt-4 px-4 py-3 rounded-lg bg-black/[0.02] text-[11px] text-gray-400 flex justify-between">
        <span>
          Contract:{" "}
          <a href={`${EXPLORER_URL}/address/${CONTRACT_ADDRESS}`} target="_blank" rel="noopener" className="font-mono hover:text-brand-500 transition">
            {CONTRACT_ADDRESS}
          </a>
        </span>
        <a href={FAUCET_URL} target="_blank" rel="noopener" className="text-brand-500 hover:underline">
          Faucet →
        </a>
      </div>
    </div>
  );
}

// ============================================================================
// MAIN APP
// ============================================================================
export default function Page() {
  const { address, isConnecting, error: walletError, connect, disconnect, provider } = useWallet();

  const {
    loading, txHash, error: contractError,
    getJob, getAllJobs, getStats,
    createJob, cancelJob, acceptJob, submitDeliverable, approveDelivery, raiseDispute,
    clearError,
  } = useContract(address, provider);

  const [view, setView] = useState<"home" | "dashboard" | "create" | "job">("home");
  const [jobs, setJobs] = useState<Job[]>([]);
  const [totalJobs, setTotalJobs] = useState(0);
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [jobsLoading, setJobsLoading] = useState(false);

  const fetchJobs = useCallback(async () => {
    setJobsLoading(true);
    try {
      const data = await getAllJobs();
      setJobs(Object.values(data.jobs || {}));
      setTotalJobs(data.total);
    } catch (err) {
      console.error("Failed to fetch jobs:", err);
    }
    setJobsLoading(false);
  }, [getAllJobs]);

  const fetchJob = useCallback(async (id: string) => {
    const j = await getJob(id);
    setSelectedJob(j);
  }, [getJob]);

  useEffect(() => {
    if (address && view === "home") { setView("dashboard"); fetchJobs(); }
    if (!address && view !== "home") setView("home");
  }, [address]);

  useEffect(() => {
    if (selectedJobId) fetchJob(selectedJobId);
  }, [selectedJobId, fetchJob]);

  return (
    <>
      <Header
        address={address}
        isConnecting={isConnecting}
        onConnect={connect}
        onDisconnect={disconnect}
        onGoHome={() => { if (address) { setView("dashboard"); fetchJobs(); } else setView("home"); }}
      />

      <div className="fixed top-0 left-0 right-0 h-80 bg-gradient-to-b from-[#E0F4F8] to-[#F4F8FB] -z-10" />

      {walletError && (
        <div className="max-w-6xl mx-auto px-6 mt-4">
          <div className="px-4 py-3 rounded-lg bg-red-50 border border-red-100 text-xs text-red-700">{walletError}</div>
        </div>
      )}

      {view === "home" && <HomeView onConnect={connect} />}

      {view === "dashboard" && (
        <DashboardView
          jobs={jobs}
          totalJobs={totalJobs}
          isLoading={jobsLoading}
          onRefresh={fetchJobs}
          onCreateJob={() => { clearError(); setView("create"); }}
          onSelectJob={(id) => { clearError(); setSelectedJobId(id); setView("job"); }}
        />
      )}

      {view === "create" && (
        <CreateJobView
          onBack={() => { setView("dashboard"); fetchJobs(); }}
          onSubmit={async (title, desc, amount) => {
            const hash = await createJob(title, desc, amount);
            if (hash) { setView("dashboard"); fetchJobs(); }
          }}
          loading={loading}
          error={contractError}
        />
      )}

      {view === "job" && (
        <JobDetailView
          job={selectedJob}
          walletAddress={address}
          onBack={() => { setView("dashboard"); fetchJobs(); }}
          onAccept={async (id) => { const hash = await acceptJob(id); if (hash) fetchJob(id); }}
          onCancel={async (id) => { const hash = await cancelJob(id); if (hash) { setView("dashboard"); fetchJobs(); } }}
          onSubmitDeliverable={async (id, d) => { const hash = await submitDeliverable(id, d); if (hash) fetchJob(id); }}
          onApprove={async (id) => { const hash = await approveDelivery(id); if (hash) fetchJob(id); }}
          onDispute={async (id, c) => { const hash = await raiseDispute(id, c); if (hash) fetchJob(id); }}
          loading={loading}
          error={contractError}
          txHash={txHash}
        />
      )}

      <footer className="border-t border-black/5 py-5 px-6 mt-20">
        <div className="max-w-6xl mx-auto flex justify-between items-center text-xs text-gray-400">
          <div className="flex items-center gap-2">
            <ShieldIcon size={16} />
            PayGuard
          </div>
          <span>Onchain Justice Track · Built on GenLayer Studionet</span>
        </div>
      </footer>
    </>
  );
}
