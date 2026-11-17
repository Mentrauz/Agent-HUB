import React, { useCallback, useEffect, useRef, useState } from "react";
import { useForm, useFieldArray, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { createSkillSchema } from "@/validators/skillSchema";
import { BUILT_IN_TOOL_CATALOG, TOOL_CATEGORIES } from "@/modules/tools";
import { AvailableMcpTools } from "./AvailableMcpTools";
import { AvailableOpenApiTools } from "./AvailableOpenApiTools";
import { ApprovalActionMarketplace } from "./ApprovalActionMarketplace";
import { QuickConnectToolModal } from "./QuickConnectToolModal";
import { SkillDTO, SkillVersionDTO } from "@/types/skill";
import { WorkflowStepChain } from "@/components/workflows/WorkflowStepChain";
import { toast } from "@/stores/toastStore";
import { clsx } from "clsx";
import {
  BTN_PRIMARY,
  BTN_SECONDARY_SM,
  CARD,
  CARD_HEAD,
  CARD_TITLE,
  FIELD,
  INPUT,
  LABEL,
  META,
  plural,
} from "@/components/ui/surfaces";

// Client-side form schema: same rules as the API validator, minus userId.
const formSchema = createSkillSchema.omit({ userId: true });
type FormValues = z.infer<typeof formSchema>;

interface SkillFormProps {
  mode: "create" | "edit";
  skill?: SkillDTO | null;
  initialDraft?: SkillVersionDTO | null;
  initialTemplate?: Partial<FormValues> | null;
  onSubmit: (values: FormValues) => Promise<void>;
  isSubmitting?: boolean;
}

const inputClass = clsx(INPUT, "w-full");
const areaClass = clsx(FIELD, "w-full resize-y p-3 leading-6");
const labelClass = LABEL;
const HINT = "font-sans text-[13px] leading-5 text-[var(--text-muted)]";

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p role="alert" className="mt-1 font-sans text-[13px] text-[var(--state-error)]">
      {message}
    </p>
  );
}

// RHF nested array/field errors are a Merge<FieldError, FieldErrorsImpl> —
// extract the message string safely.
function fieldMessage(err: unknown): string | undefined {
  if (!err) return undefined;
  if (typeof err === "string") return err;
  if (typeof err === "object" && err !== null && "message" in err) {
    const m = (err as { message?: unknown }).message;
    return typeof m === "string" ? m : undefined;
  }
  return undefined;
}

function exampleFieldError(errors: unknown, index: number, field: "input" | "output"): unknown {
  if (!errors || typeof errors !== "object") return undefined;
  const examples = (errors as { examples?: unknown }).examples;
  if (!examples || typeof examples !== "object" || !Array.isArray(examples)) return undefined;
  const item = examples[index];
  if (!item || typeof item !== "object") return undefined;
  return (item as Record<string, unknown>)[field];
}

function JsonEditor({
  label,
  value,
  onChange,
  error,
  placeholder,
  fieldKey,
  onValidityChange,
}: {
  label: string;
  value: Record<string, unknown> | undefined;
  onChange: (v: Record<string, unknown>) => void;
  error?: string;
  placeholder?: string;
  fieldKey: string;
  onValidityChange: (key: string, valid: boolean) => void;
}) {
  const [raw, setRaw] = useState(() => (value ? JSON.stringify(value, null, 2) : ""));
  const [localError, setLocalError] = useState<string | null>(null);

  // If this editor unmounts (e.g. an example row is removed) while holding an
  // invalid state, drop it from the invalid set so it can't block submission.
  useEffect(() => {
    return () => onValidityChange(fieldKey, true);
  }, [fieldKey, onValidityChange]);

  const handleChange = (text: string) => {
    setRaw(text);
    if (!text.trim()) {
      setLocalError(null);
      onValidityChange(fieldKey, true);
      onChange({});
      return;
    }
    try {
      const parsed = JSON.parse(text);
      if (Array.isArray(parsed) || parsed === null || typeof parsed !== "object") {
        throw new Error("Must be a JSON object");
      }
      setLocalError(null);
      onValidityChange(fieldKey, true);
      onChange(parsed);
    } catch {
      setLocalError("Invalid JSON");
      onValidityChange(fieldKey, false);
    }
  };

  const id = `json-${fieldKey}`;

  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between gap-3">
        <label htmlFor={id} className={labelClass}>
          {label}
        </label>
        {error && <span className="font-sans text-[13px] text-[var(--state-error)]">{error}</span>}
      </div>
      <textarea
        id={id}
        value={raw}
        onChange={(e) => handleChange(e.target.value)}
        rows={6}
        spellCheck={false}
        placeholder={placeholder ?? "{ }"}
        aria-invalid={Boolean(localError)}
        className={clsx(FIELD, "w-full resize-y p-3 font-mono text-xs leading-5", localError && "border-[var(--state-error)]")}
      />
      {localError && (
        <p role="alert" className="font-sans text-[13px] text-[var(--state-error)]">
          {localError}
        </p>
      )}
    </div>
  );
}

