"use client";

import React, { useState, useEffect, useCallback } from "react";
import { clsx } from "clsx";
import { CustomRolesManager } from "@/components/organizations/CustomRolesManager";
import { toast } from "@/stores/toastStore";
import { ConfirmDialog } from "@/components/feedback/ConfirmDialog";
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
  ROW_HOVER,
  plural,
} from "@/components/ui/surfaces";

// ────────────── Types ──────────────

interface Organization {
  id: string;
  name: string;
  slug: string;
  plan: string;
  billingEmail: string | null;
  memberCount: number;
}

interface Member {
  id: string;
  userId: string;
  userName: string | null;
  userEmail: string;
  role: string;
  customRoleId?: string | null;
  joinedAt: string;
}

interface OrganizationSettingsProps {
  organizationId: string;
  onUpdate?: () => void;
}

const MODAL = "w-full max-w-md animate-fadeInUp space-y-5 rounded-[16px] border border-[var(--border-subtle)] bg-[var(--surface-elevated)] p-6 shadow-[0_8px_24px_rgba(0,0,0,0.24)]";
const SMALL_SELECT = clsx(FIELD, "h-8 cursor-pointer px-2 text-[13px]");

// ────────────── Component ──────────────

export function OrganizationSettings({
  organizationId,
  onUpdate,
}: OrganizationSettingsProps) {
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [customRoles, setCustomRoles] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("MEMBER");
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [memberToRemove, setMemberToRemove] = useState<{ userId: string; name: string } | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);

  // Load organization data
  const loadData = useCallback(async () => {
    try {
      const [orgRes, membersRes, rolesRes] = await Promise.all([
        fetch(`/api/organizations/${organizationId}`),
        fetch(`/api/organizations/${organizationId}/members`),
        fetch(`/api/organizations/${organizationId}/roles`),
      ]);

      if (orgRes.ok) {
        const orgData = await orgRes.json();
        setOrganization(orgData.data);
      }

      if (membersRes.ok) {
        const membersData = await membersRes.json();
        setMembers(membersData.data || []);
      }

      if (rolesRes.ok) {
        const rolesData = await rolesRes.json();
        setCustomRoles(rolesData.data || []);
      }
    } catch (err) {
      console.error("Failed to load organization data:", err);
      toast.error("Error", "Failed to load organization data");
    } finally {
      setLoading(false);
    }
  }, [organizationId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Handle invite member
  const handleInvite = useCallback(async () => {
    if (!inviteEmail.trim()) {
      toast.error("Error", "Email is required");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(`/api/organizations/${organizationId}/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: inviteEmail, role: inviteRole }),
      });

      if (res.ok) {
        toast.success("Invitation sent", `Invite sent to ${inviteEmail}`);
        setInviteEmail("");
        setShowInviteModal(false);
        loadData();
        onUpdate?.();
      } else {
        const err = await res.json();
        throw new Error(err.error || "Failed to send invitation");
      }
    } catch (err) {
      toast.error("Error", err instanceof Error ? err.message : "Failed to send invitation");
    } finally {
      setSaving(false);
    }
  }, [organizationId, inviteEmail, inviteRole, loadData, onUpdate]);

  // Handle remove member
  const handleRemoveMember = useCallback(async (userId: string) => {
    try {
      const res = await fetch(`/api/organizations/${organizationId}/members/${userId}`, {
        method: "DELETE",
      });

      if (res.ok) {
        toast.success("Member removed", "Member has been removed from the organization");
        setMemberToRemove(null);
        loadData();
        onUpdate?.();
      } else {
        const err = await res.json();
        throw new Error(err.error || "Failed to remove member");
      }
    } catch (err) {
      toast.error("Error", err instanceof Error ? err.message : "Failed to remove member");
    }
  }, [organizationId, loadData, onUpdate]);

  // Handle update role
  const handleUpdateRole = useCallback(async (userId: string, newRole: string) => {
    try {
      const res = await fetch(`/api/organizations/${organizationId}/members/${userId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: newRole }),
      });

      if (res.ok) {
        toast.success("Role updated", "Member role has been updated");
        loadData();
        onUpdate?.();
      } else {
        const err = await res.json();
        throw new Error(err.error || "Failed to update role");
      }
    } catch (err) {
      toast.error("Error", err instanceof Error ? err.message : "Failed to update role");
    }
  }, [organizationId, loadData, onUpdate]);

  // Handle assign custom role to member
  const handleAssignCustomRole = useCallback(async (userId: string, roleId: string) => {
    try {
      if (!roleId) {
        // Remove custom role
        const res = await fetch(
          `/api/organizations/${organizationId}/members/${userId}/role`,
          { method: "DELETE" }
        );
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || "Failed to remove custom role");
        }
      } else {
        const res = await fetch(
          `/api/organizations/${organizationId}/members/${userId}/role`,
          {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ roleId }),
          }
        );
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || "Failed to assign custom role");
        }
      }
      toast.success("Role updated", "Member's custom role has been updated");
      loadData();
      onUpdate?.();
    } catch (err) {
      toast.error("Error", err instanceof Error ? err.message : "Failed to update role");
    }
  }, [organizationId, loadData, onUpdate]);

  // Handle delete organization
  const handleDeleteOrganization = useCallback(async () => {
    if (deleteConfirmText !== organization?.name) {
      toast.error("Error", "Type the organization name to confirm deletion");
      return;
    }

    setDeleting(true);
    try {
      const res = await fetch(`/api/organizations/${organizationId}`, {
        method: "DELETE",
      });

      if (res.ok) {
        toast.success("Organization deleted", "The organization has been permanently removed.");
        onUpdate?.();
        window.location.href = "/organizations";
      } else {
        const err = await res.json();
        throw new Error(err.error || "Failed to delete organization");
      }
    } catch (err) {
      toast.error("Delete failed", err instanceof Error ? err.message : "Failed to delete organization");
    } finally {
      setDeleting(false);
      setShowDeleteConfirm(false);
      setDeleteConfirmText("");
    }
  }, [organizationId, organization?.name, deleteConfirmText, onUpdate]);

  if (loading) {
    return (
      <div role="status" className="py-12 text-center font-sans text-sm text-[var(--text-muted)]">
        Loading
      </div>
    );
  }

  if (!organization) {
    return <div className="py-12 text-center font-sans text-sm text-[var(--text-muted)]">Organization not found</div>;
  }

  const closeDelete = () => {
    setShowDeleteConfirm(false);
    setDeleteConfirmText("");
  };

  return (
    <div className="space-y-6">
      {/* Members */}
      <section className={CARD}>
        <div className={CARD_HEAD}>
          <div className="flex items-baseline gap-3">
            <h2 className={CARD_TITLE}>Members</h2>
            <span className={META}>{members.length}</span>
          </div>
          <button type="button" onClick={() => setShowInviteModal(true)} className={BTN_SECONDARY_SM}>
            Invite
          </button>
        </div>

        <ul className="divide-y divide-[var(--border-subtle)]">
          {members.map((member) => {
            const displayName = member.userName && member.userName !== "string" ? member.userName : member.userEmail;
            return (
              <li
                key={member.id}
                className={clsx(ROW_HOVER, "flex flex-col justify-between gap-3 px-5 py-3 lg:flex-row lg:items-center")}
              >
                <div className="min-w-0 space-y-0.5">
                  <div className="truncate font-sans text-sm text-[var(--text-primary)]">{displayName}</div>
                  {member.userName && member.userName !== displayName && (
                    <div className={clsx(META, "truncate")}>{member.userEmail}</div>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <select
                    value={member.role}
                    onChange={(e) => handleUpdateRole(member.userId, e.target.value)}
                    aria-label={`Role for ${displayName}`}
                    className={SMALL_SELECT}
                  >
                    <option value="VIEWER">Viewer</option>
                    <option value="MEMBER">Member</option>
                    <option value="ADMIN">Admin</option>
                    <option value="OWNER">Owner</option>
                  </select>
                  <select
                    value={member.customRoleId || ""}
                    onChange={(e) => handleAssignCustomRole(member.userId, e.target.value)}
                    aria-label={`Custom role for ${displayName}`}
                    title="Custom roles add permissions on top of the base role"
                    className={SMALL_SELECT}
                  >
                    <option value="">No custom role</option>
                    {customRoles.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => setMemberToRemove({ userId: member.userId, name: member.userName || member.userEmail })}
                    className="h-8 cursor-pointer rounded-[8px] px-2 font-sans text-[13px] text-[var(--text-muted)] transition-colors hover:text-[var(--state-error)]"
                  >
                    Remove
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      {/* Invite modal */}
      {showInviteModal && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60" onClick={() => setShowInviteModal(false)} aria-hidden="true" />
          <div role="dialog" aria-modal="true" aria-labelledby="invite-title" className={clsx("relative", MODAL)}>
            <h3 id="invite-title" className="font-sans text-base font-medium text-[var(--text-primary)]">
              Invite a member
            </h3>

            <div className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="invite-email" className={LABEL}>
                  Email
                </label>
                <input
                  id="invite-email"
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="colleague@example.com"
                  className={clsx(INPUT, "w-full")}
                  autoFocus
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="invite-role" className={LABEL}>
                  Role
                </label>
                <select
                  id="invite-role"
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value)}
                  className={clsx(FIELD, "h-9 w-full cursor-pointer px-3")}
                >
                  <option value="VIEWER">Viewer: can view all resources</option>
                  <option value="MEMBER">Member: can create and edit their own resources</option>
                  <option value="ADMIN">Admin: can manage members and all resources</option>
                </select>
              </div>
            </div>

            <div className="flex flex-col-reverse justify-end gap-2 sm:flex-row">
              <button type="button" onClick={() => setShowInviteModal(false)} className={clsx(BTN_SECONDARY, "w-full sm:w-auto")}>
                Cancel
              </button>
              <button
                type="button"
                onClick={handleInvite}
                disabled={saving || !inviteEmail.trim()}
                className={clsx(BTN_PRIMARY, "w-full sm:w-auto")}
              >
                {saving ? "Sending" : "Send invite"}
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        isOpen={memberToRemove !== null}
        title="Remove member"
        description={`Remove ${memberToRemove?.name || "this member"} from the organization? They will lose access to all of its resources.`}
        confirmLabel="Remove"
        variant="danger"
        onConfirm={() => memberToRemove && handleRemoveMember(memberToRemove.userId)}
        onClose={() => setMemberToRemove(null)}
      />

      {/* Custom roles */}
      <section className={CARD}>
        <CustomRolesManager
          organizationId={organizationId}
          onUpdate={() => {
            loadData();
            onUpdate?.();
          }}
        />
      </section>

      {/* Delete organization */}
      <section className={clsx(CARD, "relative space-y-3 px-5 py-5")}>
        <span aria-hidden="true" className="absolute bottom-5 left-0 top-5 w-0.5 rounded-full bg-[var(--state-error)]" />
        <h2 className={CARD_TITLE}>Delete organization</h2>
        <p className="max-w-2xl font-sans text-sm leading-6 text-[var(--text-secondary)]">
          This is permanent. All members lose access. Skills, executions and other resources are detached from the
          organization, not deleted.
        </p>
        <button
          type="button"
          onClick={() => setShowDeleteConfirm(true)}
          className={clsx(BTN_SECONDARY, "text-[var(--state-error)]")}
        >
          Delete organization
        </button>
      </section>

      {showDeleteConfirm && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60" onClick={closeDelete} aria-hidden="true" />
          <div role="dialog" aria-modal="true" aria-labelledby="delete-org-title" className={clsx("relative", MODAL)}>
            <h3 id="delete-org-title" className="font-sans text-base font-medium text-[var(--text-primary)]">
              Delete {organization.name}
            </h3>

            <ul className="list-disc space-y-1 pl-5 font-sans text-[13px] leading-5 text-[var(--text-secondary)]">
              <li>{plural(organization.memberCount, "member")} will lose access</li>
              <li>Skills and executions are kept as personal resources</li>
              <li>Custom roles, API keys and invitations are deleted</li>
              <li>The audit log for this organization is removed</li>
            </ul>

            <div className="space-y-2">
              <label htmlFor="delete-confirm" className={LABEL}>
                Type <span className="font-mono text-[var(--text-primary)]">{organization.name}</span> to confirm
              </label>
              <input
                id="delete-confirm"
                type="text"
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                placeholder={organization.name}
                className={clsx(INPUT, "w-full")}
              />
            </div>

            <div className="flex flex-col-reverse justify-end gap-2 sm:flex-row">
              <button type="button" onClick={closeDelete} className={clsx(BTN_SECONDARY, "w-full sm:w-auto")}>
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteOrganization}
                disabled={deleting || deleteConfirmText !== organization.name}
                className={clsx(BTN_SECONDARY, "w-full text-[var(--state-error)] sm:w-auto")}
              >
                {deleting ? "Deleting" : "Delete permanently"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
