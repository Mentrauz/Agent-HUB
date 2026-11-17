"use client";

import React, { useState, useEffect, useCallback } from "react";
import { clsx } from "clsx";
import {
  BTN_PRIMARY,
  BTN_SECONDARY,
  BTN_SECONDARY_SM,
  CARD_HEAD,
  CARD_TITLE,
  FIELD,
  INPUT,
  LABEL,
  META,
  ROW_HOVER,
  plural,
} from "@/components/ui/surfaces";
import { toast } from "@/stores/toastStore";
import { ConfirmDialog } from "@/components/feedback/ConfirmDialog";

// ────────────── Types ──────────────

interface CustomRole {
  id: string;
  name: string;
  description: string | null;
  permissions: string[];
  isSystem: boolean;
  memberCount: number;
}

// ────────────── Permission Categories ──────────────

const PERMISSION_GROUPS = [
  {
    label: "Organization",
    permissions: ["org:manage"],
  },
  {
    label: "Members",
    permissions: ["members:manage", "members:read"],
  },
  {
    label: "Skills",
    permissions: [
      "skills:create",
      "skills:read",
      "skills:edit",
      "skills:edit:own",
      "skills:delete",
      "skills:delete:own",
      "skills:execute",
      "skills:publish",
    ],
  },
  {
    label: "Executions",
    permissions: [
      "executions:create",
      "executions:read",
      "executions:read:own",
      "executions:cancel",
      "executions:cancel:own",
    ],
  },
  {
    label: "MCP Servers",
    permissions: ["mcp:manage", "mcp:read", "mcp:create", "mcp:delete"],
  },
  {
    label: "Vault",
    permissions: [
      "vault:manage",
      "vault:create",
      "vault:read",
      "vault:read:own",
      "vault:delete",
      "vault:delete:own",
    ],
  },
  {
    label: "Audit",
    permissions: ["audit:view", "audit:read"],
  },
  {
    label: "API Keys",
    permissions: ["api_keys:manage", "api_keys:read"],
  },
  {
    label: "Roles",
    permissions: ["roles:manage", "roles:read"],
  },
];

// Quick presets
const ROLE_PRESETS: { name: string; description: string; permissions: string[] }[] = [
  {
    name: "Developer",
    description: "Can create, edit, and execute skills and MCP servers",
    permissions: [
      "skills:create",
      "skills:read",
      "skills:edit",
      "skills:execute",
      "mcp:read",
      "mcp:create",
      "executions:create",
      "executions:read",
      "vault:create",
      "vault:read:own",
    ],
  },
  {
    name: "Auditor",
    description: "Read-only access to all resources plus audit logs",
    permissions: [
      "skills:read",
      "executions:read",
      "mcp:read",
      "vault:read",
      "audit:view",
      "audit:read",
      "members:read",
      "roles:read",
    ],
  },
  {
    name: "Ops Manager",
    description: "Can manage members, executions, and MCP servers",
    permissions: [
      "members:manage",
      "members:read",
      "skills:read",
      "skills:execute",
      "executions:create",
      "executions:read",
      "executions:cancel",
      "mcp:manage",
      "mcp:read",
      "mcp:create",
      "mcp:delete",
    ],
  },
];

// ────────────── Component ──────────────

interface CustomRolesManagerProps {
  organizationId: string;
  onUpdate?: () => void;
}