const PILL =
  "h-7 cursor-pointer rounded-[6px] border border-[var(--border-subtle)] px-2.5 font-mono text-xs text-[var(--text-secondary)] transition-colors hover:border-[var(--border-strong)] hover:text-[var(--text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)]";

/** Quick-add picker of the built-in tools, grouped by registry category. */
function AvailableTools({ selected, onAdd }: { selected: string[]; onAdd: (name: string) => void }) {
  const available = BUILT_IN_TOOL_CATALOG.filter((t) => !selected.includes(t.name));
  if (available.length === 0) return null;
  return (
    <div className="space-y-2 border-t border-[var(--border-subtle)] pt-4">
      <div className={labelClass}>Built-in tools</div>
      {TOOL_CATEGORIES.map((cat) => {
        const tools = available.filter((t) => t.category === cat.id);
        if (tools.length === 0) return null;
        return (
          <div key={cat.id} className="flex flex-wrap items-center gap-2">
            <span className={clsx(META, "w-20 shrink-0")}>{cat.label.toLowerCase()}</span>
            {tools.map((t) => (
              <button key={t.name} type="button" onClick={() => onAdd(t.name)} className={PILL}>
                + {t.name}
              </button>
            ))}
          </div>
        );
      })}
    </div>
  );
}

function TagsInput({
  label,
  values,
  onChange,
  error,
  placeholder,
}: {
  label: string;
  values: string[];
  onChange: (v: string[]) => void;
  error?: string;
  placeholder?: string;
}) {
  const [input, setInput] = useState("");

  const add = () => {
    const value = input.trim();
    if (!value) return;
    if (!values.includes(value)) {
      onChange([...values, value]);
    }
    setInput("");
  };

  return (
    <div className="space-y-2">
      {label && <label className={labelClass}>{label}</label>}
      {values.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {values.map((v) => (
            <span
              key={v}
              className="inline-flex items-center gap-1.5 rounded-[6px] bg-[var(--text-primary)]/10 px-2 py-0.5 font-mono text-xs text-[var(--text-primary)]"
            >
              {v}
              <button
                type="button"
                onClick={() => onChange(values.filter((x) => x !== v))}
                aria-label={`Remove ${v}`}
                className="cursor-pointer text-[var(--text-muted)] transition-colors hover:text-[var(--state-error)]"
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}
      <div className="flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              add();
            }
          }}
          placeholder={placeholder}
          aria-label={label || "Add a tool"}
          className={inputClass}
        />
        <button type="button" onClick={add} className={BTN_SECONDARY_SM}>
          Add
        </button>
      </div>
      {error && (
        <p role="alert" className="font-sans text-[13px] text-[var(--state-error)]">
          {error}
        </p>
      )}
    </div>
  );
}

