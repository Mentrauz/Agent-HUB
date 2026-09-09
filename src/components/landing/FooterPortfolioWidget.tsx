"use client";

import React, { useEffect, useState } from "react";
import { Sparkles, ArrowRight } from "lucide-react";
import { useTheme } from "next-themes";
import { parseThemeKey } from "@/components/providers/ThemeProvider";
import { clsx } from "clsx";

export function FooterPortfolioWidget() {
  const [isVisible, setIsVisible] = useState(false);
  const [mounted, setMounted] = useState(false);
  const { theme, resolvedTheme } = useTheme();

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const mainEl = document.getElementById("main-content");

    const handleCheck = () => {
      let scrollY = window.scrollY;
      let maxScroll = document.documentElement.scrollHeight - window.innerHeight;

      if (mainEl) {
        const mainScroll = mainEl.scrollTop;
        const mainMax = mainEl.scrollHeight - mainEl.clientHeight;
        if (mainMax > 0) {
          scrollY = mainScroll;
          maxScroll = mainMax;
        }
      }

      // Reveal widget ONLY when user reaches the very end of the page (bottom footer area)
      const distanceFromBottom = maxScroll - scrollY;
      const isAtEnd = maxScroll > 0 ? (distanceFromBottom <= 220 || scrollY / maxScroll >= 0.88) : false;

      if (isAtEnd) {
        setIsVisible(true);
      } else {
        setIsVisible(false);
      }
    };

    handleCheck();

    if (mainEl) {
      mainEl.addEventListener("scroll", handleCheck, { passive: true });
    }
    window.addEventListener("scroll", handleCheck, { passive: true });

    return () => {
      if (mainEl) mainEl.removeEventListener("scroll", handleCheck);
      window.removeEventListener("scroll", handleCheck);
    };
  }, []);

  const currentThemeKey = theme || resolvedTheme || "calm-green-dark";
  const { identity, appearance } = parseThemeKey(currentThemeKey);
  const isCalmGreen = mounted && identity === "calm-green";
  const isLight = mounted && appearance === "light";

  return (
    <div
      className={clsx(
        "fixed bottom-3 sm:bottom-5 left-1/2 -translate-x-1/2 z-50 font-mono transition-all duration-500",
        isVisible ? "opacity-100 translate-y-0 pointer-events-auto" : "opacity-0 translate-y-6 pointer-events-none"
      )}
    >
      <a
        href="https://soumyasingh.site/"
        target="_blank"
        rel="noopener noreferrer"
        title="Portfolio of SOUMYA SINGH"
        aria-label="Soumya Singh Portfolio"
        className={clsx(
          "group relative flex items-center h-9 rounded-full transition-all duration-500 ease-out hover:pr-3.5 overflow-hidden backdrop-blur-md cursor-pointer",
          isCalmGreen
            ? (isLight
                ? "border border-[#BEC9C4] bg-[#FFFFFF] text-[#0E1411] shadow-md hover:border-[#4D8A73]/70 hover:shadow-[0_0_16px_rgba(77,138,115,0.18)]"
                : "border border-[#252D2A] bg-[#000000] text-[#E7E9E5] shadow-lg shadow-black/50 hover:border-[#7FAF9B]/60 hover:shadow-[0_0_16px_rgba(127,175,155,0.15)]"
              )
            : "border border-indigo-400/80 dark:border-indigo-500/60 bg-indigo-600 dark:bg-indigo-950 text-white shadow-lg shadow-indigo-500/25 dark:shadow-indigo-950/80"
        )}
      >
        {/* Compact Glowing Pulsing Circle Icon (36x36px) */}
        <div
          className={clsx(
            "w-9 h-9 rounded-full flex items-center justify-center shrink-0 relative transition-colors",
            isCalmGreen
              ? (isLight ? "bg-[#EAEEEC] group-hover:bg-[#D5DDD9]" : "bg-[#000000] group-hover:bg-[#0a0e0c]")
              : "bg-indigo-600 dark:bg-indigo-900 group-hover:bg-indigo-500"
          )}
        >
          <span className="relative flex h-2.5 w-2.5">
            <span
              className={clsx(
                "absolute inline-flex h-full w-full animate-ping rounded-full opacity-80",
                isCalmGreen ? (isLight ? "bg-[#4D8A73]" : "bg-[#7FAF9B]") : "bg-cyan-400"
              )}
            />
            <span
              className={clsx(
                "relative inline-flex h-2.5 w-2.5 rounded-full",
                isCalmGreen ? (isLight ? "bg-[#4D8A73]" : "bg-[#7FAF9B]") : "bg-cyan-300"
              )}
            />
          </span>
          <Sparkles
            className={clsx(
              "h-3.5 w-3.5 absolute animate-pulse opacity-90",
              isCalmGreen ? (isLight ? "text-[#4D8A73]" : "text-[#7FAF9B]") : "text-white"
            )}
          />
        </div>

        {/* Sliding Animated Text Wrapper */}
        <div className="max-w-0 opacity-0 group-hover:max-w-xs group-hover:opacity-100 transition-all duration-500 ease-in-out whitespace-nowrap overflow-hidden flex items-center gap-1.5 pl-0.5 pr-1">
          <span
            className={clsx(
              "text-[10px] font-mono font-medium",
              isCalmGreen
                ? (isLight ? "text-[#5E7269]" : "text-[#8D9691]")
                : "text-indigo-100 dark:text-slate-300"
            )}
          >
            // CRAFTED BY
          </span>
          <span
            className={clsx(
              "text-[10px] font-mono font-bold flex items-center gap-1",
              isCalmGreen
                ? (isLight ? "text-[#4D8A73]" : "text-[#7FAF9B]")
                : "text-white dark:text-cyan-300"
            )}
          >
            [ SOUMYA SINGH ]
            <ArrowRight
              className={clsx(
                "h-3 w-3 group-hover:translate-x-1 transition-transform",
                isCalmGreen ? (isLight ? "text-[#4D8A73]" : "text-[#7FAF9B]") : "text-cyan-300"
              )}
            />
          </span>
        </div>
      </a>
    </div>
  );
}
