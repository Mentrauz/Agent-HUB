"use client";

import React, {
  useEffect,
  useState,
  useMemo,
  useCallback,
  useRef,
} from "react";

export interface AgentStudioPreloaderProps {
  isLoading?: boolean;
  onComplete?: () => void;
  duration?: number;
  customSteps?: string[];
  title?: string;
  subtitle?: string;
  fullscreen?: boolean;
  allowSkip?: boolean;
  showTelemetry?: boolean;
  className?: string;
}

interface BootLogEntry {
  type: "kernel" | "systemd" | "info" | "banner";
  time?: string;
  text: string;
  status?: "OK" | "FAIL" | "INFO";
}

const DEFAULT_KERNEL_LINES: BootLogEntry[] = [
  { type: "kernel", time: "0.000000", text: "Linux version 6.12.8-agenthub-x86_64 (buildd@kernel-org) (gcc 14.2.0) #1 SMP PREEMPT_DYNAMIC" },
  { type: "kernel", time: "0.000000", text: "Command line: BOOT_IMAGE=/boot/vmlinuz-6.12.8-agenthub root=UUID=7a2c-49f1 ro quiet=0 audit=1" },
  { type: "kernel", time: "0.001042", text: "x86/fpu: Supporting XSAVE feature 0x001: 'x87 floating point registers'" },
  { type: "kernel", time: "0.004128", text: "BIOS-e820: [mem 0x0000000000000000-0x000000000009fbff] usable" },
  { type: "kernel", time: "0.008914", text: "BIOS-e820: [mem 0x0000000100000000-0x0000000fffffffff] usable (64GB RAM active)" },
  { type: "kernel", time: "0.021045", text: "ACPI: Early table checksum verification enabled" },
  { type: "kernel", time: "0.048912", text: "smpboot: Allowing 4 CPUs, 0 hotplug CPUs" },
  { type: "kernel", time: "0.082103", text: "CPU0: Intel(R) Core(TM) Multi-Agent Processor @ 3.80GHz (family: 0x6, model: 0xb7)" },
  { type: "kernel", time: "0.124501", text: "Performance Events: PEBS fmt4, 32-deep LBR, AnyThread deprecation" },
  { type: "kernel", time: "0.180291", text: "devtmpfs: initialized (mount option: nosuid,noexec,mode=0755)" },
  { type: "kernel", time: "0.231940", text: "clocksource: tsc-early: mask: 0xffffffffffffffff max_cycles: 0x73507c39" },
  { type: "kernel", time: "0.310492", text: "Netfilter core / IP tables initialized (nf_conntrack v0.5.0)" },
  { type: "kernel", time: "0.412890", text: "EXT4-fs (nvme0n1p2): mounted filesystem with ordered data mode. Quota mode: none." },
  { type: "kernel", time: "0.520412", text: "systemd[1]: System time before build time, advancing clock." },
  { type: "kernel", time: "0.601429", text: "systemd[1]: Inserted module 'autofs4'" },
  { type: "systemd", status: "OK", text: "Created slice Slice /system/agent-runtime." },
  { type: "systemd", status: "OK", text: "Listening on Journal Socket (/dev/log)." },
  { type: "systemd", status: "OK", text: "Mounted /sys/fs/cgroup (Unified Cgroup Hierarchy)." },
  { type: "systemd", status: "OK", text: "Started Kernel Device Manager (udev)." },
  { type: "systemd", status: "OK", text: "Mounted /sys/kernel/security (Security File System)." },
  { type: "systemd", status: "OK", text: "Reached target System Initialization." },
  { type: "systemd", status: "OK", text: "Mounted Qdrant Vector Memory Database (/var/lib/qdrant)." },
  { type: "systemd", status: "OK", text: "Started SearXNG Privacy Metasearch Service (port: 8080)." },
  { type: "systemd", status: "OK", text: "Started Crawl4AI Native Markdown Extractor Microservice." },
  { type: "systemd", status: "OK", text: "Started IBM Docling Optical Document Parser Daemon." },
  { type: "systemd", status: "OK", text: "Started Gotenberg Headless Chromium PDF Export Engine." },
  { type: "systemd", status: "OK", text: "Initialized OpenRouter & Groq 28+ Model Failover Router." },
  { type: "systemd", status: "OK", text: "Handshaked Model Context Protocol (MCP) SSE/stdio bus." },
  { type: "systemd", status: "OK", text: "Mounted Cryptographic Approval Vault (Single-Use Tokens)." },
  { type: "systemd", status: "OK", text: "Initialized LangGraph 1.4 Finite State Engine." },
  { type: "systemd", status: "OK", text: "Reached target Multi-Agent Execution Environment." },
  { type: "systemd", status: "OK", text: "Starting Agent Hub Web UI Daemon..." },
  { type: "systemd", status: "OK", text: "Reached target Graphical Interface." },
  { type: "info", text: "agent-hub-node01 tty1" },
  { type: "info", text: "agent-hub login: root (automatic login)" },
  { type: "info", text: "Last login: Sun Oct  4 19:48:12 2026 on tty1" },
  { type: "banner", text: "Entering Agent Hub Workspace..." },
];

