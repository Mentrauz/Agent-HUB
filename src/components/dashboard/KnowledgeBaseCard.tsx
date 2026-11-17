"use client";

import React from "react";
import Link from "next/link";
import { clsx } from "clsx";
import { RagInsightsDTO } from "@/types/dashboard";
import { BTN_SECONDARY_SM, CARD, CARD_HEAD, CARD_TITLE, HEAD_LINK, META } from "@/components/ui/surfaces";

interface KnowledgeBaseCardProps {
  insights: RagInsightsDTO;
}

function formatDate(d: string): string {
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

const SUBHEAD = "font-sans text-[13px] text-[var(--text-muted)]";

export function KnowledgeBaseCard({ insights }: KnowledgeBaseCardProps) {
  const maxChunks = Math.max(1, ...insights.topCollections.map((c) => c.chunkCount));

  return (
    <section className={clsx(CARD, "flex h-full flex-col")}>
      <div className={CARD_HEAD}>
        <h2 className={CARD_TITLE}>Knowledge base</h2>
        <Link href="/dashboard/knowledge" className={HEAD_LINK}>
          Browse
        </Link>
      </div>

      <div className="flex-1 space-y-6 p-5">
        <div className="grid grid-cols-2 gap-4">
          {[
            { label: "Documents", value: insights.totalDocuments },
            { label: "Vector chunks", value: insights.totalChunks },
          ].map((f) => (
            <div key={f.label} className="space-y-2">
              <div className={SUBHEAD}>{f.label}</div>
              <div className="font-pixel text-3xl font-medium leading-none tabular-nums text-[var(--text-primary)]">
                {f.value.toLocaleString()}
              </div>
            </div>
          ))}
        </div>

        {/* Collections as a ranked list with thin bars */}
        {insights.topCollections.length > 0 && (
          <div className="space-y-3">
            <div className={SUBHEAD}>Collections by size</div>
            <ul className="space-y-3">
              {insights.topCollections.map((c, i) => (
                <li key={c.collection} className="space-y-1.5">
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="truncate font-sans text-[13px] text-[var(--text-primary)]">{c.collection}</span>
                    <span className={META}>{c.chunkCount.toLocaleString()} chunks</span>
                  </div>
                  <div className="h-1 overflow-hidden rounded-full bg-[var(--border-subtle)]">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${(c.chunkCount / maxChunks) * 100}%`,
                        background: i === 0 ? "var(--accent-primary)" : "var(--text-muted)",
                        opacity: i === 0 ? 1 : 0.5,
                      }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="space-y-2">
          <div className={SUBHEAD}>Recent documents</div>
          {insights.recentDocuments.length === 0 ? (
            <p className="font-sans text-[13px] text-[var(--text-muted)]">No documents indexed yet</p>
          ) : (
            <ul className="divide-y divide-[var(--border-subtle)]">
              {insights.recentDocuments.map((doc) => (
                <li key={doc.id} className="flex items-center justify-between gap-3 py-2">
                  <span className="truncate font-sans text-[13px] text-[var(--text-secondary)]">{doc.title}</span>
                  <span className={clsx(META, "shrink-0")}>{formatDate(doc.updatedAt)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="border-t border-[var(--border-subtle)] px-5 py-4">
        <Link href="/dashboard/knowledge" className={BTN_SECONDARY_SM}>
          Add documents
        </Link>
      </div>
    </section>
  );
}
