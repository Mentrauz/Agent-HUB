"use client";

import React from "react";
import Image from "next/image";
import { useTheme } from "next-themes";
import { UserProfile, useUser } from "@clerk/nextjs";
import { useQuery } from "@tanstack/react-query";
import { clsx } from "clsx";
import { EmptyState } from "@/components/feedback/EmptyState";
import { Skeleton } from "@/components/feedback/Skeleton";
import { ProviderStatus, ModelRosterItem } from "@/types/settings";
import { usePixelThemeTransition } from "@/components/effects/PixelThemeTransition";
import { SecretVault } from "@/components/vault/SecretVault";
import { formatPricePerMillion, isModelFree } from "@/lib/utils/pricing";
import { GroqOfficialLogo, OpenRouterOfficialLogo } from "@/components/common/BrandLogos";
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
  SECTION_TITLE,
  Segmented,
  Tag,
} from "@/components/ui/surfaces";

async function fetchProviderStatus(): Promise<ProviderStatus> {
  const res = await fetch("/api/settings/providers");
  const json = await res.json();
  if (!res.ok || !json.success) throw new Error(json.error || "Failed to load provider status");
  return json.data;
}

function ProviderModelPanel({
  title,
  configured,
  models,
  apiKeyEnvName,
  providerType = "groq",
  defaultOpen = false,
}: {
  title: string;
  configured: boolean;
  modelCount?: number;
  models: ModelRosterItem[];
  apiKeyEnvName: string;
  providerType?: "groq" | "openrouter" | string;
  defaultOpen?: boolean;
}) {
  const [isOpen, setIsOpen] = React.useState(defaultOpen);
  const [search, setSearch] = React.useState("");
  const [categoryFilter, setCategoryFilter] = React.useState<string>("all");
  const [pricingFilter, setPricingFilter] = React.useState<"all" | "free" | "paid">("all");
  const [copiedModel, setCopiedModel] = React.useState<string | null>(null);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedModel(text);
    setTimeout(() => setCopiedModel(null), 1500);
  };

  const freeCount = React.useMemo(
    () => models.filter((m) => isModelFree(m.model, m.inputPrice, m.outputPrice)).length,
    [models]
  );
  const paidCount = models.length - freeCount;

  const filtered = React.useMemo(() => {
    const q = search.toLowerCase().trim();
    return models.filter((m) => {
      const isFree = isModelFree(m.model, m.inputPrice, m.outputPrice);
      if (pricingFilter === "free" && !isFree) return false;
      if (pricingFilter === "paid" && isFree) return false;
      if (categoryFilter !== "all" && m.category !== categoryFilter) return false;
      if (!q) return true;
      if (q === "free" && isFree) return true;
      if (q === "paid" && !isFree) return true;
      return (
        m.label.toLowerCase().includes(q) ||
        m.model.toLowerCase().includes(q) ||
        (m.category && m.category.toLowerCase().includes(q))
      );
    });
  }, [models, search, categoryFilter, pricingFilter]);

  const categories = React.useMemo(() => {
    const set = new Set<string>();
    models.forEach((m) => {
      if (m.category) set.add(m.category);
    });
    return Array.from(set);
  }, [models]);

  const isGroq = providerType === "groq";

  return (
    <section className={clsx(CARD, "overflow-hidden")}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        className={clsx(
          ROW_HOVER,
          "flex w-full cursor-pointer items-center justify-between gap-3 px-5 py-4 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--accent-primary)]"
        )}
      >
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] border border-[var(--border-subtle)] bg-[var(--surface-sunken)]">
            {isGroq ? (
              <GroqOfficialLogo className="h-6 w-6" />
            ) : (
              <OpenRouterOfficialLogo className="h-6 w-6 text-[var(--text-primary)]" />
            )}
          </div>
          <div className="min-w-0 space-y-0.5">
            <div className="flex items-baseline gap-3">
              <span className="font-sans text-sm font-medium text-[var(--text-primary)]">{title}</span>
              <span className={META}>{models.length} {models.length === 1 ? "model" : "models"}</span>
            </div>
            <p className="truncate font-sans text-[13px] text-[var(--text-muted)]">
              {configured
                ? isGroq
                  ? "Free tier on LPU hardware"
                  : `${freeCount} free, ${paidCount} pay as you go, with live pricing`
                : `Set ${apiKeyEnvName} in the environment`}
            </p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-4">
          <Tag tone={configured ? "good" : "neutral"}>{configured ? "Active" : "Not configured"}</Tag>
          <span className="font-sans text-[13px] text-[var(--text-muted)]">{isOpen ? "Hide" : "Show"}</span>
        </div>
      </button>

      {isOpen && (
        <div className="animate-fadeIn space-y-3 border-t border-[var(--border-subtle)] p-5">
          <div className="flex flex-wrap items-center gap-3">
            <label className="min-w-[180px] flex-1">
              <span className="sr-only">Search models</span>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={`Search ${models.length} models`}
                className={clsx(INPUT, "w-full")}
              />
            </label>
            {categories.length > 1 && (
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                aria-label="Filter by category"
                className={clsx(FIELD, "h-9 cursor-pointer px-3")}
              >
                <option value="all">All categories</option>
                {categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            )}
          </div>

          {paidCount > 0 && (
            <Segmented
              label="Pricing"
              hideLabel
              value={pricingFilter}
              onChange={setPricingFilter}
              options={[
                { id: "all", label: `All ${models.length}` },
                { id: "free", label: `Free ${freeCount}` },
                { id: "paid", label: `Paid ${paidCount}` },
              ]}
            />
          )}

          <ul className="h-[380px] max-h-[460px] divide-y divide-[var(--border-subtle)] overflow-y-auto rounded-[10px] border border-[var(--border-subtle)]">
            {filtered.map((item, idx) => {
              const isCopied = copiedModel === item.model;
              const isFree = isModelFree(item.model, item.inputPrice, item.outputPrice);
              const promptFormatted = formatPricePerMillion(item.inputPrice);
              const completionFormatted = formatPricePerMillion(item.outputPrice);

              return (
                <li key={idx} className="space-y-1 px-4 py-3">
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="truncate font-sans text-sm text-[var(--text-primary)]">{item.label}</span>
                    {item.category && <span className={META}>{item.category}</span>}
                  </div>
                  <div className="flex items-center gap-3">
                    <code className="truncate font-mono text-xs text-[var(--text-secondary)] select-all">{item.model}</code>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(item.model)}
                      className="shrink-0 cursor-pointer font-sans text-[13px] text-[var(--text-muted)] transition-colors hover:text-[var(--text-primary)]"
                    >
                      {isCopied ? "Copied" : "Copy"}
                    </button>
                  </div>
                  <div className={clsx(META, "flex flex-wrap items-center gap-x-4 gap-y-1")}>
                    {item.contextLength && <span>{(item.contextLength / 1000).toFixed(0)}k context</span>}
                    {item.throughput && <span>{item.throughput}</span>}
                    {item.latency && <span>{item.latency}</span>}
                    {isFree ? (
                      <span className="ml-auto text-[var(--state-success)]">free</span>
                    ) : (
                      <span
                        className="ml-auto text-[var(--text-secondary)]"
                        title="Live pricing from the OpenRouter API"
                      >
                        {promptFormatted}/M in · {completionFormatted}/M out
                      </span>
                    )}
                  </div>
                </li>
              );
            })}

            {filtered.length === 0 && (
              <li className="py-10 text-center font-sans text-sm text-[var(--text-muted)]">
                No models match &ldquo;{search}&rdquo;
              </li>
            )}
          </ul>
        </div>
      )}
    </section>
  );
}

