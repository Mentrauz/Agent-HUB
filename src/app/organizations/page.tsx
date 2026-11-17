"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { clsx } from "clsx";
import { toast } from "@/stores/toastStore";
import {
  BTN_PRIMARY,
  BTN_SECONDARY,
  CARD,
  INPUT,
  LABEL,
  META,
  PageHeader,
  ROW_HOVER,
  plural,
} from "@/components/ui/surfaces";

// ────────────── Types ──────────────

interface Organization {
  id: string;
  name: string;
  slug: string;
  plan: string;
  memberCount: number;
  createdAt: string;
}

// ────────────── Component ──────────────

export default function OrganizationsPage() {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newOrgName, setNewOrgName] = useState("");
  const [creating, setCreating] = useState(false);

  // Load organizations
  const loadOrganizations = useCallback(async () => {
    try {
      const res = await fetch("/api/organizations");
      if (res.ok) {
        const data = await res.json();
        setOrganizations(data.data || []);
      }
    } catch (err) {
      console.error("Failed to load organizations:", err);
      toast.error("Error", "Failed to load organizations");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadOrganizations();
  }, [loadOrganizations]);

  // Handle create organization
  const handleCreate = useCallback(async () => {
    if (!newOrgName.trim()) {
      toast.error("Error", "Organization name is required");
      return;
    }

    setCreating(true);
    try {
      const res = await fetch("/api/organizations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newOrgName }),
      });

      if (res.ok) {
        toast.success("Organization created", `${newOrgName} has been created`);
        setNewOrgName("");
        setShowCreateModal(false);
        loadOrganizations();
      } else {
        const err = await res.json();
        throw new Error(err.error || "Failed to create organization");
      }
    } catch (err) {
      toast.error("Error", err instanceof Error ? err.message : "Failed to create organization");
    } finally {
      setCreating(false);
    }
  }, [newOrgName, loadOrganizations]);

  if (loading) {
    return (
      <div role="status" className="flex min-h-[400px] items-center justify-center font-sans text-sm text-[var(--text-muted)]">
        Loading organizations
      </div>
    );
  }

  return (
    <div className="w-full space-y-6">
      <PageHeader
        title="Organizations"
        meta="Team workspaces and their members"
        action={
          <button type="button" onClick={() => setShowCreateModal(true)} className={BTN_PRIMARY}>
            New organization
          </button>
        }
      />

      {organizations.length === 0 ? (
        <div className="space-y-4 rounded-[14px] border border-dashed border-[var(--border-strong)] p-10 text-center">
          <div className="space-y-1">
            <h2 className="font-sans text-sm font-medium text-[var(--text-primary)]">No organizations yet</h2>
            <p className="font-sans text-[13px] text-[var(--text-muted)]">
              Create one to share skills and graphs with your team
            </p>
          </div>
          <button type="button" onClick={() => setShowCreateModal(true)} className={BTN_SECONDARY}>
            New organization
          </button>
        </div>
      ) : (
        <ul className={clsx(CARD, "divide-y divide-[var(--border-subtle)] overflow-hidden")}>
          {organizations.map((org) => (
            <li key={org.id}>
              <Link
                href={`/organizations/${org.id}`}
                className={clsx(
                  ROW_HOVER,
                  "flex items-center justify-between gap-4 px-5 py-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--accent-primary)]"
                )}
              >
                <div className="min-w-0 space-y-1">
                  <div className="truncate font-sans text-sm font-medium text-[var(--text-primary)]">{org.name}</div>
                  <div className={META}>{org.slug}</div>
                </div>
                <div className={clsx(META, "flex shrink-0 items-center gap-6")}>
                  <span>{plural(org.memberCount, "member")}</span>
                  <span>{org.plan}</span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}

      {/* Create modal */}
      {showCreateModal && (
        <div
          className="fixed inset-0 z-50 flex animate-fadeIn items-center justify-center bg-black/60 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="new-org-title"
        >
          <div className="w-full max-w-md space-y-5 rounded-[16px] border border-[var(--border-subtle)] bg-[var(--surface-elevated)] p-6 shadow-[0_8px_24px_rgba(0,0,0,0.24)]">
            <h2 id="new-org-title" className="font-sans text-base font-medium text-[var(--text-primary)]">
              New organization
            </h2>

            <div className="space-y-2">
              <label htmlFor="new-org-name" className={LABEL}>
                Name
              </label>
              <input
                id="new-org-name"
                type="text"
                value={newOrgName}
                onChange={(e) => setNewOrgName(e.target.value)}
                placeholder="My team"
                className={clsx(INPUT, "w-full")}
                autoFocus
              />
            </div>

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setShowCreateModal(false);
                  setNewOrgName("");
                }}
                className={BTN_SECONDARY}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCreate}
                disabled={creating || !newOrgName.trim()}
                className={BTN_PRIMARY}
              >
                {creating ? "Creating" : "Create"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
