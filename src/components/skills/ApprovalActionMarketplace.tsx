"use client";

import React, { useState, useEffect, useMemo } from "react";
import { clsx } from "clsx";
import { OpenApiIntegrationDTO } from "@/types/openapi";
import { McpServerDTO } from "@/types/mcp";
import { openApiToolRegistryName } from "@/modules/openapi/dynamicTool";
import { mcpToolRegistryName } from "@/modules/mcp/toolAdapter";
import { toast } from "@/stores/toastStore";
import { BTN_SECONDARY_SM, FIELD, INPUT, META } from "@/components/ui/surfaces";

const PILL =
  "h-7 cursor-pointer rounded-[6px] border border-[var(--border-subtle)] px-2.5 font-mono text-xs text-[var(--text-secondary)] transition-colors hover:border-[var(--border-strong)] hover:text-[var(--text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)]";

interface ActionMarketplaceItem {
  id: string;
  name: string;
  category: "DISCOVERED" | "FINTECH" | "DEVOPS" | "CRM_WEBHOOKS" | "SECURITY";
  description: string;
  source?: string;
  riskLevel: "CRITICAL" | "HIGH" | "MEDIUM";
}

const MARKETPLACE_PRESETS: ActionMarketplaceItem[] = [
  // ─── FINTECH & PAYMENTS ───
  {
    id: "create_task",
    name: "create_task",
    category: "FINTECH",
    description: "Creates tasks or scheduled background jobs (Mock Task Creator)",
    riskLevel: "MEDIUM",
  },
  {
    id: "disburse_funds",
    name: "disburse_funds",
    category: "FINTECH",
    description: "Initiates financial wire transfers, payouts, or treasury disbursements",
    riskLevel: "CRITICAL",
  },
  {
    id: "execute_payment",
    name: "execute_payment",
    category: "FINTECH",
    description: "Charges credit cards, executes Stripe checkout, or merchant captures",
    riskLevel: "CRITICAL",
  },
  {
    id: "charge_stripe_customer",
    name: "charge_stripe_customer",
    category: "FINTECH",
    description: "Invokes Stripe API (POST /v1/charges or /v1/payment_intents)",
    source: "Public API: Stripe Payments",
    riskLevel: "CRITICAL",
  },
  {
    id: "issue_customer_refund",
    name: "issue_customer_refund",
    category: "FINTECH",
    description: "Processes merchant chargeback reversions or Stripe/PayPal dispute refunds",
    riskLevel: "HIGH",
  },
  {
    id: "transfer_crypto_wallet",
    name: "transfer_crypto_wallet",
    category: "FINTECH",
    description: "Signs on-chain blockchain cryptocurrency transfers & smart contracts",
    riskLevel: "CRITICAL",
  },
  {
    id: "approve_invoice_payout",
    name: "approve_invoice_payout",
    category: "FINTECH",
    description: "Releases accounts payable batches in QuickBooks, Xero, or SAP",
    riskLevel: "HIGH",
  },

  // ─── DEVOPS & CLOUD ───
  {
    id: "create_github_issue",
    name: "create_github_issue",
    category: "DEVOPS",
    description: "Creates an issue or bug ticket on GitHub REST API (POST /repos/{owner}/{repo}/issues)",
    source: "Public API: GitHub REST",
    riskLevel: "MEDIUM",
  },
  {
    id: "merge_pull_request",
    name: "merge_pull_request",
    category: "DEVOPS",
    description: "Merges a pull request into the main branch (PUT /repos/{owner}/{repo}/pulls/{id}/merge)",
    source: "Public API: GitHub REST",
    riskLevel: "HIGH",
  },
  {
    id: "delete_s3_bucket_object",
    name: "delete_s3_bucket_object",
    category: "DEVOPS",
    description: "Permanently purges files or media assets from Amazon S3 / Cloudflare R2 storage",
    source: "Public API: AWS S3",
    riskLevel: "CRITICAL",
  },
  {
    id: "deploy_k8s_container",
    name: "deploy_k8s_container",
    category: "DEVOPS",
    description: "Rolls out container image updates to Kubernetes production pods",
    riskLevel: "CRITICAL",
  },
  {
    id: "restart_production_server",
    name: "restart_production_server",
    category: "DEVOPS",
    description: "Initiates reboot or service cycling on cloud compute nodes",
    riskLevel: "HIGH",
  },
  {
    id: "delete_database_record",
    name: "delete_database_record",
    category: "DEVOPS",
    description: "Executes destructive SQL deletes, row purges, or Supabase table mutations",
    riskLevel: "CRITICAL",
  },
  {
    id: "modify_database_schema",
    name: "modify_database_schema",
    category: "DEVOPS",
    description: "Applies database schema migrations, index alters, or drops",
    riskLevel: "CRITICAL",
  },
  {
    id: "purge_cdn_cache",
    name: "purge_cdn_cache",
    category: "DEVOPS",
    description: "Invalidates edge CDN caches globally on Cloudflare/Fastly",
    riskLevel: "MEDIUM",
  },
  {
    id: "rollback_release",
    name: "rollback_release",
    category: "DEVOPS",
    description: "Rolls back application deployments to the previous stable git commit",
    riskLevel: "HIGH",
  },

  // ─── CRM & COMMS ───
  {
    id: "send_slack_broadcast",
    name: "send_slack_broadcast",
    category: "CRM_WEBHOOKS",
    description: "Dispatches public alerts or notifications to primary Slack channels via Webhook/API",
    source: "Public API: Slack API",
    riskLevel: "MEDIUM",
  },
  {
    id: "send_sms_twilio",
    name: "send_sms_twilio",
    category: "CRM_WEBHOOKS",
    description: "Sends outbound SMS alerts via Twilio REST API (POST /2010-04-01/Accounts/{SID}/Messages)",
    source: "Public API: Twilio SMS",
    riskLevel: "HIGH",
  },
  {
    id: "send_email_broadcast",
    name: "send_email_broadcast",
    category: "CRM_WEBHOOKS",
    description: "Sends outbound transactional or marketing email blasts via SendGrid/SES/Postmark",
    source: "Public API: SendGrid / AWS SES",
    riskLevel: "HIGH",
  },
  {
    id: "update_hubspot_deal",
    name: "update_hubspot_deal",
    category: "CRM_WEBHOOKS",
    description: "Mutates stage, revenue, or contact records in HubSpot/Salesforce CRM",
    source: "Public API: HubSpot CRM",
    riskLevel: "MEDIUM",
  },
  {
    id: "execute_n8n_webhook",
    name: "execute_n8n_webhook",
    category: "CRM_WEBHOOKS",
    description: "Fires downstream automated webhook triggers on n8n workflows",
    source: "Public API: n8n Marketplace",
    riskLevel: "HIGH",
  },
  {
    id: "trigger_dify_pipeline",
    name: "trigger_dify_pipeline",
    category: "CRM_WEBHOOKS",
    description: "Invokes external AI agent orchestrations and data pipelines on Dify",
    source: "Public API: Dify.ai",
    riskLevel: "MEDIUM",
  },
  {
    id: "send_external_webhook",
    name: "send_external_webhook",
    category: "CRM_WEBHOOKS",
    description: "Generic HTTP POST webhook trigger with payload mutation",
    riskLevel: "MEDIUM",
  },

  // ─── DEVSECOPS & COMPLIANCE ───
  {
    id: "dispatch_security_alert",
    name: "dispatch_security_alert",
    category: "SECURITY",
    description: "Escalates P1/P0 vulnerabilities or active threats to SecOps on-call",
    riskLevel: "HIGH",
  },
  {
    id: "revoke_api_credentials",
    name: "revoke_api_credentials",
    category: "SECURITY",
    description: "Invalidates compromised bearer tokens, SSH keys, or OAuth secrets",
    riskLevel: "HIGH",
  },
  {
    id: "quarantine_host",
    name: "quarantine_host",
    category: "SECURITY",
    description: "Isolates network interfaces of suspicious compromised instances",
    riskLevel: "CRITICAL",
  },
  {
    id: "approve_admin_escalation",
    name: "approve_admin_escalation",
    category: "SECURITY",
    description: "Grants temporary elevated root or administrative IAM privileges",
    riskLevel: "CRITICAL",
  },
];