function BuilderModeGuide({
  toolCount,
  approvalCount,
}: {
  toolCount: number;
  approvalCount: number;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const isWorkflow = toolCount > 1 || approvalCount > 0;

  return (
    <section className={CARD}>
      <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
        <div className="min-w-0 space-y-1">
          <div className="font-sans text-sm font-medium text-[var(--text-primary)]">
            {isWorkflow ? "Workflow pipeline" : "Atomic skill"}
          </div>
          <p className={HINT}>
            {isWorkflow
              ? `${plural(toolCount, "tool")} and ${plural(approvalCount, "approval")}, run as a bounded multi-step pipeline`
              : toolCount === 0
              ? "Prompt only, a reusable AI capability"
              : "A single focused, reusable capability"}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          aria-expanded={isOpen}
          className="cursor-pointer font-sans text-sm text-[var(--text-muted)] transition-colors hover:text-[var(--text-primary)]"
        >
          {isOpen ? "Hide guide" : "Skill or workflow?"}
        </button>
      </div>

      {isOpen && (
        <div className="grid grid-cols-1 gap-px border-t border-[var(--border-subtle)] bg-[var(--border-subtle)] md:grid-cols-2">
          <div className="space-y-2 bg-[var(--surface-raised)] p-5">
            <h3 className="font-sans text-sm font-medium text-[var(--text-primary)]">An atomic skill</h3>
            <p className="font-sans text-[13px] leading-5 text-[var(--text-secondary)]">
              One focused capability, for example a rate fetcher, an SQL generator or a text classifier.
            </p>
            <ul className="list-disc space-y-1 pl-5 font-sans text-[13px] leading-5 text-[var(--text-secondary)]">
              <li>Select 0 or 1 tool in Allowed tools</li>
              <li>Leave Actions requiring approval empty</li>
              <li>Define strict input and output JSON schemas</li>
              <li>Reusable across the workspace and the Agent canvas</li>
            </ul>
          </div>

          <div className="space-y-2 bg-[var(--surface-raised)] p-5">
            <h3 className="font-sans text-sm font-medium text-[var(--text-primary)]">A workflow pipeline</h3>
            <p className="font-sans text-[13px] leading-5 text-[var(--text-secondary)]">
              A multi-step business process, for example refund automation, an invoice audit or lead triage.
            </p>
            <ul className="list-disc space-y-1 pl-5 font-sans text-[13px] leading-5 text-[var(--text-secondary)]">
              <li>Chain 2 or more sequential tools in Allowed tools</li>
              <li>Choose write actions under Actions requiring approval</li>
              <li>Write step-by-step instructions: search, extract, approve, report</li>
              <li>Runs as a bounded autonomous workflow</li>
            </ul>
          </div>
        </div>
      )}
    </section>
  );
}

export function SkillForm({
  mode,
  skill,
  initialDraft,
  initialTemplate,
  onSubmit,
  isSubmitting = false,
}: SkillFormProps) {
  const draft = initialDraft ?? skill?.currentDraft ?? skill?.publishedVersion ?? skill?.versions?.[0] ?? null;

  // Tracks editors currently showing invalid JSON. JsonEditor only reports
  // parsed values upward, so without this the form would silently submit the
  // last valid value while the user sees a red error — losing their edits.
  const invalidJsonKeys = useRef<Set<string>>(new Set());
  const setJsonValidity = useCallback((key: string, valid: boolean) => {
    if (valid) invalidJsonKeys.current.delete(key);
    else invalidJsonKeys.current.add(key);
  }, []);

  const {
    register,
    control,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: skill?.name ?? initialTemplate?.name ?? "",
      purpose: skill?.purpose ?? initialTemplate?.purpose ?? "",
      instructions: draft?.instructions ?? initialTemplate?.instructions ?? "",
      inputSchema: draft?.inputSchema ?? initialTemplate?.inputSchema ?? {},
      outputSchema: draft?.outputSchema ?? initialTemplate?.outputSchema ?? {},
      examples: draft?.examples?.length ? draft.examples : initialTemplate?.examples?.length ? initialTemplate.examples : [],
      allowedTools: draft?.allowedTools?.length ? draft.allowedTools : initialTemplate?.allowedTools?.length ? initialTemplate.allowedTools : [],
      actionsRequiringApproval: draft?.actionsRequiringApproval ?? initialTemplate?.actionsRequiringApproval ?? [],
      approvalPolicy: draft?.approvalPolicy ?? initialTemplate?.approvalPolicy ?? {
        alwaysRequireApproval: false,
        neverRequireApproval: false,
        toolBasedApproval: [],
        skillBasedApproval: [],
      },
      maxExecutionSteps: draft?.maxExecutionSteps ?? initialTemplate?.maxExecutionSteps ?? 10,
      notes: draft?.notes ?? "",
    },
  });

  const allowedTools = watch("allowedTools") || [];
  const actionsRequiringApproval = watch("actionsRequiringApproval") || [];
  const instructions = watch("instructions") || "";
  const [isQuickConnectOpen, setIsQuickConnectOpen] = useState(false);

  const { fields, append, remove } = useFieldArray({
    control,
    name: "examples",
  });

  const onValidSubmit = handleSubmit(async (values) => {
    if (invalidJsonKeys.current.size > 0) {
      toast.error("Invalid JSON", "Fix the highlighted JSON fields before saving");
      return;
    }
    await onSubmit(values);
  });

  return (
    <form onSubmit={onValidSubmit} className="space-y-6" noValidate>
      <BuilderModeGuide toolCount={allowedTools.length} approvalCount={actionsRequiringApproval.length} />

      {/* Live pipeline preview */}
      <section className={CARD}>
        <div className={CARD_HEAD}>
          <h2 className={CARD_TITLE}>Pipeline preview</h2>
          <span className={META}>{plural(allowedTools.length + 1, "step")}</span>
        </div>
        <div className="p-5">
          <WorkflowStepChain allowedTools={allowedTools} actionsRequiringApproval={actionsRequiringApproval} />
        </div>
      </section>

      {/* Name & purpose */}
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        <div className="space-y-2">
          <label htmlFor="skill-name" className={labelClass}>
            Name
          </label>
          <input id="skill-name" {...register("name")} placeholder="Customer refund automation" className={inputClass} />
          <FieldError message={errors.name?.message} />
        </div>
        <div className="space-y-2">
          <label htmlFor="skill-purpose" className={labelClass}>
            Purpose
          </label>
          <input
            id="skill-purpose"
            {...register("purpose")}
            placeholder="What bounded business outcome does this achieve?"
            className={inputClass}
          />
          <FieldError message={errors.purpose?.message} />
        </div>
      </div>

      {/* Instructions */}
      <div className="space-y-2">
        <label htmlFor="skill-instructions" className={labelClass}>
          Instructions
        </label>
        <textarea
          id="skill-instructions"
          {...register("instructions")}
          rows={4}
          placeholder="Step-by-step instructions the agent follows when it runs this skill"
          className={areaClass}
        />
        <FieldError message={errors.instructions?.message} />
      </div>

      {/* JSON schemas */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <Controller
          control={control}
          name="inputSchema"
          render={({ field }) => (
            <JsonEditor
              label="Input schema (JSON)"
              value={field.value}
              onChange={field.onChange}
              error={fieldMessage(errors.inputSchema)}
              fieldKey="inputSchema"
              onValidityChange={setJsonValidity}
              placeholder={'{ "type": "object", "properties": { } }'}
            />
          )}
        />
        <Controller
          control={control}
          name="outputSchema"
          render={({ field }) => (
            <JsonEditor
              label="Output schema (JSON)"
              value={field.value}
              onChange={field.onChange}
              error={fieldMessage(errors.outputSchema)}
              fieldKey="outputSchema"
              onValidityChange={setJsonValidity}
              placeholder={'{ "type": "object", "properties": { } }'}
            />
          )}
        />
      </div>

      {/* Examples */}
      <section className={CARD}>
        <div className={CARD_HEAD}>
          <div className="space-y-1">
            <h2 className={CARD_TITLE}>Examples</h2>
            <p className={HINT}>Input and output pairs that show the expected behavior</p>
          </div>
          <button type="button" onClick={() => append({ input: {}, output: {}, description: "" })} className={BTN_SECONDARY_SM}>
            Add example
          </button>
        </div>

        {fields.length === 0 ? (
          <p className="px-5 py-8 text-center font-sans text-sm text-[var(--text-muted)]">No examples yet</p>
        ) : (
          <ul className="divide-y divide-[var(--border-subtle)]">
            {fields.map((field, index) => (
              <li key={field.id} className="space-y-4 p-5">
                <div className="flex items-center justify-between">
                  <span className={META}>example {index + 1}</span>
                  <button
                    type="button"
                    onClick={() => remove(index)}
                    aria-label={`Remove example ${index + 1}`}
                    className="cursor-pointer font-sans text-[13px] text-[var(--text-muted)] transition-colors hover:text-[var(--state-error)]"
                  >
                    Remove
                  </button>
                </div>
                <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
                  <Controller
                    control={control}
                    name={`examples.${index}.input`}
                    render={({ field: f }) => (
                      <JsonEditor
                        label="Input"
                        value={f.value}
                        onChange={f.onChange}
                        error={fieldMessage(exampleFieldError(errors, index, "input"))}
                        fieldKey={`examples.${index}.input`}
                        onValidityChange={setJsonValidity}
                        placeholder='{ "query": "…" }'
                      />
                    )}
                  />
                  <Controller
                    control={control}
                    name={`examples.${index}.output`}
                    render={({ field: f }) => (
                      <JsonEditor
                        label="Output"
                        value={f.value}
                        onChange={f.onChange}
                        error={fieldMessage(exampleFieldError(errors, index, "output"))}
                        fieldKey={`examples.${index}.output`}
                        onValidityChange={setJsonValidity}
                        placeholder='{ "result": "…" }'
                      />
                    )}
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor={`example-desc-${index}`} className={labelClass}>
                    Description (optional)
                  </label>
                  <input
                    id={`example-desc-${index}`}
                    {...register(`examples.${index}.description`)}
                    placeholder="Explain this example"
                    className={inputClass}
                  />
                </div>
              </li>
            ))}
          </ul>
        )}
        <FieldError message={fieldMessage(errors.examples)} />
      </section>

      {/* Allowed tools, approvals and policy */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <Controller
          control={control}
          name="allowedTools"
          render={({ field }) => (
            <section className={CARD}>
              <div className={CARD_HEAD}>
                <div className="space-y-1">
                  <h2 className={CARD_TITLE}>Allowed tools</h2>
                  <p className={HINT}>At least one is required</p>
                </div>
                <button type="button" onClick={() => setIsQuickConnectOpen(true)} className={BTN_SECONDARY_SM}>
                  Connect public APIs
                </button>
              </div>

              <div className="space-y-4 p-5">
                <TagsInput
                  label=""
                  values={field.value ?? []}
                  onChange={field.onChange}
                  error={fieldMessage(errors.allowedTools)}
                  placeholder="calculator, document_search"
                />

                <AvailableTools
                  selected={field.value ?? []}
                  onAdd={(name) => field.onChange([...(field.value ?? []), name])}
                />
                <AvailableMcpTools
                  selected={field.value ?? []}
                  onAdd={(name) => field.onChange([...(field.value ?? []), name])}
                />
                <AvailableOpenApiTools
                  selected={field.value ?? []}
                  onAdd={(name) => field.onChange([...(field.value ?? []), name])}
                />
              </div>

              <QuickConnectToolModal
                isOpen={isQuickConnectOpen}
                onClose={() => setIsQuickConnectOpen(false)}
                selectedTools={field.value ?? []}
                onAddTool={(toolName) => {
                  if (!field.value?.includes(toolName)) {
                    field.onChange([...(field.value ?? []), toolName]);
                  }
                }}
              />
            </section>
          )}
        />
        <Controller
          control={control}
          name="actionsRequiringApproval"
          render={({ field }) => (
            <section className={CARD}>
              <div className={CARD_HEAD}>
                <div className="space-y-1">
                  <h2 className={CARD_TITLE}>Actions requiring approval</h2>
                  <p className={HINT}>
                    When an agent attempts one of these write actions, the run pauses in{" "}
                    <code className="font-mono text-xs">PAUSED_FOR_APPROVAL</code> until a person reviews it.
                  </p>
                </div>
              </div>

              <div className="p-5">
                <ApprovalActionMarketplace
                  selected={field.value ?? []}
                  onChange={field.onChange}
                  allowedTools={allowedTools}
                  instructions={instructions}
                />
              </div>
            </section>
          )}
        />
        <Controller
          control={control}
          name="approvalPolicy"
          render={({ field }) => {
            const policy = field.value ?? {
              alwaysRequireApproval: false,
              neverRequireApproval: false,
              toolBasedApproval: [],
              skillBasedApproval: [],
            };
            const toolBasedApproval = policy.toolBasedApproval ?? [];

            return (
              <section className={clsx(CARD, "lg:col-span-2")}>
                <div className={CARD_HEAD}>
                  <div className="space-y-1">
                    <h2 className={CARD_TITLE}>Approval policy overrides</h2>
                    <p className={HINT}>Checked before the per-action list above, so an override here always wins</p>
                  </div>
                </div>

                <div className="space-y-4 p-5">
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      aria-pressed={policy.alwaysRequireApproval}
                      onClick={() =>
                        field.onChange({
                          ...policy,
                          alwaysRequireApproval: !policy.alwaysRequireApproval,
                          neverRequireApproval: false,
                        })
                      }
                      className={clsx(
                        "h-8 cursor-pointer rounded-[8px] border px-3 font-sans text-[13px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)]",
                        policy.alwaysRequireApproval
                          ? "border-[var(--state-warning)] bg-[var(--state-warning)]/10 text-[var(--text-primary)]"
                          : "border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                      )}
                    >
                      Always require approval
                    </button>
                    <button
                      type="button"
                      aria-pressed={policy.neverRequireApproval}
                      onClick={() =>
                        field.onChange({
                          ...policy,
                          neverRequireApproval: !policy.neverRequireApproval,
                          alwaysRequireApproval: false,
                        })
                      }
                      className={clsx(
                        "h-8 cursor-pointer rounded-[8px] border px-3 font-sans text-[13px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)]",
                        policy.neverRequireApproval
                          ? "border-[var(--state-error)] bg-[var(--state-error)]/10 text-[var(--text-primary)]"
                          : "border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                      )}
                    >
                      Never require approval
                    </button>
                  </div>

                  {policy.neverRequireApproval && (
                    <p className="font-sans text-[13px] leading-5 text-[var(--state-error)]">
                      This overrides every tool&rsquo;s own write and approval contract. Actions run without human review.
                    </p>
                  )}

                  {allowedTools.length > 0 && (
                    <div className="space-y-2">
                      <div className={labelClass}>Always pause for these tools, whatever the action list says</div>
                      <div className="flex flex-wrap gap-2">
                        {allowedTools.map((toolName) => {
                          const active = toolBasedApproval.includes(toolName);
                          return (
                            <button
                              key={toolName}
                              type="button"
                              aria-pressed={active}
                              onClick={() =>
                                field.onChange({
                                  ...policy,
                                  toolBasedApproval: active
                                    ? toolBasedApproval.filter((t) => t !== toolName)
                                    : [...toolBasedApproval, toolName],
                                })
                              }
                              className={clsx(
                                PILL,
                                active && "border-[var(--border-strong)] bg-[var(--text-primary)]/10 text-[var(--text-primary)]"
                              )}
                            >
                              {toolName}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </section>
            );
          }}
        />
      </div>

      {/* Max steps and notes */}
      <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
        <div className="space-y-2">
          <label htmlFor="skill-max-steps" className={labelClass}>
            Max execution steps
          </label>
          <input
            id="skill-max-steps"
            type="number"
            min={1}
            max={100}
            {...register("maxExecutionSteps", {
              // Empty input → undefined (schema treats it as optional, the
              // repository defaults to 10). valueAsNumber would produce NaN and
              // surface a confusing "Expected number, received nan" error.
              setValueAs: (v) => (v === "" ? undefined : Number(v)),
            })}
            className={inputClass}
          />
          <FieldError message={errors.maxExecutionSteps?.message} />
        </div>
        <div className="space-y-2 md:col-span-2">
          <label htmlFor="skill-notes" className={labelClass}>
            Notes
          </label>
          <textarea
            id="skill-notes"
            {...register("notes")}
            rows={2}
            placeholder="Internal notes about this skill. They are not part of execution."
            className={areaClass}
          />
          <FieldError message={errors.notes?.message} />
        </div>
      </div>

      <div className="flex justify-end border-t border-[var(--border-subtle)] pt-5">
        <button type="submit" disabled={isSubmitting} className={BTN_PRIMARY}>
          {isSubmitting ? "Saving" : mode === "create" ? "Create skill" : "Save draft"}
        </button>
      </div>
    </form>
  );
}
