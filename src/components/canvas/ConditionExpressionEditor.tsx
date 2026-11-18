"use client";

import React, { useState, useCallback, useRef, useEffect, useMemo } from "react";
import {
  AlertCircle,
  Check,
  ChevronRight,
  Braces,
  Variable,
  Box,
} from "lucide-react";
import { clsx } from "clsx";

// ─── Expression token types for syntax highlighting ───
type TokenKind =
  | "root"      // results, input, item
  | "dot"       // .
  | "ident"     // property names
  | "op"        // ==, !=, >, >=, <, <=, &&, ||, contains, startsWith, endsWith, !
  | "string"    // "..." or '...'
  | "number"    // 123, 3.14, -5
  | "bool"      // true, false
  | "null"      // null
  | "paren"     // ( )
  | "bracket"   // [ ]
  | "text"      // anything else
  | "error";    // syntax error token

interface HighlightToken {
  kind: TokenKind;
  text: string;
  start: number;
  end: number;
}

// ─── Lightweight tokenizer for highlighting ───
function tokenizeForHighlight(src: string): HighlightToken[] {
  const tokens: HighlightToken[] = [];
  let i = 0;
  const n = src.length;

  const push = (kind: TokenKind, start: number, end: number) =>
    tokens.push({ kind, text: src.slice(start, end), start, end });

  while (i < n) {
    const ch = src[i];

    // Whitespace
    if (/\s/.test(ch)) {
      const start = i;
      while (i < n && /\s/.test(src[i])) i++;
      push("text", start, i);
      continue;
    }

    // Strings
    if (ch === '"' || ch === "'") {
      const start = i;
      const quote = ch;
      i++;
      while (i < n && src[i] !== quote) {
        if (src[i] === "\\" && i + 1 < n) i += 2;
        else i++;
      }
      if (i < n) i++; // closing quote
      push("string", start, i);
      continue;
    }

    // Numbers
    if (/[0-9]/.test(ch) || (ch === "-" && /[0-9]/.test(src[i + 1] ?? ""))) {
      const start = i;
      if (ch === "-") i++;
      while (i < n && /[0-9.]/.test(src[i])) i++;
      push("number", start, i);
      continue;
    }

    // Identifiers and keywords
    if (/[A-Za-z_]/.test(ch)) {
      const start = i;
      while (i < n && /[A-Za-z0-9_]/.test(src[i])) i++;
      const word = src.slice(start, i);
      if (word === "results" || word === "input" || word === "item") {
        push("root", start, i);
      } else if (word === "true" || word === "false") {
        push("bool", start, i);
      } else if (word === "null") {
        push("null", start, i);
      } else if (["contains", "startsWith", "endsWith"].includes(word)) {
        push("op", start, i);
      } else {
        push("ident", start, i);
      }
      continue;
    }

    // Operators
    const two = src.slice(i, i + 2);
    if (["==", "!=", ">=", "<=", "&&", "||"].includes(two)) {
      push("op", i, i + 2);
      i += 2;
      continue;
    }
    if ("> < ! -".includes(ch)) {
      push("op", i, i + 1);
      i++;
      continue;
    }

    // Parens & brackets
    if (ch === "(") { push("paren", i, i + 1); i++; continue; }
    if (ch === ")") { push("paren", i, i + 1); i++; continue; }
    if (ch === "[") { push("bracket", i, i + 1); i++; continue; }
    if (ch === "]") { push("bracket", i, i + 1); i++; continue; }
    if (ch === ".") { push("dot", i, i + 1); i++; continue; }

    // Unknown character
    push("error", i, i + 1);
    i++;
  }

  return tokens;
}

// ─── Syntax highlighting colors ───
const TOKEN_COLORS: Record<TokenKind, string> = {
  root: "text-[var(--text-secondary)] font-medium",
  dot: "text-[var(--text-muted)]",
  ident: "text-[var(--text-secondary)]",
  op: "text-[var(--state-warning)] font-medium",
  string: "text-[var(--state-success)]",
  number: "text-[var(--state-warning)]",
  bool: "text-[var(--text-secondary)] font-medium",
  null: "text-[var(--text-muted)] ",
  paren: "text-[var(--text-muted)]",
  bracket: "text-[var(--text-muted)]",
  text: "text-[var(--text-muted)]",
  error: "text-[var(--state-error)] underline decoration-wavy",
};

// ─── Lightweight expression validation ───
interface ValidationError {
  message: string;
  position: number;
  severity: "error" | "warning";
}