function ProviderCard({ status }: { status: ProviderStatus }) {
  const groqList = (status.groqConfigured ? status.roster.groq : status.availableModels?.groq || []) as ModelRosterItem[];
  const openRouterList = (status.openRouterConfigured ? status.roster.openRouter : status.availableModels?.openRouter || []) as ModelRosterItem[];
  const [expandAll, setExpandAll] = React.useState(false);

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-baseline gap-4">
          <h2 className={SECTION_TITLE}>AI providers</h2>
          <Tag tone={status.runtimeReady ? "good" : "warn"}>{status.runtimeReady ? "Healthy" : "Degraded"}</Tag>
        </div>
        <button type="button" onClick={() => setExpandAll(!expandAll)} className={BTN_SECONDARY_SM}>
          {expandAll ? "Collapse all" : "Expand all"}
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:items-start">
        <ProviderModelPanel
          key={`groq-${expandAll}`}
          title="Groq"
          configured={status.groqConfigured}
          modelCount={status.groqModels}
          models={groqList}
          apiKeyEnvName="GROQ_API_KEY"
          providerType="groq"
          defaultOpen={expandAll}
        />
        <ProviderModelPanel
          key={`openrouter-${expandAll}`}
          title="OpenRouter"
          configured={status.openRouterConfigured}
          modelCount={status.openRouterModels}
          models={openRouterList}
          apiKeyEnvName="OPENROUTER_API_KEY"
          providerType="openrouter"
          defaultOpen={expandAll}
        />
      </div>
    </section>
  );
}

