"use client";

import React, { useState } from "react";
import {
  X,
  Play,
  Loader2,
  AlertCircle,
  Clock,
  Sparkles,
} from "lucide-react";
import {
  OpenApiAuthConfig,
  OpenApiAuthType,
  OpenApiEndpointDefinition,
  OpenApiToolTestResult,
} from "@/types/openapi";

interface OpenApiEndpointTesterModalProps {
  endpoint: OpenApiEndpointDefinition;
  integrationId?: string;
  baseUrl: string;
  authType: OpenApiAuthType;
  authConfig?: OpenApiAuthConfig | null;
  onClose: () => void;
}

export function OpenApiEndpointTesterModal({
  endpoint,
  integrationId,
  baseUrl,
  authType,
  authConfig,
  onClose,
}: OpenApiEndpointTesterModalProps) {
  // Initialize parameter values
  const [paramValues, setParamValues] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    for (const p of endpoint.parameters) {
      initial[p.name] = "";
    }
    return initial;
  });

  const [bodyValue, setBodyValue] = useState<string>(() => {
    if (endpoint.requestBody?.schema) {
      return JSON.stringify(generateSampleJsonFromSchema(endpoint.requestBody.schema), null, 2);
    }
    return "";
  });

  const [isRunning, setIsRunning] = useState(false);
  const [testResult, setTestResult] = useState<OpenApiToolTestResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleRunTest = async () => {
    setIsRunning(true);
    setError(null);
    setTestResult(null);

    const args: Record<string, unknown> = {};

    // Collect parameter values
    for (const [key, val] of Object.entries(paramValues)) {
      if (val.trim()) {
        const paramDef = endpoint.parameters.find((p) => p.name === key);
        const schemaType = (paramDef?.schema as { type?: string })?.type;
        if (schemaType === "integer" || schemaType === "number") {
          args[key] = Number(val);
        } else if (schemaType === "boolean") {
          args[key] = val === "true";
        } else {
          args[key] = val;
        }
      }
    }

    // Include request body
    if (bodyValue.trim()) {
      try {
        args["body"] = JSON.parse(bodyValue);
      } catch {
        setError("Invalid JSON format in Request Body");
        setIsRunning(false);
        return;
      }
    }

    try {
      let res: Response;
      if (integrationId && integrationId !== "preview") {
        res = await fetch(`/api/openapi/integrations/${integrationId}/test`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            operationId: endpoint.operationId,
            arguments: args,
          }),
        });
      } else {
        res = await fetch("/api/openapi/test-raw", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            endpoint,
            baseUrl,
            authType,
            authConfig,
            arguments: args,
          }),
        });
      }

      const json = await res.json();
      if (!res.ok || json.success === false) {
        setError(json.error || "Execution failed");
      } else {
        setTestResult(json.data);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error during test");
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[var(--surface-sunken)]/70 font-sans animate-in fade-in duration-100">
      <div className="relative w-full max-w-2xl max-h-[85vh] rounded-lg border border-[var(--border-strong)] bg-[var(--surface-raised)] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-[var(--border-subtle)] bg-[var(--surface-sunken)]">
          <div className="flex items-center gap-2.5 min-w-0">
            <span
              className={`px-1.5 py-0.5 text-xs font-sans font-medium rounded border ${getMethodBadge(
                endpoint.method
              )}`}
            >
              {endpoint.method}
            </span>
            <div className="min-w-0">
              <h3 className="text-xs font-medium text-[var(--text-primary)] truncate">
                {endpoint.summary || endpoint.operationId}
              </h3>
              <p className="text-xs font-sans text-[var(--text-muted)] truncate">{endpoint.path}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-[var(--text-muted)] hover:text-[var(--text-muted)] rounded hover:bg-[var(--surface-sunken)] cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs font-sans">
          {/* Parameters Form */}
          <div className="space-y-2">
            <p className="text-xs font-medium text-[var(--text-muted)]">
              Request arguments
            </p>

            {endpoint.parameters.length === 0 && !endpoint.requestBody ? (
              <p className="text-xs text-[var(--text-muted)] p-3 rounded border border-[var(--border-subtle)] bg-[var(--surface-sunken)]/50">
                This endpoint requires no parameters or body.
              </p>
            ) : (
              <div className="space-y-2">
                {endpoint.parameters.map((param) => (
                  <div
                    key={param.name}
                    className="p-2.5 rounded border border-[var(--border-subtle)] bg-[var(--surface-sunken)]/50 space-y-1"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium text-[var(--text-primary)]">
                        {param.name}
                        <span className="ml-1 text-xs text-[var(--accent-primary)] font-medium">
                          ({param.in})
                        </span>
                        {param.required && <span className="text-[var(--state-error)] ml-1 font-medium">*</span>}
                      </span>
                      <span className="text-xs text-[var(--text-muted)]">
                        {param.description || (param.schema as { type?: string })?.type || "string"}
                      </span>
                    </div>
                    <input
                      type="text"
                      placeholder={`Enter ${param.name}...`}
                      value={paramValues[param.name] ?? ""}
                      onChange={(e) =>
                        setParamValues({ ...paramValues, [param.name]: e.target.value })
                      }
                      className="w-full px-2.5 py-1 text-xs bg-[var(--surface-raised)] border border-[var(--border-strong)] rounded text-[var(--text-primary)] font-sans"
                    />
                  </div>
                ))}

                {endpoint.requestBody && (
                  <div className="p-2.5 rounded border border-[var(--border-subtle)] bg-[var(--surface-sunken)]/50 space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium text-[var(--text-primary)]">
                        Request body (JSON)
                        {endpoint.requestBody.required && (
                          <span className="text-[var(--state-error)] ml-1 font-medium">*</span>
                        )}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          if (endpoint.requestBody?.schema) {
                            setBodyValue(
                              JSON.stringify(
                                generateSampleJsonFromSchema(endpoint.requestBody.schema),
                                null,
                                2
                              )
                            );
                          }
                        }}
                        className="text-xs text-[var(--accent-primary)] hover:underline flex items-center gap-1 font-medium cursor-pointer"
                      >
                        <Sparkles className="w-3 h-3" /> Auto-fill Sample
                      </button>
                    </div>
                    <textarea
                      rows={5}
                      value={bodyValue}
                      onChange={(e) => setBodyValue(e.target.value)}
                      placeholder='{ "key": "value" }'
                      className="w-full font-sans text-xs p-2.5 bg-[var(--surface-raised)] border border-[var(--border-strong)] rounded text-[var(--text-primary)]"
                    />
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Test Results Output */}
          {error && (
            <div className="p-2.5 bg-[var(--state-error)]/10 border border-[var(--state-error)]/25 rounded text-[var(--state-error)] text-xs font-sans flex items-start gap-2">
              <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
              <div>
                <p className="font-medium">Execution failed</p>
                <p className="mt-0.5">{error}</p>
              </div>
            </div>
          )}

          {testResult && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium text-[var(--text-muted)]">Execution trace</span>
                <div className="flex items-center gap-2">
                  <span
                    className={`px-1.5 py-0.2 rounded text-xs font-medium border ${
                      testResult.status === "SUCCESS"
                        ? "border-[var(--state-success)]/25 bg-[var(--state-success)]/10 text-[var(--state-success)]"
                        : "border-[var(--state-error)]/25 bg-[var(--state-error)]/10 text-[var(--state-error)]"
                    }`}
                  >
                    HTTP {testResult.statusCode || "ERR"}
                  </span>
                  <span className="text-xs text-[var(--text-muted)] font-sans">
                    <Clock className="w-2.5 h-2.5 inline mr-1" /> {testResult.latencyMs}ms
                  </span>
                </div>
              </div>

              {/* Terminal View */}
              <div className="p-3 bg-[var(--surface-raised)] border border-[var(--border-strong)] rounded font-sans text-xs space-y-2 overflow-x-auto">
                <div className="flex items-center gap-2 text-[var(--accent-primary)]">
                  <span className="font-medium text-[var(--state-warning)]">{testResult.requestDetails.method}</span>
                  <span className="text-[var(--text-muted)]">{testResult.requestDetails.url}</span>
                </div>
                {testResult.data !== undefined && (
                  <div className="border-t border-[var(--border-strong)] pt-1.5">
                    <p className="text-xs text-[var(--text-muted)] font-medium mb-1">Payload Output:</p>
                    <pre className="text-[var(--state-success)] text-xs overflow-x-auto max-h-48">
                      {JSON.stringify(testResult.data, null, 2)}
                    </pre>
                  </div>
                )}
                {testResult.error && (
                  <div className="border-t border-[var(--border-strong)] pt-1.5 text-[var(--state-error)]">
                    <p className="text-xs text-[var(--text-muted)] font-medium mb-1">Error:</p>
                    <p>{testResult.error}</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-3 border-t border-[var(--border-subtle)] bg-[var(--surface-sunken)]">
          <span className="text-xs text-[var(--text-muted)]">Runs live from server runtime</span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 text-xs font-sans font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer"
            >
              Close
            </button>
            <button
              type="button"
              onClick={handleRunTest}
              disabled={isRunning}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded border border-[var(--accent-primary)]/40 bg-[var(--cta-primary-bg)] text-[var(--cta-primary-text)] text-xs font-sans font-medium hover:bg-[var(--cta-primary-hover)] disabled:opacity-50 cursor-pointer"
            >
              {isRunning ? (
                <>
                  <Loader2 className="w-3 h-3 animate-spin" /> Running...
                </>
              ) : (
                <>
                  <Play className="w-3 h-3 fill-current" /> Execute Live Test
                </>
              )}
            </button>
          </div>
        </div>
      </div>
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

function generateSampleJsonFromSchema(schema: Record<string, unknown>): unknown {
  if (!schema || typeof schema !== "object") return "sample_value";

  if (schema.type === "object" && schema.properties) {
    const res: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(schema.properties as Record<string, Record<string, unknown>>)) {
      res[k] = generateSampleJsonFromSchema(v);
    }
    return res;
  }

  if (schema.type === "array") {
    return [generateSampleJsonFromSchema((schema.items as Record<string, unknown>) || {})];
  }

  if (schema.type === "integer" || schema.type === "number") return 1;
  if (schema.type === "boolean") return true;
  if (schema.type === "string") {
    if (schema.enum && Array.isArray(schema.enum)) return schema.enum[0];
    return "example";
  }

  return {};
}
