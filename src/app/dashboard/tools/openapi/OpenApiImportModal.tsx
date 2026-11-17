"use client";

import React, { useState } from "react";
import {
  X,
  Globe,
  FileCode,
  ArrowRight,
  ArrowLeft,
  Check,
  Search,
  ShieldAlert,
  Loader2,
  Lock,
  Play,
} from "lucide-react";
import { clsx } from "clsx";
import {
  OpenApiAuthConfig,
  OpenApiAuthType,
  OpenApiEndpointDefinition,
  OpenApiParsedSpecDTO,
} from "@/types/openapi";
import { OpenApiEndpointTesterModal } from "./OpenApiEndpointTesterModal";

interface OpenApiImportModalProps {
  isOpen: boolean;
  initialSpecUrl?: string;
  onClose: () => void;
  onSuccess: () => void;
}

const pad = (n: number) => String(n).padStart(2, "0");

const SAMPLE_PRESETS = [
  {
    name: "Swagger Petstore v2",
    description: "Classic Swagger 2.0 Petstore sample spec with CRUD operations",
    url: "https://petstore.swagger.io/v2/swagger.json",
  },
  {
    name: "JSONPlaceholder REST API",
    description: "Fake online REST API for posts, users, comments and todos",
    url: "https://raw.githubusercontent.com/OAI/OpenAPI-Specification/main/examples/v3.0/uspto.json",
  },
];