function validateExpression(expr: string, allNodeIds: string[]): ValidationError[] {
  const errors: ValidationError[] = [];
  if (!expr.trim()) return errors;

  // Check for unterminated strings
  let inString = false;
  let stringChar = "";
  let stringStart = -1;
  for (let i = 0; i < expr.length; i++) {
    if (!inString && (expr[i] === '"' || expr[i] === "'")) {
      inString = true;
      stringChar = expr[i];
      stringStart = i;
    } else if (inString && expr[i] === stringChar && expr[i - 1] !== "\\") {
      inString = false;
    }
  }
  if (inString) {
    errors.push({ message: "Unterminated string literal", position: stringStart, severity: "error" });
  }

  // Check for balanced parentheses
  let parenDepth = 0;
  let parenStart = -1;
  for (let i = 0; i < expr.length; i++) {
    if (expr[i] === "(") {
      if (parenDepth === 0) parenStart = i;
      parenDepth++;
    } else if (expr[i] === ")") {
      parenDepth--;
      if (parenDepth < 0) {
        errors.push({ message: "Unmatched closing parenthesis", position: i, severity: "error" });
        parenDepth = 0;
      }
    }
  }
  if (parenDepth > 0) {
    errors.push({ message: "Unclosed parenthesis", position: parenStart, severity: "error" });
  }

  // Check for balanced brackets
  let bracketDepth = 0;
  for (let i = 0; i < expr.length; i++) {
    if (expr[i] === "[") bracketDepth++;
    else if (expr[i] === "]") {
      bracketDepth--;
      if (bracketDepth < 0) {
        errors.push({ message: "Unmatched closing bracket", position: i, severity: "error" });
        bracketDepth = 0;
      }
    }
  }
  if (bracketDepth > 0) {
    errors.push({ message: "Unclosed bracket", position: expr.length - 1, severity: "error" });
  }

  // Check for unknown root references
  const rootMatches = expr.matchAll(/\b([a-zA-Z_]\w*)\b/g);
  for (const match of rootMatches) {
    const word = match[1];
    const pos = match.index!;
    if (!["results", "input", "item", "true", "false", "null", "contains", "startsWith", "endsWith"].includes(word)) {
      // Check if it looks like it's being used as a root (followed by .)
      const afterWord = expr.slice(pos + word.length);
      if (afterWord.startsWith(".") || afterWord.startsWith("[")) {
        // It's being used as a path root — check if it's a known one
        if (!["results", "input", "item"].includes(word)) {
          errors.push({
            message: `Unknown root "${word}". use results., input. or item.`,
            position: pos,
            severity: "error",
          });
        }
      }
    }
  }

  // Check for results.<nodeId> references to unknown nodes
  const resultRefs = expr.matchAll(/results\.([A-Za-z_][A-Za-z0-9_]*)/g);
  for (const match of resultRefs) {
    const nodeId = match[1];
    if (allNodeIds.length > 0 && !allNodeIds.includes(nodeId)) {
      errors.push({
        message: `References unknown node "${nodeId}". it may not exist in this graph`,
        position: match.index!,
        severity: "warning",
      });
    }
  }

  // Check for empty condition (just whitespace)
  if (expr.trim().length > 0 && !/[=!<>]/.test(expr) && !/contains|startsWith|endsWith/.test(expr)) {
    errors.push({
      message: "Expression has no comparison operator. add ==, !=, >, <, >=, <=, contains, startsWith, or endsWith",
      position: 0,
      severity: "warning",
    });
  }

  return errors;
}

// ─── Autocomplete ───
interface AutocompleteItem {
  label: string;
  description: string;
  insertText: string;
  icon: React.ReactNode;
  category: "root" | "path" | "operator" | "literal";
}

const OPERATOR_SUGGESTIONS: AutocompleteItem[] = [
  { label: "==", description: "equals", insertText: " == ", icon: <span className="text-[var(--state-warning)]">=</span>, category: "operator" },
  { label: "!=", description: "not equals", insertText: " != ", icon: <span className="text-[var(--state-warning)]">≠</span>, category: "operator" },
  { label: ">", description: "greater than", insertText: " > ", icon: <span className="text-[var(--state-warning)]">&gt;</span>, category: "operator" },
  { label: ">=", description: "greater or equal", insertText: " >= ", icon: <span className="text-[var(--state-warning)]">≥</span>, category: "operator" },
  { label: "<", description: "less than", insertText: " < ", icon: <span className="text-[var(--state-warning)]">&lt;</span>, category: "operator" },
  { label: "<=", description: "less or equal", insertText: " <= ", icon: <span className="text-[var(--state-warning)]">≤</span>, category: "operator" },
  { label: "contains", description: "string contains", insertText: " contains ", icon: <span className="text-[var(--state-warning)]">∈</span>, category: "operator" },
  { label: "startsWith", description: "string starts with", insertText: " startsWith ", icon: <span className="text-[var(--state-warning)]">→</span>, category: "operator" },
  { label: "endsWith", description: "string ends with", insertText: " endsWith ", icon: <span className="text-[var(--state-warning)]">←</span>, category: "operator" },
];

