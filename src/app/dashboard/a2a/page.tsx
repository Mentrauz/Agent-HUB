"use client";

import React, { useState } from "react";
import { clsx } from "clsx";
import {
  BTN_PRIMARY,
  BTN_SECONDARY,
  BTN_SECONDARY_SM,
  CARD,
  CARD_HEAD,
  CARD_TITLE,
  FIELD,
  INPUT,
  LABEL,
  META,
  PageHeader,
  ROW_HOVER,
  TH,
  Tag,
} from "@/components/ui/surfaces";
import { Copy, Check } from "lucide-react";
import { A2A_AGENT_PRESETS } from "@/modules/a2a/presets";
import { A2AAgentManifest } from "@/types/a2a";

export default function A2APage() {
  const [activeTab, setActiveTab] = useState<"discovery" | "tasks" | "auction" | "debate">("discovery");

  // Manifest Discovery State
  const [discoveredAgents, setDiscoveredAgents] = useState<A2AAgentManifest[]>(A2A_AGENT_PRESETS);
  const [selectedAgent, setSelectedAgent] = useState<A2AAgentManifest>(A2A_AGENT_PRESETS[0]);
  const [customAgentUrl, setCustomAgentUrl] = useState("");
  const [isDiscovering, setIsDiscovering] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Task Delegation State
  const [targetAgentUrl, setTargetAgentUrl] = useState("/api/a2a/tasks");
  const [taskCapability, setTaskCapability] = useState("autonomous_delegation");
  const [taskPrompt, setTaskPrompt] = useState(
    "Synthesize an executive architecture review for deploying PostgreSQL pgvector vs standalone Qdrant vector database."
  );
  const [isDelegating, setIsDelegating] = useState(false);
  const [_taskTokens, setTaskTokens] = useState<string[]>([]);
  const [taskResponse, setTaskResponse] = useState<Record<string, unknown> | null>(null);

  // Task Auction & Bidding State
  const [auctionTitle, setAuctionTitle] = useState("Enterprise Security & Compliance Audit");
  const [auctionDescription, setAuctionDescription] = useState(
    "Perform a deep static code analysis and token revocation audit across all API endpoints."
  );
  const [auctionCapability, setAuctionCapability] = useState("security_audit");
  const [isAuctionRunning, setIsAuctionRunning] = useState(false);
  const [auctionResult, setAuctionResult] = useState<Record<string, unknown> | null>(null);

  // Multi-Agent Debate Arena State (with Human-in-the-Loop)
  const [debateTopic, setDebateTopic] = useState(
    "Should our platform standardize on PostgreSQL pgvector for vector search or use a dedicated vector database like Qdrant?"
  );
  const [debateRounds, setDebateRounds] = useState(3);
  const [isDebating, setIsDebating] = useState(false);
  const [debateMessages, setDebateMessages] = useState<
    Array<{ sender: string; role: string; content: string; turn: number; isHuman?: boolean }>
  >([]);
  const [debateConsensus, setDebateConsensus] = useState<string | null>(null);
  const [_isDebatePaused, setIsDebatePaused] = useState(false);
  const [humanInterventionText, setHumanInterventionText] = useState("");

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  // Discover Remote Agent
  const handleDiscoverAgent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customAgentUrl.trim()) return;

    setIsDiscovering(true);
    try {
      const res = await fetch(`/api/a2a/discover?url=${encodeURIComponent(customAgentUrl)}`);
      const json = await res.json();
      if (res.ok && json.manifest) {
        setDiscoveredAgents((prev) => [json.manifest, ...prev.filter((a) => a.name !== json.manifest.name)]);
        setSelectedAgent(json.manifest);
      } else {
        alert(json.error || "Failed to discover agent manifest");
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : "Network error");
    } finally {
      setIsDiscovering(false);
    }
  };

  // Delegate Task with SSE Token Streaming
  const handleDelegateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskPrompt.trim()) return;

    setIsDelegating(true);
    setTaskTokens([]);
    setTaskResponse(null);

    try {
      const res = await fetch(targetAgentUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          taskId: `task_${Date.now()}`,
          capability: taskCapability,
          input: { prompt: taskPrompt },
        }),
      });

      if (res.ok) {
        const json = await res.json();
        setTaskResponse(json);
      } else {
        const json = await res.json();
        alert(json.error || "Task delegation failed");
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : "Error connecting to agent");
    } finally {
      setIsDelegating(false);
    }
  };

  // Run Task Auction & Bidding
  const handleRunAuction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auctionTitle.trim() || !auctionDescription.trim()) return;

    setIsAuctionRunning(true);
    setAuctionResult(null);

    try {
      const res = await fetch("/api/a2a/auction", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: auctionTitle,
          description: auctionDescription,
          requiredCapability: auctionCapability,
        }),
      });

      if (res.ok) {
        const json = await res.json();
        setAuctionResult(json.auction);
      } else {
        const json = await res.json();
        alert(json.error || "Auction failed");
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : "Network error");
    } finally {
      setIsAuctionRunning(false);
    }
  };

  // Run Multi-Agent Debate Arena
  const handleStartDebate = async () => {
    if (!debateTopic.trim()) return;

    setIsDebating(true);
    setDebateMessages([]);
    setDebateConsensus(null);
    setIsDebatePaused(false);

    const agents = [
      { name: "Proposer Agent", role: "proposer", stance: "unified pgvector simplicity and transactional consistency" },
      { name: "Critic Agent", role: "critic", stance: "dedicated Qdrant high-throughput scalability and advanced filtering" },
      { name: "Security Auditor", role: "auditor", stance: "compliance, isolated access control, and credential management" },
    ];

    const messages: Array<{ sender: string; role: string; content: string; turn: number; isHuman?: boolean }> = [];

    for (let turn = 1; turn <= debateRounds; turn++) {
      const agent = agents[(turn - 1) % agents.length];

      try {
        const res = await fetch("/api/a2a/messages", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sender: agent.name,
            role: agent.role,
            turn,
            content: `Round ${turn} Stance: In regards to "${debateTopic}", we advocate for ${agent.stance}.`,
          }),
        });

        if (res.ok) {
          const json = await res.json();
          messages.push({
            sender: agent.name,
            role: agent.role,
            content: json.reply,
            turn,
          });
          setDebateMessages([...messages]);
        }
      } catch {
        // Continue
      }

      await new Promise((r) => setTimeout(r, 600));
    }

    // Synthesize the consensus from the actual transcript via a real LLM call —
    // previously this was a hardcoded string returned regardless of what was said.
    try {
      const transcript = messages.map((m) => `${m.sender} (${m.role}): ${m.content}`).join("\n");
      const res = await fetch("/api/a2a/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sender: "Consensus Synthesizer",
          role: "moderator",
          turn: debateRounds + 1,
          content: `Debate topic: "${debateTopic}"\n\nFull transcript:\n${transcript || "(no agent responses were recorded)"}\n\nSynthesize one concrete consensus recommendation that reconciles the strongest points raised by each participant above. Respond with only the consensus paragraph, no preamble.`,
        }),
      });

      if (res.ok) {
        const json = await res.json();
        setDebateConsensus(json.reply);
      } else {
        setDebateConsensus("Consensus synthesis failed (LLM call errored) — review the transcript above manually.");
      }
    } catch (err) {
      setDebateConsensus(
        `Consensus synthesis failed (${err instanceof Error ? err.message : "network error"}) — review the transcript above manually.`
      );
    }
    setIsDebating(false);
  };

  // Inject Human Argument in Debate
  const handleInjectHumanArgument = () => {
    if (!humanInterventionText.trim()) return;

    const newMsg = {
      sender: "Human Moderator (HITL)",
      role: "mediator",
      content: humanInterventionText.trim(),
      turn: debateMessages.length + 1,
      isHuman: true,
    };

    setDebateMessages((prev) => [...prev, newMsg]);
    setHumanInterventionText("");
  };

  return (
    <div className="mx-auto w-full max-w-[1600px] space-y-6 pb-12">
      <PageHeader
        title="A2A protocol"
        meta={
          <>
            Discover agents through <code className="font-mono text-xs">/.well-known/agent.json</code>, delegate tasks, run auctions and moderate debates
          </>
        }
        action={<span className={META}>{discoveredAgents.length} known agents</span>}
      />
      {/* Tabs */}
      <div role="tablist" className="flex items-center gap-6 overflow-x-auto border-b border-[var(--border-subtle)]">
        {[
    { id: "discovery" as const, label: "Discovery" },
    { id: "tasks" as const, label: "Task delegation" },
    { id: "auction" as const, label: "Task auction" },
    { id: "debate" as const, label: "Debate (human in the loop)" },
        ].map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={activeTab === t.id}
            onClick={() => setActiveTab(t.id)}
            className={`-mb-px flex h-10 shrink-0 cursor-pointer items-center border-b-2 font-sans text-sm whitespace-nowrap transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)] ${
              activeTab === t.id
                ? "border-[var(--text-primary)] text-[var(--text-primary)]"
                : "border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)]"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Discovery */}
      {activeTab === "discovery" && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          <div className="space-y-4 lg:col-span-5">
            <section className={CARD}>
              <div className={CARD_HEAD}>
                <h2 className={CARD_TITLE}>Discover an agent</h2>
              </div>
              <form onSubmit={handleDiscoverAgent} className="space-y-2 p-5">
                <label htmlFor="a2a-url" className={LABEL}>
                  Agent root URL
                </label>
                <div className="flex gap-2">
                  <input
                    id="a2a-url"
                    type="text"
                    value={customAgentUrl}
                    onChange={(e) => setCustomAgentUrl(e.target.value)}
                    placeholder="https://remote-agent.example.com"
                    className={clsx(INPUT, "min-w-0 flex-1")}
                  />
                  <button type="submit" disabled={isDiscovering || !customAgentUrl.trim()} className={BTN_SECONDARY}>
                    {isDiscovering ? "Probing" : "Probe"}
                  </button>
                </div>
              </form>
            </section>

            <section className={CARD}>
              <div className={CARD_HEAD}>
                <h2 className={CARD_TITLE}>Known agents</h2>
                <span className={META}>{discoveredAgents.length}</span>
              </div>
              <ul className="divide-y divide-[var(--border-subtle)]">
                {discoveredAgents.map((agent) => {
                  const selected = selectedAgent.name === agent.name;
                  return (
                    <li key={agent.name}>
                      <button
                        type="button"
                        onClick={() => setSelectedAgent(agent)}
                        aria-pressed={selected}
                        className={clsx(
                          "relative w-full cursor-pointer space-y-1 px-5 py-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--accent-primary)]",
                          selected ? "bg-[var(--text-primary)]/[0.06]" : ROW_HOVER
                        )}
                      >
                        {selected && (
                          <span aria-hidden="true" className="absolute bottom-3 left-0 top-3 w-0.5 rounded-full bg-[var(--accent-primary)]" />
                        )}
                        <div className="flex items-baseline justify-between gap-3">
                          <span className="truncate font-sans text-sm font-medium text-[var(--text-primary)]">
                            {agent.displayName}
                          </span>
                          <span className={META}>v{agent.protocolVersion}</span>
                        </div>
                        <p className="line-clamp-2 font-sans text-[13px] leading-5 text-[var(--text-secondary)]">
                          {agent.description}
                        </p>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </section>
          </div>

          {/* Manifest inspector */}
          <section className={clsx(CARD, "self-start lg:col-span-7")}>
            <div className={CARD_HEAD}>
              <div className="min-w-0 space-y-1">
                <h2 className={CARD_TITLE}>{selectedAgent.displayName}</h2>
                <div className={clsx(META, "truncate")}>
                  {selectedAgent.name} · v{selectedAgent.version}
                </div>
              </div>
              <button
                type="button"
                onClick={() => copyToClipboard(JSON.stringify(selectedAgent, null, 2), "manifest")}
                className={BTN_SECONDARY_SM}
              >
                {copiedKey === "manifest" ? <Check className="h-4 w-4" strokeWidth={1.5} /> : <Copy className="h-4 w-4" strokeWidth={1.5} />}
                Copy JSON
              </button>
            </div>

            <div className="space-y-6 p-5">
              <div className="space-y-2">
                <div className={LABEL}>Endpoints</div>
                <dl className="divide-y divide-[var(--border-subtle)] rounded-[8px] border border-[var(--border-subtle)] font-mono text-xs">
                  <div className="flex items-center justify-between gap-4 px-3 py-2">
                    <dt className="text-[var(--text-muted)]">Tasks</dt>
                    <dd className="truncate text-[var(--text-primary)]">{selectedAgent.endpoints.tasks}</dd>
                  </div>
                  <div className="flex items-center justify-between gap-4 px-3 py-2">
                    <dt className="text-[var(--text-muted)]">Messages</dt>
                    <dd className="truncate text-[var(--text-primary)]">{selectedAgent.endpoints.messages}</dd>
                  </div>
                </dl>
              </div>

              <div className="space-y-2">
                <div className={LABEL}>Capabilities ({selectedAgent.capabilities.length})</div>
                <ul className="divide-y divide-[var(--border-subtle)] rounded-[8px] border border-[var(--border-subtle)]">
                  {selectedAgent.capabilities.map((cap) => (
                    <li key={cap.id} className="space-y-1 px-3 py-3">
                      <div className="flex items-baseline justify-between gap-3">
                        <span className="font-sans text-sm text-[var(--text-primary)]">{cap.name}</span>
                        <span className={META}>{cap.id}</span>
                      </div>
                      <p className="font-sans text-[13px] leading-5 text-[var(--text-secondary)]">{cap.description}</p>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </section>
        </div>
      )}

      {/* Task delegation */}
      {activeTab === "tasks" && (
        <div className="max-w-3xl space-y-6">
          <section className={CARD}>
            <div className={CARD_HEAD}>
              <h2 className={CARD_TITLE}>Delegate a task</h2>
            </div>
            <form onSubmit={handleDelegateTask} className="space-y-4 p-5">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <label htmlFor="a2a-target" className={LABEL}>
                    Task endpoint
                  </label>
                  <input
                    id="a2a-target"
                    type="text"
                    value={targetAgentUrl}
                    onChange={(e) => setTargetAgentUrl(e.target.value)}
                    required
                    className={clsx(INPUT, "w-full font-mono text-xs")}
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor="a2a-cap" className={LABEL}>
                    Capability ID
                  </label>
                  <input
                    id="a2a-cap"
                    type="text"
                    value={taskCapability}
                    onChange={(e) => setTaskCapability(e.target.value)}
                    required
                    className={clsx(INPUT, "w-full font-mono text-xs")}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label htmlFor="a2a-prompt" className={LABEL}>
                  Instructions
                </label>
                <textarea
                  id="a2a-prompt"
                  value={taskPrompt}
                  onChange={(e) => setTaskPrompt(e.target.value)}
                  rows={4}
                  required
                  className={clsx(FIELD, "w-full p-3 leading-6")}
                />
              </div>

              <button type="submit" disabled={isDelegating || !taskPrompt.trim()} className={BTN_PRIMARY}>
                {isDelegating ? "Delegating" : "Delegate task"}
              </button>
            </form>
          </section>

          {taskResponse && (
            <section className={clsx(CARD, "animate-fadeIn")}>
              <div className={CARD_HEAD}>
                <div className="flex items-baseline gap-4">
                  <Tag tone="good">Completed</Tag>
                  <span className={META}>{taskResponse.taskId as string}</span>
                </div>
                <span className={META}>{taskResponse.status as string}</span>
              </div>
              <div className="whitespace-pre-wrap p-5 font-sans text-sm leading-6 text-[var(--text-primary)]">
                {((taskResponse.result as Record<string, unknown>)?.output as string) ||
                  JSON.stringify(taskResponse.result, null, 2)}
              </div>
            </section>
          )}
        </div>
      )}

      {/* Task auction */}
      {activeTab === "auction" && (
        <div className="max-w-3xl space-y-6">
          <section className={CARD}>
            <div className={CARD_HEAD}>
              <div className="space-y-1">
                <h2 className={CARD_TITLE}>Run an auction</h2>
                <p className="font-sans text-[13px] text-[var(--text-muted)]">
                  Candidate agents bid with a confidence score, a latency estimate and a token budget. The winner runs the task.
                </p>
              </div>
            </div>
            <form onSubmit={handleRunAuction} className="space-y-4 p-5">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <label htmlFor="auction-title" className={LABEL}>
                    Task title
                  </label>
                  <input
                    id="auction-title"
                    type="text"
                    value={auctionTitle}
                    onChange={(e) => setAuctionTitle(e.target.value)}
                    required
                    className={clsx(INPUT, "w-full")}
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor="auction-cap" className={LABEL}>
                    Capability domain
                  </label>
                  <input
                    id="auction-cap"
                    type="text"
                    value={auctionCapability}
                    onChange={(e) => setAuctionCapability(e.target.value)}
                    required
                    className={clsx(INPUT, "w-full font-mono text-xs")}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label htmlFor="auction-desc" className={LABEL}>
                  Specification
                </label>
                <textarea
                  id="auction-desc"
                  value={auctionDescription}
                  onChange={(e) => setAuctionDescription(e.target.value)}
                  rows={3}
                  required
                  className={clsx(FIELD, "w-full p-3 leading-6")}
                />
              </div>

              <button type="submit" disabled={isAuctionRunning || !auctionTitle.trim()} className={BTN_PRIMARY}>
                {isAuctionRunning ? "Collecting bids" : "Run auction"}
              </button>
            </form>
          </section>

          {auctionResult && (
            <section className={clsx(CARD, "animate-fadeIn")}>
              <div className={CARD_HEAD}>
                <div className="flex items-baseline gap-3">
                  <h2 className={CARD_TITLE}>Awarded to</h2>
                  <span className="font-sans text-sm font-medium text-[var(--accent-primary)]">
                    {(auctionResult.winningBid as Record<string, unknown>)?.agentName as string}
                  </span>
                </div>
                <span className={META}>{auctionResult.auctionDurationMs as number} ms</span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-[var(--border-subtle)]">
                      <th scope="col" className={TH}>Agent</th>
                      <th scope="col" className={clsx(TH, "text-right")}>Confidence</th>
                      <th scope="col" className={clsx(TH, "text-right")}>Est. tokens</th>
                      <th scope="col" className={clsx(TH, "text-right")}>Est. latency</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border-subtle)]">
                    {((auctionResult.allBids as Array<Record<string, unknown>>) || []).map((bid, idx) => {
                      const isWinner =
                        bid.agentName === (auctionResult.winningBid as Record<string, unknown>)?.agentName;
                      return (
                        <tr key={idx}>
                          <td className="px-5 py-3 font-sans text-sm text-[var(--text-primary)]">
                            {bid.agentName as string}
                            {isWinner && <span className="ml-3 font-sans text-[13px] text-[var(--accent-primary)]">winner</span>}
                          </td>
                          <td className={clsx("px-5 py-3 text-right", META, isWinner && "text-[var(--text-primary)]")}>
                            {Math.round(((bid.confidenceScore as number) || 0) * 100)}%
                          </td>
                          <td className={clsx("px-5 py-3 text-right", META)}>{bid.estimatedTokens as number}</td>
                          <td className={clsx("px-5 py-3 text-right", META)}>{bid.estimatedDurationMs as number} ms</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>
          )}
        </div>
      )}

      {/* Debate */}
      {activeTab === "debate" && (
        <div className="max-w-3xl space-y-6">
          <section className={CARD}>
            <div className={CARD_HEAD}>
              <h2 className={CARD_TITLE}>Start a debate</h2>
            </div>
            <div className="space-y-4 p-5">
              <div className="space-y-2">
                <label htmlFor="debate-topic" className={LABEL}>
                  Topic or question
                </label>
                <input
                  id="debate-topic"
                  type="text"
                  value={debateTopic}
                  onChange={(e) => setDebateTopic(e.target.value)}
                  className={clsx(INPUT, "w-full")}
                />
              </div>

              <div className="flex flex-wrap items-center justify-between gap-4">
                <label className="flex items-center gap-3 font-sans text-[13px] text-[var(--text-secondary)]">
                  Rounds
                  <select
                    value={debateRounds}
                    onChange={(e) => setDebateRounds(parseInt(e.target.value, 10))}
                    className={clsx(FIELD, "h-9 cursor-pointer px-3")}
                  >
                    <option value={2}>2</option>
                    <option value={3}>3</option>
                    <option value={5}>5</option>
                  </select>
                </label>

                <button type="button" onClick={handleStartDebate} disabled={isDebating || !debateTopic.trim()} className={BTN_PRIMARY}>
                  {isDebating ? "Debating" : "Start debate"}
                </button>
              </div>
            </div>
          </section>

          {/* Transcript */}
          {debateMessages.length > 0 && (
            <ul className={clsx(CARD, "divide-y divide-[var(--border-subtle)]")}>
              {debateMessages.map((msg, idx) => (
                <li key={idx} className="relative animate-fadeIn space-y-2 px-5 py-4">
                  {msg.isHuman && (
                    <span aria-hidden="true" className="absolute bottom-4 left-0 top-4 w-0.5 rounded-full bg-[var(--state-warning)]" />
                  )}
                  <div className="flex items-baseline justify-between gap-3">
                    <div className="flex items-baseline gap-3">
                      <span className="font-sans text-sm font-medium text-[var(--text-primary)]">{msg.sender}</span>
                      <span className={META}>{msg.role}</span>
                    </div>
                    <span className={META}>turn {msg.turn}</span>
                  </div>
                  <p className="whitespace-pre-wrap font-sans text-sm leading-6 text-[var(--text-secondary)]">{msg.content}</p>
                </li>
              ))}
            </ul>
          )}

          {/* Human moderator */}
          {debateMessages.length > 0 && (
            <section className={clsx(CARD, "space-y-2 p-5")}>
              <label htmlFor="debate-human" className={LABEL}>
                Add your own argument or constraint
              </label>
              <div className="flex gap-2">
                <input
                  id="debate-human"
                  type="text"
                  value={humanInterventionText}
                  onChange={(e) => setHumanInterventionText(e.target.value)}
                  className={clsx(INPUT, "min-w-0 flex-1")}
                />
                <button
                  type="button"
                  onClick={handleInjectHumanArgument}
                  disabled={!humanInterventionText.trim()}
                  className={BTN_SECONDARY}
                >
                  Add
                </button>
              </div>
            </section>
          )}

          {debateConsensus && (
            <section className={clsx(CARD, "animate-fadeIn space-y-3 p-5")}>
              <Tag tone="good">Consensus</Tag>
              <p className="font-sans text-sm leading-6 text-[var(--text-primary)]">{debateConsensus}</p>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
