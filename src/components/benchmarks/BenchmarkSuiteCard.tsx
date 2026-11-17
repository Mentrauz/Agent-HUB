"use client";

import React from "react";
import { clsx } from "clsx";
import { BenchmarkSuite } from "@/types/benchmark";
import { BTN_SECONDARY_SM, CARD, META, plural } from "@/components/ui/surfaces";

interface BenchmarkSuiteCardProps {
  suite: BenchmarkSuite;
  onRun: (suite: BenchmarkSuite) => void;
  isRunning?: boolean;
}

const PREVIEW = 3;

export function BenchmarkSuiteCard({ suite, onRun, isRunning }: BenchmarkSuiteCardProps) {
  const shown = suite.testCases.slice(0, PREVIEW);
  const more = suite.testCases.length - shown.length;

  return (
    <div className={clsx(CARD, "flex flex-col gap-4 p-5")}>
      <div className="flex-1 space-y-3">
        <div className={clsx(META, "flex items-center justify-between gap-3")}>
          <span className="truncate">{suite.badge.toLowerCase()}</span>
          <span className="shrink-0">{plural(suite.testCases.length, "test")}</span>
        </div>

        <h3 className="font-sans text-sm font-medium leading-snug text-[var(--text-primary)]">{suite.name}</h3>

        <p className="line-clamp-3 font-sans text-[13px] leading-5 text-[var(--text-secondary)]">{suite.description}</p>

        <p className="font-sans text-[13px] leading-5 text-[var(--text-muted)]">
          {shown.map((tc) => tc.name).join(", ")}
          {more > 0 && ` and ${more} more`}
        </p>
      </div>

      <div className="flex items-center justify-between gap-3 border-t border-[var(--border-subtle)] pt-4">
        <span className={clsx(META, "truncate")} title="Recommended model">
          {suite.recommendedModel?.split("/").pop()}
        </span>
        <button type="button" onClick={() => onRun(suite)} disabled={isRunning} className={BTN_SECONDARY_SM}>
          {isRunning ? "Running" : "Run suite"}
        </button>
      </div>
    </div>
  );
}