const SETTINGS_PRESET_ENDPOINTS = [
  { label: "Ollama (local)", url: "http://localhost:11434/v1", model: "llama3.2", provider: "ollama" },
  { label: "Groq", url: "https://api.groq.com/openai/v1", model: "groq/compound", provider: "groq" },
  { label: "OpenRouter", url: "https://openrouter.ai/api/v1", model: "google/gemma-4-26b-a4b-it:free", provider: "openrouter" },
  { label: "OpenAI", url: "https://api.openai.com/v1", model: "gpt-4o", provider: "openai" },
  { label: "Together AI", url: "https://api.together.xyz/v1", model: "meta-llama/Llama-3.3-70B-Instruct-Turbo", provider: "together" },
  { label: "vLLM / LM Studio", url: "http://localhost:8000/v1", model: "custom-local", provider: "custom_openai" },
];

function CustomModelApiCard() {
  const [model, setModel] = React.useState("gpt-4o");
  const [apiBaseUrl, setApiBaseUrl] = React.useState("https://api.openai.com/v1");
  const [apiKey, setApiKey] = React.useState("");
  const [showKey, setShowKey] = React.useState(false);
  const [testing, setTesting] = React.useState(false);
  const [testResult, setTestResult] = React.useState<{
    ok: boolean;
    latencyMs?: number;
    model?: string;
    reply?: string;
    error?: string;
  } | null>(null);

  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await fetch("/api/models/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: model.trim() || "gpt-4o",
          apiKey: apiKey.trim() || undefined,
          apiBaseUrl: apiBaseUrl.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (res.ok && data.connected) {
        setTestResult({
          ok: true,
          latencyMs: data.latencyMs,
          model: data.model,
          reply: data.reply,
        });
      } else {
        setTestResult({
          ok: false,
          error: data.error || "Connection failed",
        });
      }
    } catch (err: unknown) {
      setTestResult({
        ok: false,
        error: err instanceof Error ? err.message : "Network error",
      });
    } finally {
      setTesting(false);
    }
  };

  return (
    <section className={CARD}>
      <div className={CARD_HEAD}>
        <div className="space-y-1">
          <h2 className={CARD_TITLE}>Custom model endpoint</h2>
          <p className="font-sans text-[13px] text-[var(--text-muted)]">
            Any OpenAI-compatible API: Ollama, vLLM, LM Studio, DeepSeek, Together AI or your own gateway.
          </p>
        </div>
      </div>

      <div className="space-y-5 p-5">
        <div className="space-y-2">
          <div className={LABEL}>Presets</div>
          <div className="flex flex-wrap gap-2">
            {SETTINGS_PRESET_ENDPOINTS.map((preset) => (
              <button
                key={preset.label}
                type="button"
                aria-pressed={apiBaseUrl === preset.url}
                onClick={() => {
                  setApiBaseUrl(preset.url);
                  setModel(preset.model);
                }}
                className={clsx(
                  "h-8 cursor-pointer rounded-[8px] border px-3 font-sans text-[13px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)]",
                  apiBaseUrl === preset.url
                    ? "border-[var(--border-strong)] bg-[var(--text-primary)]/10 text-[var(--text-primary)]"
                    : "border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                )}
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="space-y-2">
            <label htmlFor="ce-model" className={LABEL}>
              Model
            </label>
            <input
              id="ce-model"
              type="text"
              value={model}
              onChange={(e) => setModel(e.target.value)}
              placeholder="gpt-4o, llama3.2, deepseek-chat"
              className={clsx(INPUT, "w-full font-mono text-xs")}
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="ce-url" className={LABEL}>
              API base URL
            </label>
            <input
              id="ce-url"
              type="text"
              value={apiBaseUrl}
              onChange={(e) => setApiBaseUrl(e.target.value)}
              placeholder="http://localhost:11434/v1"
              className={clsx(INPUT, "w-full font-mono text-xs")}
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="ce-key" className={LABEL}>
              API key (optional for local)
            </label>
            <div className="relative">
              <input
                id="ce-key"
                type={showKey ? "text" : "password"}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="sk-..."
                className={clsx(INPUT, "w-full pr-14 font-mono text-xs")}
              />
              <button
                type="button"
                onClick={() => setShowKey(!showKey)}
                className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer font-sans text-[13px] text-[var(--text-muted)] transition-colors hover:text-[var(--text-primary)]"
              >
                {showKey ? "Hide" : "Show"}
              </button>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-4 border-t border-[var(--border-subtle)] pt-5">
          <button type="button" onClick={handleTest} disabled={testing} className={BTN_PRIMARY}>
            {testing ? "Testing connection" : "Test connection"}
          </button>

          {testResult &&
            (testResult.ok ? (
              <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
                <Tag tone="good">Connected</Tag>
                <span className={META}>
                  {testResult.latencyMs} ms · {testResult.model} responding
                </span>
              </div>
            ) : (
              <div role="alert" className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
                <Tag tone="bad">Failed</Tag>
                <span className="font-sans text-[13px] text-[var(--text-secondary)]">{testResult.error}</span>
              </div>
            ))}
        </div>
      </div>
    </section>
  );
}

function AccountProfileCard() {
  const { user } = useUser();
  const [isExpanded, setIsExpanded] = React.useState(false);
  const { theme } = useTheme();

  return (
    <section className={clsx(CARD, "overflow-hidden")}>
      <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
        <div className="flex min-w-0 items-center gap-3">
          {user?.imageUrl ? (
            <Image
              src={user.imageUrl}
              alt={user.fullName || "User avatar"}
              width={36}
              height={36}
              unoptimized
              className="h-9 w-9 shrink-0 rounded-full border border-[var(--border-subtle)] object-cover"
            />
          ) : (
            <div
              aria-hidden="true"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[var(--border-subtle)] bg-[var(--surface-sunken)] font-sans text-sm text-[var(--text-muted)]"
            >
              {(user?.fullName || user?.username || "?")[0]?.toUpperCase()}
            </div>
          )}
          <div className="min-w-0">
            <div className="truncate font-sans text-sm text-[var(--text-primary)]">
              {user?.fullName || user?.username || "Signed in"}
            </div>
            <p className={clsx(META, "truncate")}>{user?.primaryEmailAddress?.emailAddress || "Session active"}</p>
          </div>
        </div>

        <button type="button" onClick={() => setIsExpanded((prev) => !prev)} aria-expanded={isExpanded} className={BTN_SECONDARY_SM}>
          {isExpanded ? "Hide details" : "Manage account"}
        </button>
      </div>

      {isExpanded && (
        <div className="max-h-[460px] overflow-y-auto border-t border-[var(--border-subtle)] bg-[var(--surface-sunken)] p-2 sm:p-4">
          <UserProfile
            key={theme}
            routing="hash"
            appearance={{
              elements: {
                card: "bg-transparent border-0 shadow-none w-full",
                navbar: "hidden",
                rootBox: "w-full max-w-full",
                cardBox: "w-full shadow-none",
                scrollBox: "max-h-[420px] overflow-y-auto",
                profileSection: "py-2",
              },
            }}
          />
        </div>
      )}
    </section>
  );
}

const THEMES = [
  { id: "calm-green-dark", name: "Calm Green", mode: "Dark", palette: ["#000000", "#7FAF9B", "#718A96"] },
  { id: "calm-green-light", name: "Calm Green", mode: "Light", palette: ["#F4F6F5", "#4D8A73", "#3D6472"] },
  { id: "punk-dark", name: "Punk", mode: "Dark", palette: ["#000000", "#22D3EE", "#60A5FA"] },
  { id: "punk-light", name: "Punk", mode: "Light", palette: ["#F5F7F8", "#0891B2", "#2563EB"] },
];

export default function SettingsPage() {
  const { theme } = useTheme();
  const { setThemeWithPixelTransition, isTransitioning } = usePixelThemeTransition();

  const { data: status, isLoading, isError, refetch } = useQuery<ProviderStatus>({
    queryKey: ["providerStatus"],
    queryFn: fetchProviderStatus,
  });

  return (
    <div className="w-full space-y-6">
      <PageHeader title="Settings" meta="Theme, AI providers, your account and environment secrets" />

      {/* Appearance */}
      <section className={CARD}>
        <div className={CARD_HEAD}>
          <h2 className={CARD_TITLE}>Appearance</h2>
          <span className={META}>remembered in this browser</span>
        </div>
        <div className="grid grid-cols-1 gap-3 p-5 sm:grid-cols-2 xl:grid-cols-4">
          {THEMES.map((item) => {
            const isActive = theme === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={(e) => setThemeWithPixelTransition(item.id, e)}
                disabled={isTransitioning}
                aria-pressed={isActive}
                className={clsx(
                  "relative cursor-pointer space-y-3 rounded-[12px] border p-4 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)]",
                  isActive
                    ? "border-[var(--text-secondary)] bg-[var(--text-primary)]/[0.06]"
                    : "border-[var(--border-subtle)] hover:border-[var(--border-strong)]"
                )}
              >
                <div className="flex items-baseline justify-between gap-3">
                  <span className="font-sans text-sm font-medium text-[var(--text-primary)]">{item.name}</span>
                  <span className={META}>{isActive ? "in use" : item.mode.toLowerCase()}</span>
                </div>
                <div className="flex items-center gap-1.5" aria-hidden="true">
                  {item.palette.map((color) => (
                    <span
                      key={color}
                      className="h-5 w-5 rounded-full border border-[var(--border-strong)]"
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
                <div className="font-sans text-[13px] text-[var(--text-muted)]">{item.mode}</div>
              </button>
            );
          })}
        </div>
      </section>

      {/* AI providers */}
      {isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-5 w-40" />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Skeleton className="h-20 rounded-[14px]" />
            <Skeleton className="h-20 rounded-[14px]" />
          </div>
        </div>
      ) : isError || !status ? (
        <EmptyState
          title="Couldn't load provider status"
          description="The server could not report the LLM provider configuration."
          action={
            <button type="button" onClick={() => refetch()} className={BTN_SECONDARY}>
              Retry
            </button>
          }
        />
      ) : (
        <>
          <ProviderCard status={status} />
          <CustomModelApiCard />
        </>
      )}

      {/* Account */}
      <section className="space-y-3">
        <h2 className={SECTION_TITLE}>Account</h2>
        <AccountProfileCard />
      </section>

      {/* Secret vault */}
      <section className="space-y-3">
        <h2 className={SECTION_TITLE}>Environment vault</h2>
        <SecretVault />
      </section>
    </div>
  );
}