export function CustomRolesManager({
  organizationId,
  onUpdate,
}: CustomRolesManagerProps) {
  const [roles, setRoles] = useState<CustomRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingRole, setEditingRole] = useState<CustomRole | null>(null);
  const [deletingRole, setDeletingRole] = useState<CustomRole | null>(null);
  const [saving, setSaving] = useState(false);

  // Form state
  const [formName, setFormName] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formPermissions, setFormPermissions] = useState<string[]>([]);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(
    new Set(PERMISSION_GROUPS.map((g) => g.label))
  );
  const [permissionSearch, setPermissionSearch] = useState("");

  // Load roles
  const loadRoles = useCallback(async () => {
    try {
      const res = await fetch(`/api/organizations/${organizationId}/roles`);
      if (res.ok) {
        const data = await res.json();
        setRoles(data.data || []);
      }
    } catch {
      toast.error("Error", "Failed to load custom roles");
    } finally {
      setLoading(false);
    }
  }, [organizationId]);

  useEffect(() => {
    loadRoles();
  }, [loadRoles]);

  // Open create modal
  const openCreate = (preset?: (typeof ROLE_PRESETS)[number]) => {
    setEditingRole(null);
    setFormName(preset?.name ?? "");
    setFormDescription(preset?.description ?? "");
    setFormPermissions(preset?.permissions ?? []);
    setShowCreateModal(true);
  };

  // Open edit modal
  const openEdit = (role: CustomRole) => {
    setEditingRole(role);
    setFormName(role.name);
    setFormDescription(role.description ?? "");
    setFormPermissions([...role.permissions]);
    setShowCreateModal(true);
  };

  // Toggle permission
  const togglePermission = (perm: string) => {
    setFormPermissions((prev) =>
      prev.includes(perm) ? prev.filter((p) => p !== perm) : [...prev, perm]
    );
  };

  // Toggle group (all perms in group)
  const toggleGroup = (groupPerms: string[]) => {
    setFormPermissions((prev) => {
      const allSelected = groupPerms.every((p) => prev.includes(p));
      if (allSelected) {
        return prev.filter((p) => !groupPerms.includes(p));
      }
      return [...new Set([...prev, ...groupPerms])];
    });
  };

  // Save role (create or update)
  const handleSave = async () => {
    if (!formName.trim()) {
      toast.error("Error", "Role name is required");
      return;
    }
    if (formPermissions.length === 0) {
      toast.error("Error", "Select at least one permission");
      return;
    }

    setSaving(true);
    try {
      const isEdit = !!editingRole;
      const url = isEdit
        ? `/api/organizations/${organizationId}/roles/${editingRole!.id}`
        : `/api/organizations/${organizationId}/roles`;
      const method = isEdit ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formName.trim(),
          description: formDescription.trim() || undefined,
          permissions: formPermissions,
        }),
      });

      if (res.ok) {
        toast.success(
          isEdit ? "Role updated" : "Role created",
          `"${formName.trim()}" has been ${isEdit ? "updated" : "created"}.`
        );
        setShowCreateModal(false);
        loadRoles();
        onUpdate?.();
      } else {
        const err = await res.json();
        throw new Error(err.error || "Failed to save role");
      }
    } catch (err) {
      toast.error(
        "Error",
        err instanceof Error ? err.message : "Failed to save role"
      );
    } finally {
      setSaving(false);
    }
  };

  // Delete role
  const handleDelete = async () => {
    if (!deletingRole) return;

    try {
      const res = await fetch(
        `/api/organizations/${organizationId}/roles/${deletingRole.id}`,
        { method: "DELETE" }
      );

      if (res.ok) {
        toast.success("Role deleted", `"${deletingRole.name}" has been removed.`);
        setDeletingRole(null);
        loadRoles();
        onUpdate?.();
      } else {
        const err = await res.json();
        throw new Error(err.error || "Failed to delete role");
      }
    } catch (err) {
      toast.error(
        "Delete failed",
        err instanceof Error ? err.message : "Failed to delete role"
      );
    }
  };

  // Toggle group expansion
  const toggleGroupExpand = (label: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(label)) next.delete(label);
      else next.add(label);
      return next;
    });
  };

  // Filter permissions by search
  const filteredGroups = PERMISSION_GROUPS.map((group) => ({
    ...group,
    permissions: group.permissions.filter(
      (p) =>
        !permissionSearch ||
        p.toLowerCase().includes(permissionSearch.toLowerCase())
    ),
  })).filter((group) => group.permissions.length > 0);

  if (loading) {
    return (
      <div role="status" className="px-5 py-8 text-center font-sans text-sm text-[var(--text-muted)]">
        Loading roles
      </div>
    );
  }

  return (
    <div>
      <div className={CARD_HEAD}>
        <div className="flex items-baseline gap-3">
          <h2 className={CARD_TITLE}>Custom roles</h2>
          <span className={META}>{roles.length}</span>
        </div>
        <button type="button" onClick={() => openCreate()} className={BTN_SECONDARY_SM}>
          New role
        </button>
      </div>

      {/* Presets */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-b border-[var(--border-subtle)] px-5 py-3 font-sans text-[13px] text-[var(--text-muted)]">
        <span>Start from</span>
        {ROLE_PRESETS.map((preset) => (
          <button
            key={preset.name}
            type="button"
            onClick={() => openCreate(preset)}
            title={preset.description}
            className="cursor-pointer text-[var(--text-secondary)] underline decoration-[var(--border-strong)] underline-offset-4 transition-colors hover:text-[var(--text-primary)]"
          >
            {preset.name}
          </button>
        ))}
      </div>

      {/* Roles list */}
      {roles.length === 0 ? (
        <p className="px-5 py-8 text-center font-sans text-sm text-[var(--text-muted)]">
          No custom roles yet. Create one to define finer permissions.
        </p>
      ) : (
        <ul className="divide-y divide-[var(--border-subtle)]">
          {roles.map((role) => (
            <li key={role.id} className={clsx(ROW_HOVER, "flex items-start justify-between gap-4 px-5 py-4")}>
              <div className="min-w-0 space-y-2">
                <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
                  <span className="font-sans text-sm font-medium text-[var(--text-primary)]">{role.name}</span>
                  {role.isSystem && <span className={META}>system</span>}
                  <span className={META}>{plural(role.memberCount, "member")}</span>
                </div>
                {role.description && (
                  <p className="font-sans text-[13px] leading-5 text-[var(--text-secondary)]">{role.description}</p>
                )}
                <p className="font-mono text-xs leading-5 text-[var(--text-muted)]">
                  {role.permissions.slice(0, 6).join(" · ")}
                  {role.permissions.length > 6 && ` · +${role.permissions.length - 6} more`}
                </p>
              </div>
              {!role.isSystem && (
                <div className="flex shrink-0 items-center gap-2">
                  <button type="button" onClick={() => openEdit(role)} className={BTN_SECONDARY_SM}>
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeletingRole(role)}
                    className="h-8 cursor-pointer rounded-[8px] px-2 font-sans text-[13px] text-[var(--text-muted)] transition-colors hover:text-[var(--state-error)]"
                  >
                    Delete
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      {/* Create / edit modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60" onClick={() => setShowCreateModal(false)} aria-hidden="true" />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="role-modal-title"
            className="relative flex max-h-[85vh] w-full max-w-lg animate-fadeInUp flex-col overflow-hidden rounded-[16px] border border-[var(--border-subtle)] bg-[var(--surface-elevated)] shadow-[0_8px_24px_rgba(0,0,0,0.24)]"
          >
            <div className="flex shrink-0 items-center justify-between border-b border-[var(--border-subtle)] px-5 py-4">
              <h3 id="role-modal-title" className="font-sans text-base font-medium text-[var(--text-primary)]">
                {editingRole ? "Edit role" : "New role"}
              </h3>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="h-8 cursor-pointer rounded-[8px] px-2 font-sans text-[13px] text-[var(--text-muted)] transition-colors hover:text-[var(--text-primary)]"
              >
                Close
              </button>
            </div>

            <div className="flex-1 space-y-5 overflow-y-auto px-5 py-5">
              <div className="space-y-2">
                <label htmlFor="role-name" className={LABEL}>
                  Name
                </label>
                <input
                  id="role-name"
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="Deploy manager"
                  maxLength={50}
                  className={clsx(INPUT, "w-full")}
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="role-desc" className={LABEL}>
                  Description (optional)
                </label>
                <input
                  id="role-desc"
                  type="text"
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="What can holders of this role do?"
                  maxLength={500}
                  className={clsx(INPUT, "w-full")}
                />
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <label htmlFor="role-search" className={LABEL}>
                    Permissions
                  </label>
                  <span className={META}>{formPermissions.length} selected</span>
                </div>
                <input
                  id="role-search"
                  type="text"
                  value={permissionSearch}
                  onChange={(e) => setPermissionSearch(e.target.value)}
                  placeholder="Filter permissions"
                  className={clsx(FIELD, "h-8 w-full px-3 text-[13px]")}
                />

                <div className="divide-y divide-[var(--border-subtle)] rounded-[10px] border border-[var(--border-subtle)]">
                  {filteredGroups.map((group) => {
                    const allSelected = group.permissions.every((p) => formPermissions.includes(p));
                    const someSelected = group.permissions.some((p) => formPermissions.includes(p));
                    const isExpanded = expandedGroups.has(group.label);
                    const selectedCount = group.permissions.filter((p) => formPermissions.includes(p)).length;

                    return (
                      <div key={group.label}>
                        <div className="flex items-center gap-3 px-3 py-2">
                          <input
                            type="checkbox"
                            aria-label={`Select all ${group.label} permissions`}
                            checked={allSelected}
                            ref={(el) => {
                              if (el) el.indeterminate = !allSelected && someSelected;
                            }}
                            onChange={() => toggleGroup(group.permissions)}
                            className="h-4 w-4 accent-[var(--accent-primary)]"
                          />
                          <button
                            type="button"
                            onClick={() => toggleGroupExpand(group.label)}
                            aria-expanded={isExpanded}
                            className="flex flex-1 cursor-pointer items-baseline justify-between text-left"
                          >
                            <span className="font-sans text-sm text-[var(--text-primary)]">{group.label}</span>
                            <span className={META}>
                              {selectedCount}/{group.permissions.length}
                            </span>
                          </button>
                        </div>

                        {isExpanded && (
                          <div className="space-y-1 border-t border-[var(--border-subtle)] bg-[var(--surface-sunken)] px-3 py-2 pl-10">
                            {group.permissions.map((perm) => (
                              <label key={perm} className="flex cursor-pointer items-center gap-2 py-0.5">
                                <input
                                  type="checkbox"
                                  checked={formPermissions.includes(perm)}
                                  onChange={() => togglePermission(perm)}
                                  className="h-3.5 w-3.5 accent-[var(--accent-primary)]"
                                />
                                <span className="font-mono text-xs text-[var(--text-secondary)]">{perm}</span>
                              </label>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="flex shrink-0 items-center justify-end gap-2 border-t border-[var(--border-subtle)] px-5 py-4">
              <button type="button" onClick={() => setShowCreateModal(false)} className={BTN_SECONDARY}>
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={saving || !formName.trim() || formPermissions.length === 0}
                className={BTN_PRIMARY}
              >
                {saving ? "Saving" : editingRole ? "Update role" : "Create role"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirm */}
      <ConfirmDialog
        isOpen={deletingRole !== null}
        title="Delete custom role"
        description={
          deletingRole
            ? `Delete "${deletingRole.name}"? ${deletingRole.memberCount > 0 ? `${deletingRole.memberCount} member(s) are using this role, so reassign them first.` : "No members are using this role."}`
            : ""
        }
        confirmLabel="Delete"
        variant="danger"
        onConfirm={handleDelete}
        onClose={() => setDeletingRole(null)}
      />
    </div>
  );
}