function getAutocompleteItems(
  expr: string,
  cursorPos: number,
  allNodeIds: string[],
): AutocompleteItem[] | null {
  // Find what the user is currently typing
  const beforeCursor = expr.slice(0, cursorPos);

  // Check if we're after a root with a dot: results. or input. or item.
  const rootDotMatch = beforeCursor.match(/(results|input|item)\.$/);
  if (rootDotMatch) {
    const root = rootDotMatch[1];
    if (root === "results" && allNodeIds.length > 0) {
      return allNodeIds.map((id) => ({
        label: id,
        description: "node output",
        insertText: id,
        icon: <Box className="h-2.5 w-2.5 text-[var(--text-secondary)]" />,
        category: "path" as const,
      }));
    }
    if (root === "input") {
      return [
        { label: "query", description: "user query input", insertText: "query", icon: <Variable className="h-2.5 w-2.5 text-[var(--text-secondary)]" />, category: "path" as const },
        { label: "data", description: "input data payload", insertText: "data", icon: <Variable className="h-2.5 w-2.5 text-[var(--text-secondary)]" />, category: "path" as const },
      ];
    }
    if (root === "item") {
      return [
        { label: "name", description: "item name", insertText: "name", icon: <Variable className="h-2.5 w-2.5 text-[var(--text-secondary)]" />, category: "path" as const },
        { label: "value", description: "item value", insertText: "value", icon: <Variable className="h-2.5 w-2.5 text-[var(--text-secondary)]" />, category: "path" as const },
        { label: "index", description: "item index", insertText: "index", icon: <Variable className="h-2.5 w-2.5 text-[var(--text-secondary)]" />, category: "path" as const },
      ];
    }
  }

  // Check if we're after a node reference: results.nodeId.
  const nodeDotMatch = beforeCursor.match(/results\.([A-Za-z_]\w*)\.$/);
  if (nodeDotMatch) {
    return [
      { label: "decision", description: "router decision", insertText: "decision", icon: <ChevronRight className="h-2.5 w-2.5 text-[var(--text-secondary)]" />, category: "path" as const },
      { label: "content", description: "agent output content", insertText: "content", icon: <ChevronRight className="h-2.5 w-2.5 text-[var(--text-secondary)]" />, category: "path" as const },
      { label: "status", description: "execution status", insertText: "status", icon: <ChevronRight className="h-2.5 w-2.5 text-[var(--text-secondary)]" />, category: "path" as const },
      { label: "output", description: "raw output", insertText: "output", icon: <ChevronRight className="h-2.5 w-2.5 text-[var(--text-secondary)]" />, category: "path" as const },
    ];
  }

  // Check if we're typing an operator context (after a value/operand)
  const opContext = beforeCursor.match(/([\w"')\]])\s*$/);
  if (opContext && !beforeCursor.match(/(==|!=|>=|<=|>|<|&&|\|\|)\s*$/)) {
    return OPERATOR_SUGGESTIONS;
  }

  // Check if at start or after operator — suggest roots
  const atStart = beforeCursor.trim() === "" || beforeCursor.match(/[(|&!]\s*$/);
  if (atStart) {
    return [
      { label: "results", description: "node execution outputs", insertText: "results.", icon: <Braces className="h-2.5 w-2.5 text-[var(--text-secondary)]" />, category: "root" as const },
      { label: "input", description: "user-provided input", insertText: "input.", icon: <Variable className="h-2.5 w-2.5 text-[var(--text-secondary)]" />, category: "root" as const },
      { label: "item", description: "current map iteration item", insertText: "item.", icon: <Box className="h-2.5 w-2.5 text-[var(--text-secondary)]" />, category: "root" as const },
      { label: "true", description: "boolean true", insertText: "true", icon: <span className="text-[var(--text-secondary)] text-xs">T</span>, category: "literal" as const },
      { label: "false", description: "boolean false", insertText: "false", icon: <span className="text-[var(--text-secondary)] text-xs">F</span>, category: "literal" as const },
      { label: "null", description: "null value", insertText: "null", icon: <span className="text-[var(--text-muted)] text-xs">∅</span>, category: "literal" as const },
    ];
  }

  return null;
}

// ─── Component Props ───
interface ConditionExpressionEditorProps {
  value: string;
  onChange: (value: string) => void;
  readOnly?: boolean;
  allNodeIds?: string[];
}

export function ConditionExpressionEditor({
  value,
  onChange,
  readOnly = false,
  allNodeIds = [],
}: ConditionExpressionEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const preRef = useRef<HTMLPreElement>(null);
  const [cursorPos, setCursorPos] = useState(0);
  const [showAutocomplete, setShowAutocomplete] = useState(false);
  const [acItems, setAcItems] = useState<AutocompleteItem[]>([]);
  const [acIndex, setAcIndex] = useState(0);
  const [isFocused, setIsFocused] = useState(false);

  // Validate the expression
  const errors = useMemo(() => validateExpression(value, allNodeIds), [value, allNodeIds]);
  const hasErrors = errors.some((e) => e.severity === "error");
  const hasWarnings = errors.some((e) => e.severity === "warning");

  // Tokenize for syntax highlighting
  const tokens = useMemo(() => tokenizeForHighlight(value), [value]);

  // Compute autocomplete items
  useEffect(() => {
    if (readOnly || !isFocused) {
      setShowAutocomplete(false);
      return;
    }
    const items = getAutocompleteItems(value, cursorPos, allNodeIds);
    if (items && items.length > 0) {
      setAcItems(items);
      setAcIndex(0);
      setShowAutocomplete(true);
    } else {
      setShowAutocomplete(false);
    }
  }, [value, cursorPos, allNodeIds, readOnly, isFocused]);

  // Sync scroll between textarea and pre
  const handleScroll = useCallback(() => {
    if (textareaRef.current && preRef.current) {
      preRef.current.scrollTop = textareaRef.current.scrollTop;
      preRef.current.scrollLeft = textareaRef.current.scrollLeft;
    }
  }, []);

  // Handle input changes
  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const newValue = e.target.value;
      onChange(newValue);
      setCursorPos(e.target.selectionStart ?? newValue.length);
    },
    [onChange]
  );

  // Handle cursor movement for autocomplete context
  const handleSelect = useCallback((e: React.SyntheticEvent<HTMLTextAreaElement>) => {
    setCursorPos(e.currentTarget.selectionStart ?? 0);
  }, []);

  // Insert autocomplete suggestion
  const insertAutocompletion = useCallback(
    (item: AutocompleteItem) => {
      const textarea = textareaRef.current;
      if (!textarea) return;

      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;

      // Find the start of the current "word" being typed
      const beforeCursor = value.slice(0, start);
      const wordMatch = beforeCursor.match(/([A-Za-z_]\w*)$/);
      const wordStart = wordMatch ? start - wordMatch[1].length : start;

      const newValue = value.slice(0, wordStart) + item.insertText + value.slice(end);
      onChange(newValue);

      // Set cursor position after the inserted text
      const newPos = wordStart + item.insertText.length;
      requestAnimationFrame(() => {
        textarea.focus();
        textarea.setSelectionRange(newPos, newPos);
        setCursorPos(newPos);
      });

      setShowAutocomplete(false);
    },
    [value, onChange]
  );

  // Handle keyboard events for autocomplete navigation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (!showAutocomplete || acItems.length === 0) return;

      if (e.key === "ArrowDown") {
        e.preventDefault();
        setAcIndex((i) => (i + 1) % acItems.length);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setAcIndex((i) => (i - 1 + acItems.length) % acItems.length);
      } else if (e.key === "Tab" || e.key === "Enter") {
        e.preventDefault();
        const item = acItems[acIndex];
        if (item) insertAutocompletion(item);
      } else if (e.key === "Escape") {
        setShowAutocomplete(false);
      }
    },
    [showAutocomplete, acItems, acIndex, insertAutocompletion]
  );

  return (
    <div className="relative">
      {/* Label */}
      <div className="flex items-center justify-between mb-1">
        <label className="text-xs text-[var(--text-muted)] font-medium">
          Condition expression
        </label>
        {value.trim() && (
          <div className="flex items-center gap-1">
            {hasErrors ? (
              <span className="flex items-center gap-0.5 text-xs text-[var(--state-error)] font-medium">
                <AlertCircle className="h-2.5 w-2.5" />
                {errors.filter((e) => e.severity === "error").length} error(s)
              </span>
            ) : hasWarnings ? (
              <span className="flex items-center gap-0.5 text-xs text-[var(--state-warning)] font-medium">
                <AlertCircle className="h-2.5 w-2.5" />
                {errors.filter((e) => e.severity === "warning").length} warning(s)
              </span>
            ) : (
              <span className="flex items-center gap-0.5 text-xs text-[var(--state-success)] font-medium">
                <Check className="h-2.5 w-2.5" />
                valid
              </span>
            )}
          </div>
        )}
      </div>

      {/* Editor container */}
      <div
        className={clsx(
          "relative rounded border overflow-hidden transition-colors",
          hasErrors
            ? "border-[var(--state-error)]/40"
            : hasWarnings
            ? "border-[var(--state-warning)]/40"
            : isFocused
            ? "border-[var(--state-warning)]/40"
            : "border-[var(--border-strong)]"
        )}
      >
        {/* Syntax-highlighted overlay */}
        <pre
          ref={preRef}
          className="absolute inset-0 pointer-events-none overflow-hidden p-2.5 text-xs font-mono leading-relaxed whitespace-pre-wrap break-words"
          aria-hidden="true"
        >
          {tokens.map((token, i) => (
            <span key={i} className={TOKEN_COLORS[token.kind]}>
              {token.text}
            </span>
          ))}
          {/* Show a cursor placeholder when empty */}
          {!value && (
            <span className="text-[var(--text-muted)]">
              results.classifier.decision == &quot;high&quot;
            </span>
          )}
        </pre>

        {/* Actual textarea (transparent text) */}
        <textarea
          ref={textareaRef}
          value={value}
          onChange={handleChange}
          onSelect={handleSelect}
          onKeyUp={handleSelect}
          onScroll={handleScroll}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setTimeout(() => setIsFocused(false), 150)}
          onKeyDown={handleKeyDown}
          readOnly={readOnly}
          placeholder=""
          spellCheck={false}
          rows={2}
          className={clsx(
            "relative w-full p-2.5 text-xs font-mono leading-relaxed resize-none focus:outline-none",
            "bg-transparent caret-[var(--text-muted)]",
            "text-transparent selection:bg-[var(--state-warning)]/20",
            readOnly && "cursor-not-allowed"
          )}
          style={{ caretColor: "var(--text-primary)" }}
        />
      </div>

      {/* Autocomplete dropdown */}
      {showAutocomplete && acItems.length > 0 && (
        <div className="absolute z-50 mt-1 w-full max-h-40 overflow-y-auto rounded-[8px] border border-[var(--border-subtle)] bg-[var(--surface-raised)] font-mono">
          {acItems.slice(0, 12).map((item, idx) => (
            <button
              key={`${item.label}-${idx}`}
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                insertAutocompletion(item);
              }}
              className={clsx(
                "w-full flex items-center gap-2 px-2.5 py-1.5 text-left transition-colors cursor-pointer",
                idx === acIndex
                  ? "bg-[var(--state-warning)]/10"
                  : "hover:bg-[var(--surface-sunken)]"
              )}
            >
              <span className="shrink-0">{item.icon}</span>
              <span className="text-xs font-medium text-[var(--text-primary)] truncate">
                {item.label}
              </span>
              <span className="text-xs text-[var(--text-muted)] truncate ml-auto">
                {item.description}
              </span>
            </button>
          ))}
        </div>
      )}

      {/* Error/Warning tooltips */}
      {errors.length > 0 && (
        <div className="mt-1.5 space-y-0.5">
          {errors.map((err, i) => (
            <div
              key={i}
              className={clsx(
                "flex items-start gap-1.5 px-2 py-1 rounded text-xs leading-tight",
                err.severity === "error"
                  ? "bg-[var(--state-error)]/10 text-[var(--state-error)] border border-[var(--state-error)]/40"
                  : "bg-[var(--state-warning)]/10 text-[var(--state-warning)] border border-[var(--state-warning)]/40"
              )}
            >
              <AlertCircle className="h-2.5 w-2.5 shrink-0 mt-0.5" />
              <span>{err.message}</span>
            </div>
          ))}
        </div>
      )}

      {/* Reference hint */}
      <p className="text-xs text-[var(--text-muted)] leading-tight mt-1">
        Use <code className="text-[var(--state-warning)]">results.nodeId.field</code> or{" "}
        <code className="text-[var(--state-warning)]">input.field</code> to reference state.{" "}
        Operators: <code className="text-[var(--state-warning)]">==</code>{" "}
        <code className="text-[var(--state-warning)]">!=</code>{" "}
        <code className="text-[var(--state-warning)]">&gt;</code>{" "}
        <code className="text-[var(--state-warning)]">&lt;</code>{" "}
        <code className="text-[var(--state-warning)]">contains</code>{" "}
        <code className="text-[var(--state-warning)]">startsWith</code>
      </p>
    </div>
  );
}
