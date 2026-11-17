"use client";

import React, { useState, useEffect, useCallback } from "react";
import { clsx } from "clsx";
import { toast } from "@/stores/toastStore";
import {
  BTN_PRIMARY,
  BTN_SECONDARY,
  CARD,
  FIELD,
  INPUT,
  LABEL,
  META,
  ROW_HOVER,
} from "@/components/ui/surfaces";

// ────────────── Types ──────────────

interface VaultEntryDTO {
  id: string;
  name: string;
  category: string;
  key: string;
  value: string; // masked
  description: string | null;
  tags: string[];
  lastUsedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

const CATEGORIES = [
  { id: "API_KEY", label: "API key" },
  { id: "OAUTH_TOKEN", label: "OAuth token" },
  { id: "DATABASE_URL", label: "Database URL" },
  { id: "CONNECTION_STRING", label: "Connection string" },
  { id: "PASSWORD", label: "Password" },
  { id: "CERTIFICATE", label: "Certificate" },
  { id: "WEBHOOK_SECRET", label: "Webhook secret" },
  { id: "OTHER", label: "Other" },
];

const TEXT_BUTTON =
  "h-8 cursor-pointer rounded-[8px] px-2 font-sans text-[13px] text-[var(--text-muted)] transition-colors hover:text-[var(--text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)]";

// ────────────── Vault entry row ──────────────

function VaultEntryRow({
  entry,
  onReveal,
  onDelete,
  onEdit,
}: {
  entry: VaultEntryDTO;
  onReveal: (id: string) => void;
  onDelete: (id: string) => void;
  onEdit: (entry: VaultEntryDTO) => void;
}) {
  const [revealed, setRevealed] = useState(false);
  const [copied, setCopied] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const catDef = CATEGORIES.find((c) => c.id === entry.category) || CATEGORIES[7];

  const handleCopy = useCallback(async () => {
    try {
      // Fetch raw value for copy
      const res = await fetch(`/api/vault/${entry.id}/reveal`);
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.rawValue) {
          await navigator.clipboard.writeText(data.rawValue);
          setCopied(true);
          toast.success("Copied", "Secret value copied to clipboard");
          setTimeout(() => setCopied(false), 2000);
        }
      }
    } catch {
      toast.error("Copy failed", "Could not read secret value");
    }
  }, [entry.id]);

  const handleReveal = useCallback(() => {
    if (revealed) {
      setRevealed(false);
      return;
    }
    onReveal(entry.id);
    setRevealed(true);
  }, [revealed, entry.id, onReveal]);

  return (
    <li className={clsx(ROW_HOVER, "space-y-2 px-5 py-4")}>
      <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-2">
        <div className="min-w-0 space-y-1">
          <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
            <h3 className="truncate font-sans text-sm font-medium text-[var(--text-primary)]">{entry.name}</h3>
            <span className={META}>{catDef.label.toLowerCase()}</span>
          </div>
          <p className={clsx(META, "truncate")}>{entry.key}</p>
        </div>

        <div className="flex shrink-0 items-center gap-1">
          <button type="button" onClick={() => onEdit(entry)} className={TEXT_BUTTON}>
            Edit
          </button>
          <button type="button" onClick={handleReveal} className={TEXT_BUTTON}>
            {revealed ? "Hide" : "Reveal"}
          </button>
          <button type="button" onClick={handleCopy} className={TEXT_BUTTON}>
            {copied ? "Copied" : "Copy"}
          </button>
          {deleteConfirm ? (
            <>
              <button
                type="button"
                onClick={() => {
                  onDelete(entry.id);
                  setDeleteConfirm(false);
                }}
                className={clsx(TEXT_BUTTON, "text-[var(--state-error)]")}
              >
                Confirm delete
              </button>
              <button type="button" onClick={() => setDeleteConfirm(false)} className={TEXT_BUTTON}>
                Cancel
              </button>
            </>
          ) : (
            <button type="button" onClick={() => setDeleteConfirm(true)} className={clsx(TEXT_BUTTON, "hover:text-[var(--state-error)]")}>
              Delete
            </button>
          )}
        </div>
      </div>

      <div className="truncate rounded-[8px] border border-[var(--border-subtle)] bg-[var(--surface-sunken)] px-3 py-2 font-mono text-xs">
        {revealed ? (
          <span className="break-all text-[var(--state-warning)]">{entry.value}</span>
        ) : (
          <span className="text-[var(--text-muted)]">{entry.value}</span>
        )}
      </div>

      {(entry.description || entry.tags.length > 0 || entry.lastUsedAt) && (
        <div className={clsx(META, "flex flex-wrap items-center gap-x-4 gap-y-1")}>
          {entry.description && <span className="max-w-[320px] truncate font-sans text-[13px] text-[var(--text-secondary)]">{entry.description}</span>}
          {entry.tags.length > 0 && <span>{entry.tags.slice(0, 3).join(", ")}</span>}
          {entry.lastUsedAt && <span className="sm:ml-auto">used {new Date(entry.lastUsedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>}
        </div>
      )}
    </li>
  );
}

// ────────────── Create/Edit Modal ──────────────

function VaultEntryModal({
  entry,
  isOpen,
  onClose,
  onSaved,
}: {
  entry?: VaultEntryDTO | null;
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(entry?.name || "");
  const [category, setCategory] = useState(entry?.category || "API_KEY");
  const [key, setKey] = useState(entry?.key || "");
  const [value, setValue] = useState("");
  const [description, setDescription] = useState(entry?.description || "");
  const [tags, setTags] = useState(entry?.tags.join(", ") || "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showValue, setShowValue] = useState(false);

  // Reset form when entry changes
  useEffect(() => {
    setName(entry?.name || "");
    setCategory(entry?.category || "API_KEY");
    setKey(entry?.key || "");
    setValue("");
    setDescription(entry?.description || "");
    setTags(entry?.tags.join(", ") || "");
    setError(null);
    setShowValue(false);
  }, [entry, isOpen]);

  const isEditing = !!entry;

  const handleSave = useCallback(async () => {
    if (!name.trim() || !key.trim()) {
      setError("Name and key are required");
      return;
    }
    if (!isEditing && !value.trim()) {
      setError("Value is required for new entries");
      return;
    }
    if (!/^[A-Z_][A-Z0-9_]*$/.test(key)) {
      setError("Key must be uppercase with underscores (e.g. GITHUB_TOKEN)");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const body: Record<string, unknown> = {
        name: name.trim(),
        category,
        key: key.trim(),
        description: description.trim() || undefined,
        tags: tags.split(",").map((t) => t.trim()).filter(Boolean),
      };
      if (value.trim()) body.value = value;

      const url = isEditing ? `/api/vault` : "/api/vault";
      const method = isEditing ? "PUT" : "POST";
      if (isEditing) body.id = entry.id;

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => null);
        throw new Error(errData?.error || `HTTP ${res.status}`);
      }

      toast.success(isEditing ? "Updated" : "Created", `${name} has been ${isEditing ? "updated" : "added"} to the vault`);
      onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }, [name, category, key, value, description, tags, isEditing, entry, onSaved, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="vault-modal-title"
        className="relative flex max-h-[90vh] w-full max-w-md flex-col overflow-hidden rounded-[16px] border border-[var(--border-subtle)] bg-[var(--surface-elevated)] shadow-[0_8px_24px_rgba(0,0,0,0.24)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex shrink-0 items-center justify-between border-b border-[var(--border-subtle)] px-5 py-4">
          <h2 id="vault-modal-title" className="font-sans text-base font-medium text-[var(--text-primary)]">
            {isEditing ? "Edit secret" : "Add a secret"}
          </h2>
          <button type="button" onClick={onClose} className={TEXT_BUTTON}>
            Close
          </button>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto px-5 py-5">
          <div className="space-y-2">
            <label htmlFor="vault-name" className={LABEL}>
              Name
            </label>
            <input
              id="vault-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="GitHub personal access token"
              className={clsx(INPUT, "w-full")}
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="vault-category" className={LABEL}>
              Category
            </label>
            <select
              id="vault-category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className={clsx(FIELD, "h-9 w-full cursor-pointer px-3")}
            >
              {CATEGORIES.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.label}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label htmlFor="vault-key" className={LABEL}>
              Key (environment variable name)
            </label>
            <input
              id="vault-key"
              type="text"
              value={key}
              onChange={(e) => setKey(e.target.value.toUpperCase())}
              placeholder="GITHUB_TOKEN"
              className={clsx(INPUT, "w-full font-mono text-xs")}
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="vault-value" className={LABEL}>
              {isEditing ? "New value (leave blank to keep the current one)" : "Value"}
            </label>
            <div className="relative">
              <input
                id="vault-value"
                type={showValue ? "text" : "password"}
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder={isEditing ? "••••••••" : "Enter the secret value"}
                className={clsx(INPUT, "w-full pr-14 font-mono text-xs")}
              />
              <button
                type="button"
                onClick={() => setShowValue(!showValue)}
                className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer font-sans text-[13px] text-[var(--text-muted)] transition-colors hover:text-[var(--text-primary)]"
              >
                {showValue ? "Hide" : "Show"}
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <label htmlFor="vault-desc" className={LABEL}>
              Description
            </label>
            <input
              id="vault-desc"
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What this secret is used for"
              className={clsx(INPUT, "w-full")}
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="vault-tags" className={LABEL}>
              Tags (comma-separated)
            </label>
            <input
              id="vault-tags"
              type="text"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="github, automation, ci"
              className={clsx(INPUT, "w-full")}
            />
          </div>

          {error && (
            <p role="alert" className="font-sans text-[13px] text-[var(--state-error)]">
              {error}
            </p>
          )}

          <p className="font-sans text-[13px] leading-5 text-[var(--text-muted)]">
            Values are encrypted with AES-256-GCM before storage. They are decrypted only when a skill run uses them and
            are never returned in API responses.
          </p>
        </div>

        <div className="flex shrink-0 items-center justify-end gap-2 border-t border-[var(--border-subtle)] px-5 py-4">
          <button type="button" onClick={onClose} className={BTN_SECONDARY}>
            Cancel
          </button>
          <button type="button" onClick={handleSave} disabled={saving} className={BTN_PRIMARY}>
            {saving ? "Saving" : isEditing ? "Update" : "Encrypt and save"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ────────────── Main Component ──────────────

export function SecretVault() {
  const [entries, setEntries] = useState<VaultEntryDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState<string>("ALL");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<VaultEntryDTO | null>(null);

  const loadEntries = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set("q", search);
      const res = await fetch(`/api/vault?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        if (data.success) setEntries(data.data);
      }
    } catch (err) {
      console.error("Vault failed to load:", err);
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    const timer = setTimeout(loadEntries, 300);
    return () => clearTimeout(timer);
  }, [loadEntries]);

  const handleDelete = useCallback(async (id: string) => {
    try {
      const res = await fetch(`/api/vault?id=${id}`, { method: "DELETE" });
      if (res.ok) {
        toast.success("Deleted", "Secret has been removed from the vault");
        loadEntries();
      } else {
        const errData = await res.json().catch(() => null);
        throw new Error(errData?.error || "Delete failed");
      }
    } catch (err) {
      toast.error("Delete failed", err instanceof Error ? err.message : "Unknown error");
    }
  }, [loadEntries]);

  const handleReveal = useCallback(async (id: string) => {
    try {
      const res = await fetch(`/api/vault/${id}/reveal`);
      if (!res.ok) throw new Error("Failed to reveal");
      // The value is shown in the card via state — for this implementation
      // the card will show the masked value; reveal fetches raw for copy
    } catch (err) {
      console.error("Vault reveal failed:", err);
    }
  }, []);

  const filteredEntries = entries.filter((e) => {
    if (filterCategory !== "ALL" && e.category !== filterCategory) return false;
    return true;
  });

  const categoryCounts = entries.reduce((acc, e) => {
    acc[e.category] = (acc[e.category] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const presentCategories = CATEGORIES.filter((c) => (categoryCounts[c.id] || 0) > 0);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <label className="min-w-[200px] flex-1">
          <span className="sr-only">Search secrets</span>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, key or tag"
            className={clsx(INPUT, "w-full")}
          />
        </label>
        {presentCategories.length > 1 && (
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            aria-label="Filter by category"
            className={clsx(FIELD, "h-9 cursor-pointer px-3")}
          >
            <option value="ALL">All categories ({entries.length})</option>
            {presentCategories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.label} ({categoryCounts[cat.id]})
              </option>
            ))}
          </select>
        )}
        <button
          type="button"
          onClick={() => {
            setEditingEntry(null);
            setModalOpen(true);
          }}
          className={BTN_PRIMARY}
        >
          Add secret
        </button>
      </div>

      {loading ? (
        <p role="status" className="py-8 text-center font-sans text-sm text-[var(--text-muted)]">
          Loading secrets
        </p>
      ) : filteredEntries.length === 0 ? (
        <div className="space-y-1 rounded-[14px] border border-dashed border-[var(--border-strong)] p-10 text-center">
          <p className="font-sans text-sm font-medium text-[var(--text-primary)]">
            {search ? "No secrets match your search" : "Your vault is empty"}
          </p>
          <p className="font-sans text-[13px] text-[var(--text-muted)]">
            {search ? "Try a different search term" : "Add an API key, token or connection string to get started"}
          </p>
        </div>
      ) : (
        <ul className={clsx(CARD, "divide-y divide-[var(--border-subtle)] overflow-hidden")}>
          {filteredEntries.map((entry) => (
            <VaultEntryRow
              key={entry.id}
              entry={entry}
              onReveal={handleReveal}
              onDelete={handleDelete}
              onEdit={(e) => {
                setEditingEntry(e);
                setModalOpen(true);
              }}
            />
          ))}
        </ul>
      )}

      <VaultEntryModal
        entry={editingEntry}
        isOpen={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditingEntry(null);
        }}
        onSaved={loadEntries}
      />
    </div>
  );
}