export function OpenApiImportModal({ isOpen, initialSpecUrl, onClose, onSuccess }: OpenApiImportModalProps) {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);

  // Step 1: Source
  const [sourceType, setSourceType] = useState<"URL" | "RAW">("URL");
  const [specUrl, setSpecUrl] = useState(initialSpecUrl || "");
  const [rawSpecText, setRawSpecText] = useState("");
  const [isParsing, setIsParsing] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);
  const [parsedSpec, setParsedSpec] = useState<OpenApiParsedSpecDTO | null>(null);

  React.useEffect(() => {
    if (initialSpecUrl) {
      setSpecUrl(initialSpecUrl);
      setSourceType("URL");
    }
  }, [initialSpecUrl]);

  // Step 2: Configuration & Selection
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [baseUrl, setBaseUrl] = useState("");
  const [endpoints, setEndpoints] = useState<OpenApiEndpointDefinition[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTag, _setSelectedTag] = useState<string>("ALL");
  const [selectedMethod, setSelectedMethod] = useState<string>("ALL");

  // Step 3: Auth
  const [authType, setAuthType] = useState<OpenApiAuthType>("NONE");
  const [bearerToken, setBearerToken] = useState("");
  const [apiKeyHeader, setApiKeyHeader] = useState("X-API-Key");
  const [apiKeyValue, setApiKeyValue] = useState("");
  const [apiKeyQueryParam, setApiKeyQueryParam] = useState("api_key");
  const [apiKeyLocation, setApiKeyLocation] = useState<"HEADER" | "QUERY">("HEADER");
  const [basicUsername, setBasicUsername] = useState("");
  const [basicPassword, setBasicPassword] = useState("");
  const [customHeaderKey, setCustomHeaderKey] = useState("");
  const [customHeaderVal, setCustomHeaderVal] = useState("");

  // Testing & Saving
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [testingEndpoint, setTestingEndpoint] = useState<OpenApiEndpointDefinition | null>(null);

  if (!isOpen) return null;

  const handleParse = async () => {
    setIsParsing(true);
    setParseError(null);

    try {
      const payload =
        sourceType === "URL"
          ? { specUrl: specUrl.trim() }
          : { rawSpec: rawSpecText.trim() };

      const res = await fetch("/api/openapi/parse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!res.ok || json.success === false) {
        setParseError(json.error || "Failed to parse OpenAPI specification");
        return;
      }

      const data: OpenApiParsedSpecDTO = json.data;
      setParsedSpec(data);
      setName(data.title || "Imported REST API");
      setDescription(data.description || `Generated tools from ${data.title}`);
      setBaseUrl(data.baseUrl || "https://api.example.com");
      setEndpoints(data.endpoints);
      setStep(2);
    } catch (err) {
      setParseError(err instanceof Error ? err.message : "Parsing error");
    } finally {
      setIsParsing(false);
    }
  };

  const handleSaveIntegration = async () => {
    setIsSaving(true);
    setSaveError(null);

    const selectedEndpoints = endpoints.filter((ep) => ep.enabled);
    if (selectedEndpoints.length === 0) {
      setSaveError("Please select at least one endpoint to import as a tool.");
      setIsSaving(false);
      return;
    }

    const authConfig: OpenApiAuthConfig = {};
    if (authType === "BEARER") {
      authConfig.bearerToken = bearerToken;
    } else if (authType === "API_KEY") {
      if (apiKeyLocation === "HEADER") {
        authConfig.apiKeyHeader = apiKeyHeader;
        authConfig.apiKeyValue = apiKeyValue;
      } else {
        authConfig.apiKeyQueryParam = apiKeyQueryParam;
        authConfig.apiKeyValue = apiKeyValue;
      }
    } else if (authType === "BASIC") {
      authConfig.basicUsername = basicUsername;
      authConfig.basicPassword = basicPassword;
    } else if (authType === "CUSTOM_HEADER" && customHeaderKey.trim()) {
      authConfig.customHeaders = { [customHeaderKey.trim()]: customHeaderVal };
    }

    try {
      const res = await fetch("/api/openapi/integrations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim(),
          specUrl: sourceType === "URL" ? specUrl.trim() : undefined,
          rawSpec: parsedSpec?.rawSpec || {},
          baseUrl: baseUrl.trim(),
          authType,
          authConfig: Object.keys(authConfig).length > 0 ? authConfig : undefined,
          endpoints: selectedEndpoints,
        }),
      });

      const json = await res.json();
      if (!res.ok || json.success === false) {
        setSaveError(json.error || "Failed to create OpenAPI integration");
        return;
      }

      onSuccess();
      onClose();
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Error saving integration");
    } finally {
      setIsSaving(false);
    }
  };

  const _allTags = Array.from(new Set(endpoints.flatMap((e) => e.tags)));
  const filteredEndpoints = endpoints.filter((ep) => {
    const matchesSearch =
      ep.summary.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ep.path.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ep.operationId.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesTag = selectedTag === "ALL" || ep.tags.includes(selectedTag);
    const matchesMethod = selectedMethod === "ALL" || ep.method === selectedMethod;
    return matchesSearch && matchesTag && matchesMethod;
  });

  const enabledCount = endpoints.filter((e) => e.enabled).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[var(--surface-sunken)]/70 font-sans animate-in fade-in duration-100">
      <div className="relative w-full max-w-3xl max-h-[85vh] rounded-lg border border-[var(--border-strong)] bg-[var(--surface-raised)] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-[var(--border-subtle)] bg-[var(--surface-sunken)]">
          <div className="flex items-center gap-2">
            <Globe className="h-4 w-4 text-[var(--accent-primary)]" />
            <h2 className="text-xs text-[var(--accent-primary)]">
              Import OpenAPI specification
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-[var(--text-muted)] hover:text-[var(--text-muted)] rounded hover:bg-[var(--surface-sunken)] cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Stepper Bar */}
        <div className="flex items-center gap-4 px-5 py-2.5 bg-[var(--surface-sunken)]/50 border-b border-[var(--border-subtle)] text-xs font-sans font-medium overflow-x-auto">
          <span className={clsx("flex items-center gap-1.5", step >= 1 ? "text-[var(--accent-primary)]" : "text-[var(--text-muted)]")}>
            <span>01</span> Source
          </span>
          <span className="text-[var(--text-muted)]">/</span>
          <span className={clsx("flex items-center gap-1.5", step >= 2 ? "text-[var(--accent-primary)]" : "text-[var(--text-muted)]")}>
            <span>02</span> ENDPOINTS ({pad(enabledCount)})
          </span>
          <span className="text-[var(--text-muted)]">/</span>
          <span className={clsx("flex items-center gap-1.5", step >= 3 ? "text-[var(--accent-primary)]" : "text-[var(--text-muted)]")}>
            <span>03</span> Auth & config
          </span>
          <span className="text-[var(--text-muted)]">/</span>
          <span className={clsx("flex items-center gap-1.5", step >= 4 ? "text-[var(--accent-primary)]" : "text-[var(--text-muted)]")}>
            <span>04</span> Review
          </span>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4 text-xs font-sans">
          {/* STEP 1: SOURCE SPEC */}
          {step === 1 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setSourceType("URL")}
                  className={clsx(
                    "flex-1 py-2 px-3 rounded border text-xs font-medium flex items-center justify-center gap-2 transition-colors cursor-pointer",
                    sourceType === "URL"
                      ? "border-[var(--accent-primary)]/40 bg-[var(--cta-primary-bg)] text-[var(--cta-primary-text)] shadow-xs"
                      : "border-[var(--border-strong)] bg-[var(--surface-sunken)] text-[var(--text-secondary)] hover:border-[var(--accent-primary)]/40"
                  )}
                >
                  <Globe className="w-3.5 h-3.5" /> Spec URL (JSON / YAML)
                </button>
                <button
                  type="button"
                  onClick={() => setSourceType("RAW")}
                  className={clsx(
                    "flex-1 py-2 px-3 rounded border text-xs font-medium flex items-center justify-center gap-2 transition-colors cursor-pointer",
                    sourceType === "RAW"
                      ? "border-[var(--accent-primary)]/40 bg-[var(--cta-primary-bg)] text-[var(--cta-primary-text)] shadow-xs"
                      : "border-[var(--border-strong)] bg-[var(--surface-sunken)] text-[var(--text-secondary)] hover:border-[var(--accent-primary)]/40"
                  )}
                >
                  <FileCode className="w-3.5 h-3.5" /> Paste Raw Payload
                </button>
              </div>

              {sourceType === "URL" ? (
                <div className="space-y-3">
                  <div className="space-y-1">
                    <label className="block text-xs font-medium text-[var(--text-secondary)]">
                      OpenAPI / Swagger Spec URL
                    </label>
                    <input
                      type="url"
                      placeholder="https://petstore.swagger.io/v2/swagger.json"
                      value={specUrl}
                      onChange={(e) => setSpecUrl(e.target.value)}
                      className="w-full px-3 py-2 text-xs bg-[var(--surface-sunken)] border border-[var(--border-strong)] rounded text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-primary)]/40 font-sans"
                    />
                  </div>

                  <div className="pt-1">
                    <p className="text-xs font-medium text-[var(--text-muted)] mb-1.5">
                      Sample Specifications:
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {SAMPLE_PRESETS.map((preset) => (
                        <button
                          key={preset.name}
                          type="button"
                          onClick={() => setSpecUrl(preset.url)}
                          className="p-2.5 text-left bg-[var(--surface-sunken)] hover:bg-[var(--accent-primary)]/10 border border-[var(--border-subtle)] rounded transition-colors cursor-pointer"
                        >
                          <p className="text-xs font-medium text-[var(--text-primary)] truncate">
                            {preset.name}
                          </p>
                          <p className="text-xs text-[var(--text-muted)] truncate mt-0.5">{preset.description}</p>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-1">
                  <label className="block text-xs font-medium text-[var(--text-secondary)]">
                    Paste OpenAPI 3.0 / 3.1 or Swagger 2.0 Document
                  </label>
                  <textarea
                    rows={10}
                    placeholder='{ "openapi": "3.0.0", "info": { "title": "My API", "version": "1.0.0" }, "paths": { ... } }'
                    value={rawSpecText}
                    onChange={(e) => setRawSpecText(e.target.value)}
                    className="w-full font-sans text-xs p-3 bg-[var(--surface-sunken)] border border-[var(--border-strong)] rounded text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-primary)]/40"
                  />
                </div>
              )}

              {parseError && (
                <div className="p-2.5 bg-[var(--state-error)]/10 border border-[var(--state-error)]/25 rounded text-[var(--state-error)] text-xs font-sans">
                  {parseError}
                </div>
              )}
            </div>
          )}

          {/* STEP 2: SELECT ENDPOINTS */}
          {step === 2 && (
            <div className="space-y-3">
              <div className="flex flex-col sm:flex-row items-center gap-2">
                <div className="relative flex-1 w-full">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
                  <input
                    type="text"
                    placeholder="Search endpoints by path or operation..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 text-xs bg-[var(--surface-sunken)] border border-[var(--border-strong)] rounded text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-primary)]/40"
                  />
                </div>

                <div className="flex items-center gap-1.5 w-full sm:w-auto">
                  <select
                    value={selectedMethod}
                    onChange={(e) => setSelectedMethod(e.target.value)}
                    className="px-2.5 py-1.5 text-xs bg-[var(--surface-sunken)] border border-[var(--border-strong)] rounded text-[var(--text-primary)]"
                  >
                    <option value="ALL">All Methods</option>
                    <option value="GET">GET</option>
                    <option value="POST">POST</option>
                    <option value="PUT">PUT</option>
                    <option value="DELETE">DELETE</option>
                  </select>

                  <button
                    type="button"
                    onClick={() => {
                      const allSelected = endpoints.every((e) => e.enabled);
                      setEndpoints(endpoints.map((e) => ({ ...e, enabled: !allSelected })));
                    }}
                    className="px-2.5 py-1.5 text-xs font-sans font-medium rounded border border-[var(--accent-primary)]/25 bg-[var(--accent-primary)]/10 text-[var(--accent-primary)] cursor-pointer"
                  >
                    {endpoints.every((e) => e.enabled) ? "Deselect All" : "Select All"}
                  </button>
                </div>
              </div>

              {/* Endpoint List */}
              <div className="space-y-1.5 max-h-[360px] overflow-y-auto pr-1">
                {filteredEndpoints.length === 0 ? (
                  <p className="text-center py-8 text-xs text-[var(--text-muted)]">No matching endpoints found.</p>
                ) : (
                  filteredEndpoints.map((ep) => (
                    <div
                      key={ep.id}
                      className={clsx(
                        "p-2.5 rounded border transition-colors flex items-center justify-between gap-3",
                        ep.enabled
                          ? "bg-[var(--surface-raised)] border-[var(--border-strong)]"
                          : "bg-[var(--surface-sunken)] border-[var(--border-subtle)] opacity-50"
                      )}
                    >
                      <div className="flex items-center gap-2.5 flex-1 min-w-0">
                        <input
                          type="checkbox"
                          checked={ep.enabled}
                          onChange={(e) => {
                            setEndpoints(
                              endpoints.map((item) =>
                                item.id === ep.id ? { ...item, enabled: e.target.checked } : item
                              )
                            );
                          }}
                          className="w-3.5 h-3.5 rounded text-[var(--accent-primary)] border-[var(--border-strong)]"
                        />
                        <span
                          className={`px-1.5 py-0.5 text-xs font-sans font-medium rounded border ${getMethodBadge(
                            ep.method
                          )}`}
                        >
                          {ep.method}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-medium text-[var(--text-primary)] truncate">
                            {ep.summary || ep.operationId}
                          </p>
                          <p className="text-xs font-sans text-[var(--text-muted)] truncate">{ep.path}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <label className="flex items-center gap-1 text-xs text-[var(--text-secondary)] cursor-pointer">
                          <input
                            type="checkbox"
                            checked={ep.requiresApproval}
                            onChange={(e) => {
                              setEndpoints(
                                endpoints.map((item) =>
                                  item.id === ep.id
                                    ? { ...item, requiresApproval: e.target.checked }
                                    : item
                                )
                              );
                            }}
                            className="w-3 h-3 rounded text-[var(--state-warning)]"
                          />
                          <span className="flex items-center gap-0.5">
                            <ShieldAlert className="w-2.5 h-2.5 text-[var(--state-warning)]" /> HITL
                          </span>
                        </label>

                        <button
                          type="button"
                          onClick={() => setTestingEndpoint(ep)}
                          className="px-2 py-0.5 text-xs font-sans font-medium text-[var(--accent-primary)] bg-[var(--accent-primary)]/10 border border-[var(--accent-primary)]/25 rounded flex items-center gap-1 cursor-pointer"
                        >
                          <Play className="w-2.5 h-2.5 fill-current" /> Test
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* STEP 3: AUTH & BASE URL */}
          {step === 3 && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-[var(--text-secondary)]">
                    Integration Name
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs bg-[var(--surface-sunken)] border border-[var(--border-strong)] rounded text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-primary)]/40 font-sans"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-[var(--text-secondary)]">
                    Target Base URL
                  </label>
                  <input
                    type="url"
                    value={baseUrl}
                    onChange={(e) => setBaseUrl(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs bg-[var(--surface-sunken)] border border-[var(--border-strong)] rounded text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-primary)]/40 font-sans"
                  />
                </div>
              </div>

              {/* Auth Strategy */}
              <div className="space-y-2">
                <label className="text-xs font-medium text-[var(--text-secondary)] flex items-center gap-1">
                  <Lock className="w-3 h-3" /> Auth Strategy
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5">
                  {(["NONE", "BEARER", "API_KEY", "BASIC", "CUSTOM_HEADER"] as OpenApiAuthType[]).map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setAuthType(type)}
                      className={clsx(
                        "py-1.5 px-2 rounded border text-xs font-medium transition-colors cursor-pointer",
                        authType === type
                          ? "border-[var(--accent-primary)]/40 bg-[var(--cta-primary-bg)] text-[var(--cta-primary-text)] shadow-xs"
                          : "border-[var(--border-strong)] bg-[var(--surface-sunken)] text-[var(--text-secondary)] hover:border-[var(--accent-primary)]/40"
                      )}
                    >
                      {type.replace("_", " ")}
                    </button>
                  ))}
                </div>

                {/* Auth Config Inputs */}
                {authType === "BEARER" && (
                  <div className="p-3 bg-[var(--surface-sunken)] border border-[var(--border-subtle)] rounded space-y-1">
                    <label className="text-xs font-medium text-[var(--text-secondary)]">
                      Bearer Token
                    </label>
                    <input
                      type="password"
                      placeholder="Bearer token value..."
                      value={bearerToken}
                      onChange={(e) => setBearerToken(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs bg-[var(--surface-raised)] border border-[var(--border-strong)] rounded text-[var(--text-primary)] font-sans"
                    />
                  </div>
                )}

                {authType === "API_KEY" && (
                  <div className="p-3 bg-[var(--surface-sunken)] border border-[var(--border-subtle)] rounded space-y-2">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setApiKeyLocation("HEADER")}
                        className={clsx(
                          "px-2 py-0.5 text-xs font-medium rounded border cursor-pointer",
                          apiKeyLocation === "HEADER"
                            ? "bg-[var(--cta-primary-bg)] text-[var(--cta-primary-text)] border-[var(--accent-primary)]/40"
                            : "border-[var(--border-strong)] text-[var(--text-secondary)]"
                        )}
                      >
                        Header
                      </button>
                      <button
                        type="button"
                        onClick={() => setApiKeyLocation("QUERY")}
                        className={clsx(
                          "px-2 py-0.5 text-xs font-medium rounded border cursor-pointer",
                          apiKeyLocation === "QUERY"
                            ? "bg-[var(--cta-primary-bg)] text-[var(--cta-primary-text)] border-[var(--accent-primary)]/40"
                            : "border-[var(--border-strong)] text-[var(--text-secondary)]"
                        )}
                      >
                        Query Param
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {apiKeyLocation === "HEADER" ? (
                        <div>
                          <label className="text-xs font-medium text-[var(--text-muted)]">Header Name</label>
                          <input
                            type="text"
                            value={apiKeyHeader}
                            onChange={(e) => setApiKeyHeader(e.target.value)}
                            className="w-full px-2.5 py-1 text-xs bg-[var(--surface-raised)] border border-[var(--border-strong)] rounded text-[var(--text-primary)] font-sans"
                          />
                        </div>
                      ) : (
                        <div>
                          <label className="text-xs font-medium text-[var(--text-muted)]">Query Param</label>
                          <input
                            type="text"
                            value={apiKeyQueryParam}
                            onChange={(e) => setApiKeyQueryParam(e.target.value)}
                            className="w-full px-2.5 py-1 text-xs bg-[var(--surface-raised)] border border-[var(--border-strong)] rounded text-[var(--text-primary)] font-sans"
                          />
                        </div>
                      )}
                      <div>
                        <label className="text-xs font-medium text-[var(--text-muted)]">API Key Value</label>
                        <input
                          type="password"
                          value={apiKeyValue}
                          onChange={(e) => setApiKeyValue(e.target.value)}
                          className="w-full px-2.5 py-1 text-xs bg-[var(--surface-raised)] border border-[var(--border-strong)] rounded text-[var(--text-primary)] font-sans"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {authType === "BASIC" && (
                  <div className="p-3 bg-[var(--surface-sunken)] border border-[var(--border-subtle)] rounded space-y-2">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <div>
                        <label className="text-xs font-medium text-[var(--text-muted)]">Username</label>
                        <input
                          type="text"
                          value={basicUsername}
                          onChange={(e) => setBasicUsername(e.target.value)}
                          className="w-full px-2.5 py-1 text-xs bg-[var(--surface-raised)] border border-[var(--border-strong)] rounded text-[var(--text-primary)] font-sans"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-medium text-[var(--text-muted)]">Password</label>
                        <input
                          type="password"
                          value={basicPassword}
                          onChange={(e) => setBasicPassword(e.target.value)}
                          className="w-full px-2.5 py-1 text-xs bg-[var(--surface-raised)] border border-[var(--border-strong)] rounded text-[var(--text-primary)] font-sans"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {authType === "CUSTOM_HEADER" && (
                  <div className="p-3 bg-[var(--surface-sunken)] border border-[var(--border-subtle)] rounded space-y-2">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <div>
                        <label className="text-xs font-medium text-[var(--text-muted)]">Header Name</label>
                        <input
                          type="text"
                          placeholder="e.g. X-Custom-Auth"
                          value={customHeaderKey}
                          onChange={(e) => setCustomHeaderKey(e.target.value)}
                          className="w-full px-2.5 py-1 text-xs bg-[var(--surface-raised)] border border-[var(--border-strong)] rounded text-[var(--text-primary)] font-sans"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-medium text-[var(--text-muted)]">Header Value</label>
                        <input
                          type="password"
                          value={customHeaderVal}
                          onChange={(e) => setCustomHeaderVal(e.target.value)}
                          className="w-full px-2.5 py-1 text-xs bg-[var(--surface-raised)] border border-[var(--border-strong)] rounded text-[var(--text-primary)] font-sans"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* STEP 4: REVIEW & SAVE */}
          {step === 4 && (
            <div className="space-y-3">
              <div className="p-4 bg-[var(--accent-primary)]/10 border border-[var(--accent-primary)]/25 rounded space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-medium text-[var(--accent-primary)]">
                    {name}
                  </h3>
                  <span className="px-2 py-0.5 text-xs font-sans font-medium rounded bg-[var(--accent-primary)]/10 text-[var(--accent-primary)] border border-[var(--accent-primary)]/25">
                    {pad(enabledCount)} Tools to mount
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-[var(--text-muted)]">Base URL</span>
                    <p className="font-sans text-[var(--text-primary)] truncate">{baseUrl}</p>
                  </div>
                  <div>
                    <span className="text-[var(--text-muted)]">Auth</span>
                    <p className="font-medium text-[var(--text-primary)]">{authType}</p>
                  </div>
                </div>
              </div>

              {saveError && (
                <div className="p-2.5 bg-[var(--state-error)]/10 border border-[var(--state-error)]/25 rounded text-[var(--state-error)] text-xs font-sans">
                  {saveError}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer Navigation */}
        <div className="flex items-center justify-between px-5 py-3 border-t border-[var(--border-subtle)] bg-[var(--surface-sunken)]">
          {step > 1 ? (
            <button
              type="button"
              onClick={() => setStep((step - 1) as 1 | 2 | 3 | 4)}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded border border-[var(--border-strong)] bg-[var(--surface-sunken)] text-[var(--text-secondary)] text-xs font-sans font-medium hover:bg-[var(--surface-sunken)] cursor-pointer"
            >
              <ArrowLeft className="w-3 h-3" /> Back
            </button>
          ) : (
            <div />
          )}

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 text-xs font-sans font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer"
            >
              Cancel
            </button>

            {step === 1 && (
              <button
                type="button"
                onClick={handleParse}
                disabled={isParsing || (sourceType === "URL" ? !specUrl : !rawSpecText)}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded border border-[var(--accent-primary)]/40 bg-[var(--cta-primary-bg)] text-[var(--cta-primary-text)] text-xs font-sans font-medium hover:bg-[var(--cta-primary-hover)] disabled:opacity-50 cursor-pointer"
              >
                {isParsing ? (
                  <>
                    <Loader2 className="w-3 h-3 animate-spin" /> Parsing...
                  </>
                ) : (
                  <>
                    Next <ArrowRight className="w-3 h-3" />
                  </>
                )}
              </button>
            )}

            {step === 2 && (
              <button
                type="button"
                onClick={() => setStep(3)}
                disabled={enabledCount === 0}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded border border-[var(--accent-primary)]/40 bg-[var(--cta-primary-bg)] text-[var(--cta-primary-text)] text-xs font-sans font-medium hover:bg-[var(--cta-primary-hover)] disabled:opacity-50 cursor-pointer"
              >
                Next <ArrowRight className="w-3 h-3" />
              </button>
            )}

            {step === 3 && (
              <button
                type="button"
                onClick={() => setStep(4)}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded border border-[var(--accent-primary)]/40 bg-[var(--cta-primary-bg)] text-[var(--cta-primary-text)] text-xs font-sans font-medium hover:bg-[var(--cta-primary-hover)] cursor-pointer"
              >
                Next <ArrowRight className="w-3 h-3" />
              </button>
            )}

            {step === 4 && (
              <button
                type="button"
                onClick={handleSaveIntegration}
                disabled={isSaving}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded border border-[var(--accent-primary)]/40 bg-[var(--cta-primary-bg)] text-[var(--cta-primary-text)] text-xs font-sans font-medium hover:bg-[var(--cta-primary-hover)] disabled:opacity-50 cursor-pointer"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="w-3 h-3 animate-spin" /> Mounting...
                  </>
                ) : (
                  <>
                    <Check className="w-3 h-3" /> Complete & Mount Tools
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Test Modal */}
      {testingEndpoint && (
        <OpenApiEndpointTesterModal
          endpoint={testingEndpoint}
          baseUrl={baseUrl}
          authType={authType}
          authConfig={{
            bearerToken,
            apiKeyHeader,
            apiKeyValue,
            apiKeyQueryParam,
            basicUsername,
            basicPassword,
            customHeaders: customHeaderKey ? { [customHeaderKey]: customHeaderVal } : undefined,
          }}
          onClose={() => setTestingEndpoint(null)}
        />
      )}
    </div>
  );
}

function getMethodBadge(method: string) {
  switch (method) {
    case "GET":
      return "border-[var(--state-success)]/25 bg-[var(--state-success)]/10 text-[var(--state-success)]";
    case "POST":
      return "border-[var(--state-warning)]/25 bg-[var(--state-warning)]/10 text-[var(--state-warning)]";
    case "PUT":
    case "PATCH":
      return "border-[var(--accent-primary)]/25 bg-[var(--accent-primary)]/10 text-[var(--accent-primary)]";
    case "DELETE":
      return "border-[var(--state-error)]/25 bg-[var(--state-error)]/10 text-[var(--state-error)]";
    default:
      return "border-[var(--border-strong)] bg-[var(--surface-sunken)] text-[var(--text-secondary)]";
  }
}