function TuxPenguinIcon({ className = "w-8 h-10" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 200 240"
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <ellipse cx="100" cy="120" rx="68" ry="90" fill="#1a1a1a" />
      <ellipse cx="100" cy="70" rx="48" ry="46" fill="#1a1a1a" />
      <ellipse cx="100" cy="138" rx="46" ry="68" fill="#E6EDF3" />
      <path d="M 36 100 Q 18 140 28 175 Q 42 165 48 135 Z" fill="#1a1a1a" />
      <path d="M 164 100 Q 182 140 172 175 Q 158 165 152 135 Z" fill="#1a1a1a" />
      <ellipse cx="85" cy="62" rx="10" ry="14" fill="#FFFFFF" />
      <ellipse cx="115" cy="62" rx="10" ry="14" fill="#FFFFFF" />
      <circle cx="87" cy="63" r="4.5" fill="#000000" />
      <circle cx="113" cy="63" r="4.5" fill="#000000" />
      <circle cx="89" cy="61" r="1.5" fill="#FFFFFF" />
      <circle cx="115" cy="61" r="1.5" fill="#FFFFFF" />
      <path d="M 85 75 Q 100 70 115 75 Q 100 95 85 75 Z" fill="#F59E0B" />
      <ellipse cx="72" cy="214" rx="26" ry="10" fill="#F59E0B" />
      <ellipse cx="128" cy="214" rx="26" ry="10" fill="#F59E0B" />
    </svg>
  );
}

