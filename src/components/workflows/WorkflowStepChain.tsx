"use client";

import React from "react";
import { clsx } from "clsx";

interface WorkflowStepChainProps {
  allowedTools: string[];
  actionsRequiringApproval?: string[];
  compact?: boolean;
}

interface StepNodeDef {
  id: string;
  name: string;
  toolName?: string;
  /** Approval locks are the only step that gets a colour. */
  approval?: boolean;
}

const STEP_TOOL_MAP: Record<string, StepNodeDef> = {
  document_search: { id: "doc_search", name: "Doc search", toolName: "document_search" },
  ai_extraction: { id: "ai_extract", name: "AI extraction", toolName: "ai_extraction" },
  ai_classification: { id: "ai_classify", name: "AI classification", toolName: "ai_classification" },
  deterministic_condition: { id: "condition", name: "Condition rule", toolName: "deterministic_condition" },
  calculator: { id: "calculator", name: "Calculator", toolName: "calculator" },
  record_lookup: { id: "record_lookup", name: "Record lookup", toolName: "record_lookup" },
  mock_task_creator: { id: "mock_action", name: "Action dispatch", toolName: "mock_task_creator" },
  final_report: { id: "final_report", name: "Final report", toolName: "final_report" },
};

export function WorkflowStepChain({
  allowedTools = [],
  actionsRequiringApproval = [],
  compact = false,
}: WorkflowStepChainProps) {
  // Construct ordered sequence
  const steps: StepNodeDef[] = [{ id: "input", name: "Structured input" }];

  // Map allowed tools
  for (const toolName of allowedTools) {
    if (STEP_TOOL_MAP[toolName]) {
      steps.push(STEP_TOOL_MAP[toolName]);
    } else if (toolName.startsWith("mcp_")) {
      // Dynamically discovered MCP tools render as a generic external step.
      steps.push({ id: `mcp_${toolName}`, name: "MCP tool", toolName });
    }
  }

  // If there's an action requiring approval, inject the approval step
  const hasHitl = actionsRequiringApproval.length > 0;
  if (hasHitl) {
    steps.splice(steps.length > 1 ? steps.length - 1 : 1, 0, {
      id: "hitl",
      name: "Approval lock",
      approval: true,
    });
  }

  return (
    <ol className="flex flex-wrap items-center gap-x-2 gap-y-1.5" aria-label="Pipeline steps">
      {steps.map((step, idx) => {
        const isLast = idx === steps.length - 1;
        return (
          <React.Fragment key={`${step.id}-${idx}`}>
            <li
              className={clsx(
                "inline-flex items-center gap-1.5 rounded-[6px] border bg-[var(--surface-sunken)] font-sans",
                step.approval ? "border-[var(--state-warning)]/50" : "border-[var(--border-subtle)]",
                compact ? "px-1.5 py-0.5 text-xs" : "px-2.5 py-1 text-[13px]"
              )}
            >
              {step.approval && (
                <span aria-hidden="true" className="h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--state-warning)]" />
              )}
              <span className="whitespace-nowrap text-[var(--text-secondary)]">{step.name}</span>
            </li>
            {!isLast && (
              <li aria-hidden="true" className="font-mono text-xs text-[var(--text-muted)]">
                →
              </li>
            )}
          </React.Fragment>
        );
      })}
    </ol>
  );
}
