"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { OrganizationSettings } from "@/components/organizations/OrganizationSettings";
import { toast } from "@/stores/toastStore";
import { PageHeader, plural } from "@/components/ui/surfaces";

// ────────────── Types ──────────────

interface Organization {
  id: string;
  name: string;
  slug: string;
  plan: string;
  memberCount: number;
}

// ────────────── Component ──────────────

export default function OrganizationDetailPage() {
  const params = useParams();
  const router = useRouter();
  const organizationId = params.id as string;
  
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [loading, setLoading] = useState(true);

  // Load organization
  const loadOrganization = useCallback(async () => {
    try {
      const res = await fetch(`/api/organizations/${organizationId}`);
      if (res.ok) {
        const data = await res.json();
        setOrganization(data.data);
      } else {
        toast.error("Error", "Organization not found");
        router.push("/organizations");
      }
    } catch (err) {
      console.error("Failed to load organization:", err);
      toast.error("Error", "Failed to load organization");
    } finally {
      setLoading(false);
    }
  }, [organizationId, router]);

  useEffect(() => {
    loadOrganization();
  }, [loadOrganization]);

  if (loading) {
    return (
      <div role="status" className="flex min-h-[400px] items-center justify-center font-sans text-sm text-[var(--text-muted)]">
        Loading organization
      </div>
    );
  }

  if (!organization) {
    return null;
  }

  return (
    <div className="w-full space-y-6">
      <button
        type="button"
        onClick={() => router.push("/organizations")}
        className="inline-flex cursor-pointer items-center gap-2 rounded-[6px] font-sans text-sm text-[var(--text-muted)] transition-colors hover:text-[var(--text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)]"
      >
        <ArrowLeft className="h-4 w-4" strokeWidth={1.5} />
        Organizations
      </button>

      <PageHeader
        title={organization.name}
        meta={`${plural(organization.memberCount, "member")} · ${organization.plan} plan`}
      />

      <OrganizationSettings organizationId={organizationId} onUpdate={loadOrganization} />
    </div>
  );
}