export function AgentStudioPreloader({
  isLoading,
  onComplete,
  duration = 3200,
  customSteps,
  title = "Agent Hub Linux Kernel",
  subtitle = "6.12.8-agenthub-x86_64",
  fullscreen = true,
  allowSkip = true,
  showTelemetry = true,
  className = "",
}: AgentStudioPreloaderProps) {
  const [visibleCount, setVisibleCount] = useState(0);
  const [progress, setProgress] = useState(0);
  const [isExiting, setIsExiting] = useState(false);
  const [isMounted, setIsMounted] = useState(true);
  const [cursorVisible, setCursorVisible] = useState(true);
  const terminalBottomRef = useRef<HTMLDivElement>(null);
  const exitCalledRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const bootLines = useMemo<BootLogEntry[]>(() => {
    if (customSteps && customSteps.length > 0) {
      const customEntries: BootLogEntry[] = customSteps.map((step) => ({
        type: "systemd" as const,
        status: "OK" as const,
        text: step,
      }));
      return [
        ...DEFAULT_KERNEL_LINES.slice(0, 15),
        ...customEntries,
        ...DEFAULT_KERNEL_LINES.slice(-6),
      ];
    }
    return DEFAULT_KERNEL_LINES;
  }, [customSteps]);

  const totalLines = bootLines.length;

  // Blinking cursor
  useEffect(() => {
    const blink = setInterval(() => setCursorVisible((v) => !v), 530);
    return () => clearInterval(blink);
  }, []);

  // Auto-scroll to bottom on each new line
  useEffect(() => {
    terminalBottomRef.current?.scrollIntoView({ block: "end" });
  }, [visibleCount]);

  const doExit = useCallback(() => {
    if (exitCalledRef.current) return;
    exitCalledRef.current = true;
    if (timerRef.current) clearInterval(timerRef.current);
    setIsExiting(true);
    setTimeout(() => {
      setIsMounted(false);
      onComplete?.();
    }, 420);
  }, [onComplete]);

  const handleSkip = useCallback(() => {
    if (!allowSkip || exitCalledRef.current) return;
    setVisibleCount(totalLines);
    setProgress(100);
    doExit();
  }, [allowSkip, totalLines, doExit]);

  // Keyboard skip
  useEffect(() => {
    if (!allowSkip) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" || e.code === "Space") {
        e.preventDefault();
        handleSkip();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [allowSkip, handleSkip]);

  // Main boot sequence timer — runs ONCE, never re-created
  useEffect(() => {
    // Controlled mode
    if (isLoading !== undefined) {
      if (!isLoading) {
        setVisibleCount(totalLines);
        setProgress(100);
        doExit();
      }
      return;
    }

    // Autonomous mode: spread totalLines evenly across duration
    const intervalMs = Math.max(16, Math.floor(duration / totalLines));
    let line = 0;

    timerRef.current = setInterval(() => {
      line += 1;
      const pct = Math.min(100, Math.round((line / totalLines) * 100));
      setVisibleCount(line);
      setProgress(pct);

      if (line >= totalLines) {
        clearInterval(timerRef.current!);
        timerRef.current = null;
        setTimeout(doExit, 400);
      }
    }, intervalMs);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // ← intentionally empty: run only once on mount

  if (!isMounted) return null;

  const renderedLines = bootLines.slice(0, visibleCount);

  // Build ASCII progress bar
  const BAR_WIDTH = 34;
  const filled = Math.round((progress / 100) * BAR_WIDTH);
  const bar =
    "[" +
    "=".repeat(Math.max(0, filled - 1)) +
    (filled > 0 ? ">" : "") +
    " ".repeat(Math.max(0, BAR_WIDTH - filled)) +
    "]";

  return (
    <div
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={progress}
      aria-label="Linux Kernel Boot Sequence"
      onClick={handleSkip}
      className={[
        fullscreen ? "fixed inset-0 z-[9999]" : "relative w-full min-h-[580px]",
        "flex flex-col overflow-hidden select-none font-mono",
        "transition-opacity duration-500",
        isExiting ? "opacity-0 pointer-events-none" : "opacity-100",
        className,
      ].join(" ")}
      style={{ backgroundColor: "#050a08", color: "#c9d1d9" }}
    >
      {/* CRT scanlines overlay */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-30 opacity-[0.06]"
        style={{
          background:
            "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.8) 2px, rgba(0,0,0,0.8) 4px)",
        }}
      />

      {/* ── HEADER ── */}
      <div className="z-10 shrink-0 border-b border-[#1c2b22] bg-[#07100c]/95 px-4 py-2 sm:px-6 sm:py-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          {/* Tux cluster */}
          <div className="flex gap-0.5 shrink-0">
            <TuxPenguinIcon className="w-6 h-7 sm:w-7 sm:h-9" />
            <TuxPenguinIcon className="w-6 h-7 sm:w-7 sm:h-9 hidden sm:block" />
            <TuxPenguinIcon className="w-6 h-7 sm:w-7 sm:h-9 hidden md:block" />
            <TuxPenguinIcon className="w-6 h-7 sm:w-7 sm:h-9 hidden lg:block" />
          </div>

          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
              <span className="text-white font-bold text-xs sm:text-sm tracking-wide">
                {title}
              </span>
              <span className="text-[#58a6ff] text-[10px] sm:text-xs">
                [{subtitle}]
              </span>
              <span className="hidden md:inline text-[#3fb950] text-[10px]">
                SMP PREEMPT_DYNAMIC
              </span>
            </div>
            {showTelemetry && (
              <div className="text-[10px] text-[#6e7681] truncate mt-0.5">
                Arch: x86_64 &nbsp;│&nbsp; Mem: 64GB DDR5 &nbsp;│&nbsp; LangGraph 1.4 &nbsp;│&nbsp; MCP SSE v1.3
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span className="hidden lg:flex items-center gap-1.5 text-[10px] text-[#6e7681]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#3fb950] inline-block" />
            RUNLEVEL 5 (graphical.target)
          </span>
          {allowSkip && (
            <button
              onClick={(e) => { e.stopPropagation(); handleSkip(); }}
              className="text-[10px] px-2 py-0.5 sm:px-2.5 sm:py-1 rounded border border-[#30363d] bg-[#0d1117] text-[#6e7681] hover:text-[#e6edf3] hover:border-[#6e7681] transition-colors cursor-pointer"
            >
              [ESC] skip
            </button>
          )}
        </div>
      </div>

      {/* ── TERMINAL LOG AREA ── */}
      <div
        className="z-10 flex-1 min-h-0 overflow-y-auto px-3 py-2 sm:px-5 sm:py-3 space-y-[2px]"
        style={{ fontSize: "clamp(11px, 1.1vw, 13px)", lineHeight: "1.55" }}
      >
        {renderedLines.map((entry, idx) => {
          if (entry.type === "kernel") {
            return (
              <div key={idx} className="flex gap-2 items-start">
                <span className="text-[#444c56] shrink-0 tabular-nums">
                  [{" "}{entry.time ?? "0.000000"}{" "}]
                </span>
                <span className="text-[#adbac7] break-all">{entry.text}</span>
              </div>
            );
          }

          if (entry.type === "systemd") {
            const isOk = entry.status === "OK";
            return (
              <div key={idx} className="flex gap-2 items-start">
                <span className="shrink-0">
                  [
                  <span className={isOk ? "text-[#3fb950] font-bold" : "text-[#f85149] font-bold"}>
                    {" "}{entry.status ?? " OK "}{" "}
                  </span>
                  ]
                </span>
                <span className="text-[#e6edf3] break-all">{entry.text}</span>
              </div>
            );
          }

          if (entry.type === "info") {
            return (
              <div key={idx} className="text-[#58a6ff] mt-1">
                {entry.text}
              </div>
            );
          }

          if (entry.type === "banner") {
            return (
              <div key={idx} className="flex items-center gap-2 text-[#3fb950] font-bold mt-2">
                <span>&gt;&gt;</span>
                <span>{entry.text}</span>
                <span
                  className="inline-block w-[9px] h-[14px] bg-[#3fb950]"
                  style={{ opacity: cursorVisible ? 1 : 0 }}
                />
              </div>
            );
          }
          return null;
        })}

        {/* Streaming cursor while still booting */}
        {visibleCount < totalLines && visibleCount > 0 && (
          <div className="flex items-center gap-2 text-[#6e7681] mt-1">
            <span className="text-[#444c56]">[ .... ]</span>
            <span>Starting services...</span>
            <span
              className="inline-block w-[8px] h-[13px] bg-[#6e7681]"
              style={{ opacity: cursorVisible ? 1 : 0 }}
            />
          </div>
        )}

        <div ref={terminalBottomRef} style={{ height: 1 }} />
      </div>

      {/* ── FOOTER STATUS BAR ── */}
      <div
        className="z-10 shrink-0 border-t border-[#1c2b22] bg-[#07100c]/95 px-4 py-2 sm:px-6 sm:py-2.5"
        style={{ fontSize: "clamp(10px, 1vw, 12px)" }}
      >
        <div className="flex items-center justify-between gap-4">
          {/* ASCII progress bar */}
          <div className="flex items-center gap-2 tabular-nums font-mono min-w-0">
            <span className="text-[#6e7681] shrink-0">Boot:</span>
            <span className="text-[#3fb950] font-semibold tracking-tighter overflow-hidden">
              {bar}
            </span>
            <span className="text-white font-bold shrink-0">{progress}%</span>
          </div>

          <div className="flex items-center gap-3 text-[#6e7681] shrink-0">
            <span className="hidden xs:inline">tty0: 1920×1080@60Hz</span>
            <span
              className="font-semibold"
              style={{ color: progress === 100 ? "#3fb950" : "#f0883e" }}
            >
              {progress === 100 ? "OK" : "INITIALIZING"}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