interface ApprovalActionMarketplaceProps {
  selected: string[];
  onChange: (actions: string[]) => void;
  allowedTools?: string[];
  instructions?: string;
}

export function ApprovalActionMarketplace({
  selected,
  onChange,
  allowedTools = [],
  instructions = "",
}: ApprovalActionMarketplaceProps) {
  const [activeCategory, setActiveCategory] = useState<
    "ALL" | "DISCOVERED" | "FINTECH" | "DEVOPS" | "CRM_WEBHOOKS" | "SECURITY"
  >("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [customInput, setCustomInput] = useState("");
  const [discoveredActions, setDiscoveredActions] = useState<ActionMarketplaceItem[]>([]);

  // ─── 1. DISCOVER WRITE ACTIONS FROM ACTIVE TOOLS ───
  useEffect(() => {
    let cancelled = false;

    async function loadDiscoveredActions() {
      const items: ActionMarketplaceItem[] = [];

      // Check if built-in mock_task_creator is in allowedTools
      if (allowedTools.includes("mock_task_creator")) {
        items.push({
          id: "create_task",
          name: "create_task",
          category: "DISCOVERED",
          description: "Mock Task Creator background execution",
          source: "Built-In Tool: mock_task_creator",
          riskLevel: "MEDIUM",
        });
      }

      // Check OpenAPI write endpoints
      try {
        const res = await fetch("/api/openapi/integrations");
        const json = await res.json();
        if (!cancelled && json.success && Array.isArray(json.data)) {
          for (const integration of json.data as OpenApiIntegrationDTO[]) {
            for (const ep of integration.endpoints) {
              const regName = openApiToolRegistryName(integration.id, ep.operationId);
              const isAllowed = allowedTools.includes(regName);
              if (ep.isWrite || ep.method !== "GET" || ep.requiresApproval || isAllowed) {
                if (ep.isWrite || ep.method !== "GET") {
                  items.push({
                    id: ep.operationId,
                    name: ep.operationId,
                    category: "DISCOVERED",
                    description: ep.description || `${ep.method} ${ep.path}`,
                    source: `OpenAPI: ${integration.name}`,
                    riskLevel: "HIGH",
                  });
                }
              }
            }
          }
        }
      } catch {}

      // Check MCP write tools
      try {
        const res = await fetch("/api/mcp/servers");
        const json = await res.json();
        if (!cancelled && json.success && Array.isArray(json.data)) {
          for (const server of json.data as McpServerDTO[]) {
            for (const tool of server.cachedTools) {
              const regName = mcpToolRegistryName(server.id, tool.name);
              if (tool.isWrite || allowedTools.includes(regName)) {
                if (tool.isWrite) {
                  items.push({
                    id: tool.name,
                    name: tool.name,
                    category: "DISCOVERED",
                    description: tool.description || `MCP Tool on ${server.name}`,
                    source: `MCP Server: ${server.name}`,
                    riskLevel: "HIGH",
                  });
                }
              }
            }
          }
        }
      } catch {}

      if (!cancelled) {
        setDiscoveredActions(items);
      }
    }

    loadDiscoveredActions();
    return () => {
      cancelled = true;
    };
  }, [allowedTools]);

  // ─── 2. AI SMART DETECTION FROM PROMPT INSTRUCTIONS ───
  const detectedPromptSuggestions = useMemo(() => {
    if (!instructions || instructions.length < 10) return [];
    const text = instructions.toLowerCase();
    const suggestions: string[] = [];

    const keywordMap: Record<string, string[]> = {
      refund: ["issue_customer_refund"],
      pay: ["execute_payment", "charge_stripe_customer"],
      payment: ["execute_payment"],
      disburse: ["disburse_funds"],
      wire: ["disburse_funds"],
      slack: ["send_slack_broadcast"],
      sms: ["send_sms_twilio"],
      twilio: ["send_sms_twilio"],
      email: ["send_email_broadcast"],
      delete: ["delete_database_record"],
      purge: ["purge_cdn_cache"],
      k8s: ["deploy_k8s_container"],
      kubernetes: ["deploy_k8s_container"],
      deploy: ["deploy_k8s_container"],
      restart: ["restart_production_server"],
      crypto: ["transfer_crypto_wallet"],
      security: ["dispatch_security_alert"],
      vulnerability: ["dispatch_security_alert"],
      quarantine: ["quarantine_host"],
      task: ["create_task"],
      n8n: ["execute_n8n_webhook"],
      webhook: ["send_external_webhook"],
    };

    for (const [kw, actions] of Object.entries(keywordMap)) {
      if (text.includes(kw)) {
        for (const act of actions) {
          if (!suggestions.includes(act) && !selected.includes(act)) {
            suggestions.push(act);
          }
        }
      }
    }

    return suggestions.slice(0, 4);
  }, [instructions, selected]);

  const toggleAction = (actionName: string) => {
    if (selected.includes(actionName)) {
      onChange(selected.filter((a) => a !== actionName));
    } else {
      onChange([...selected, actionName]);
    }
  };

  const handleAddCustom = () => {
    const trimmed = customInput.trim();
    if (!trimmed) return;
    if (!selected.includes(trimmed)) {
      onChange([...selected, trimmed]);
      toast.success("Action added", `Added "${trimmed}" to approval locks.`);
    }
    setCustomInput("");
  };

  const lockAllDiscovered = () => {
    const names = discoveredActions.map((d) => d.name);
    const combined = Array.from(new Set([...selected, ...names]));
    onChange(combined);
    toast.success("Write tools locked", `Applied ${names.length} approval gates.`);
  };

  const allItems = [...discoveredActions, ...MARKETPLACE_PRESETS];
  const uniqueItems = Array.from(new Map(allItems.map((item) => [item.name, item])).values());

  const filteredItems = uniqueItems.filter((item) => {
    const matchesCat =
      activeCategory === "ALL" ||
      (activeCategory === "DISCOVERED"
        ? discoveredActions.some((d) => d.name === item.name)
        : item.category === activeCategory);
    const matchesSearch =
      !searchQuery ||
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCat && matchesSearch;
  });

  return (
    <div className="space-y-4">
      {/* Write actions found on the tools in the chain */}
      {discoveredActions.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-[10px] border border-[var(--border-subtle)] px-4 py-3">
          <div className="space-y-0.5">
            <div className="font-sans text-sm text-[var(--text-primary)]">
              {discoveredActions.length} write {discoveredActions.length === 1 ? "action" : "actions"} found on your tools
            </div>
            <p className="font-sans text-[13px] text-[var(--text-muted)]">These can change or delete data.</p>
          </div>
          <button type="button" onClick={lockAllDiscovered} className={BTN_SECONDARY_SM}>
            Lock all of them
          </button>
        </div>
      )}

      {/* Suggestions from the instructions */}
      {detectedPromptSuggestions.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-sans text-[13px] text-[var(--text-muted)]">Mentioned in your instructions</span>
          {detectedPromptSuggestions.map((act) => (
            <button key={act} type="button" onClick={() => toggleAction(act)} className={PILL}>
              + lock {act}
            </button>
          ))}
        </div>
      )}

      {/* Locked actions */}
      <div className="space-y-2">
        <div className="flex items-baseline justify-between gap-3">
          <span className="font-sans text-[13px] text-[var(--text-muted)]">Locked actions ({selected.length})</span>
          {selected.length > 0 && (
            <button
              type="button"
              onClick={() => onChange([])}
              className="cursor-pointer font-sans text-[13px] text-[var(--text-muted)] transition-colors hover:text-[var(--state-error)]"
            >
              Clear all
            </button>
          )}
        </div>

        {selected.length === 0 ? (
          <p className="rounded-[10px] border border-dashed border-[var(--border-strong)] px-4 py-3 font-sans text-[13px] leading-5 text-[var(--text-muted)]">
            Nothing is locked, so every tool call runs without a human pause.
          </p>
        ) : (
          <div className="relative flex flex-wrap gap-1.5 rounded-[10px] border border-[var(--border-subtle)] px-4 py-3">
            <span aria-hidden="true" className="absolute bottom-3 left-0 top-3 w-0.5 rounded-full bg-[var(--state-warning)]" />
            {selected.map((action) => (
              <span
                key={action}
                className="inline-flex items-center gap-1.5 rounded-[6px] bg-[var(--text-primary)]/10 px-2 py-0.5 font-mono text-xs text-[var(--text-primary)]"
              >
                {action}
                <button
                  type="button"
                  onClick={() => toggleAction(action)}
                  aria-label={`Unlock ${action}`}
                  className="cursor-pointer text-[var(--text-muted)] transition-colors hover:text-[var(--state-error)]"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Custom action */}
      <div className="flex gap-2">
        <input
          value={customInput}
          onChange={(e) => setCustomInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              handleAddCustom();
            }
          }}
          aria-label="Custom action name"
          placeholder="Add a custom action, for example charge_stripe"
          className={clsx(INPUT, "w-full font-mono text-xs")}
        />
        <button type="button" onClick={handleAddCustom} className={BTN_SECONDARY_SM}>
          Add
        </button>
      </div>

      {/* Presets */}
      <div className="space-y-3 border-t border-[var(--border-subtle)] pt-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <select
            value={activeCategory}
            onChange={(e) => setActiveCategory(e.target.value as typeof activeCategory)}
            aria-label="Filter presets by category"
            className={clsx(FIELD, "h-8 cursor-pointer px-2 text-[13px]")}
          >
            <option value="ALL">All presets</option>
            <option value="DISCOVERED">Found on your tools ({discoveredActions.length})</option>
            <option value="FINTECH">Fintech and payments</option>
            <option value="DEVOPS">DevOps and cloud</option>
            <option value="CRM_WEBHOOKS">CRM and comms</option>
            <option value="SECURITY">Security and compliance</option>
          </select>
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            aria-label="Search actions"
            placeholder="Search actions"
            className={clsx(FIELD, "h-8 flex-1 px-3 text-[13px]")}
          />
        </div>

        <ul className="max-h-60 divide-y divide-[var(--border-subtle)] overflow-y-auto rounded-[10px] border border-[var(--border-subtle)]">
          {filteredItems.map((item) => {
            const isSelected = selected.includes(item.name);
            return (
              <li key={item.id}>
                <label className="flex cursor-pointer items-start gap-3 px-3 py-2.5 transition-colors hover:bg-[var(--text-primary)]/[0.04]">
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => toggleAction(item.name)}
                    className="mt-1 h-3.5 w-3.5 accent-[var(--accent-primary)]"
                  />
                  <span className="min-w-0 flex-1 space-y-0.5">
                    <span className="flex items-baseline justify-between gap-3">
                      <span className="truncate font-mono text-xs text-[var(--text-primary)]">{item.name}</span>
                      <span
                        className="shrink-0 font-sans text-[13px]"
                        style={{
                          color:
                            item.riskLevel === "CRITICAL"
                              ? "var(--state-error)"
                              : item.riskLevel === "HIGH"
                              ? "var(--state-warning)"
                              : "var(--text-muted)",
                        }}
                      >
                        {item.riskLevel.toLowerCase()}
                      </span>
                    </span>
                    <span className="block line-clamp-1 font-sans text-[13px] leading-5 text-[var(--text-secondary)]">
                      {item.description}
                    </span>
                    {item.source && <span className={clsx(META, "block truncate")}>{item.source}</span>}
                  </span>
                </label>
              </li>
            );
          })}
          {filteredItems.length === 0 && (
            <li className="px-3 py-6 text-center font-sans text-[13px] text-[var(--text-muted)]">No actions match</li>
          )}
        </ul>
      </div>
    </div>
  );
}
