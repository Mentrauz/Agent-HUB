"use client";

import React, { useEffect, useState } from "react";
import { ClerkProvider } from "@clerk/nextjs";
import { useTheme } from "next-themes";

function getClerkThemeConfig(theme: string | undefined) {
  // Parse appearance from compound key (e.g. "punk-light", "calm-green-dark")
  const isLight = theme?.includes("-light") || theme === "light";
  const isPunk = theme?.includes("punk");

  if (isLight) {
    const primaryColor = isPunk ? "#4f46e5" : "#4D8A73";
    const primaryText = "#ffffff";
    const inputBg = isPunk ? "#f8fafc" : "#EAEEEC";

    return {
      variables: {
        colorPrimary: primaryColor,
        colorBackground: "#ffffff",
        colorText: isPunk ? "#0A0E14" : "#0E1411",
        colorTextSecondary: isPunk ? "#3F4D5A" : "#3D4E47",
        colorInputBackground: inputBg,
        colorInputText: isPunk ? "#0A0E14" : "#0E1411",
        fontFamily: "Inter, sans-serif",
        borderRadius: "0.625rem",
      },
      elements: {
        modalBackdrop: "bg-black/60 backdrop-blur-sm",
        card: "border border-slate-200 bg-white shadow-2xl rounded-2xl text-slate-900",
        headerTitle: isPunk
          ? "font-pixel text-indigo-600 uppercase tracking-wide text-lg font-bold"
          : "font-sans text-emerald-800 uppercase tracking-wide text-lg font-bold",
        headerSubtitle: "font-sans text-slate-600 text-xs",
        modalCloseButton: "text-slate-500 hover:text-slate-900 transition-colors",
        socialButtonsBlockButton:
          "border border-slate-300 bg-slate-50 font-sans text-xs hover:border-slate-400 hover:bg-slate-100 text-slate-900 rounded-lg transition-all",
        socialButtonsBlockButtonText: "font-sans text-xs font-semibold text-slate-900",
        lastAuthenticationStrategyBadge:
          "font-sans text-[10px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-full px-2 py-0.5",
        dividerRow: "my-4",
        dividerLine: "bg-slate-200",
        dividerText: "font-sans text-xs font-medium text-slate-500 uppercase tracking-wider",
        formButtonPrimary: isPunk
          ? "border border-indigo-500 bg-indigo-600 font-sans text-xs font-semibold text-white hover:bg-indigo-500 shadow-md shadow-indigo-500/20 uppercase tracking-wider rounded-full py-2.5"
          : "border border-emerald-600 bg-emerald-700 font-sans text-xs font-semibold text-white hover:bg-emerald-600 shadow-md uppercase tracking-wider rounded-full py-2.5",
        formFieldInput:
          "border border-slate-300 bg-slate-50 font-sans text-xs text-slate-900 focus:border-emerald-600 rounded-lg placeholder:text-slate-400",
        formFieldLabel: "font-sans text-xs font-medium text-slate-700",
        footer: "hidden",
        footerAction: "font-sans text-xs text-emerald-700 hover:text-emerald-800",
        footerActionLink: "font-sans text-xs text-emerald-700 hover:text-emerald-800 underline",
        logoBox: "hidden",
        logoImage: "hidden",
        userButtonPopoverCard: "border border-slate-200 bg-white shadow-xl rounded-xl",
        userButtonPopoverActionButton: "font-sans text-xs text-slate-700 hover:bg-slate-100",
        userButtonPopoverActionButtonIcon: isPunk ? "text-indigo-600" : "text-emerald-700",
        userButtonPopoverFooter: "hidden",
        userButtonAvatarBox: "w-8 h-8 rounded-full border border-slate-300 shadow-sm",
        profileSection: "border-b border-slate-200 py-4",
        profileSectionTitleText: "font-sans font-semibold text-xs tracking-wide text-slate-900",
        profileSectionSubtitleText: "font-sans text-slate-600 text-xs",
        profileSectionContent: "text-slate-800",
        userProfileCard: "bg-white border-0 shadow-none",
        breadcrumbsItem: "text-slate-600 text-xs font-sans",
        badge: "font-sans text-[10px] bg-slate-100 text-slate-700 border border-slate-200",
        accordionTriggerButton: "text-slate-800 hover:bg-slate-100",
      },
    };
  }

  // Dark Theme
  const primaryAccent = isPunk ? "#22D3EE" : "#7FAF9B";
  const bgCard = isPunk ? "#0d1117" : "#0a0e0c";
  const inputBg = isPunk ? "#05070a" : "#000000";
  const textPrimary = isPunk ? "#f0f6fc" : "#E7E9E5";
  const textSecondary = isPunk ? "#8b949e" : "#93A49C";

  return {
    variables: {
      colorPrimary: primaryAccent,
      colorBackground: bgCard,
      colorText: textPrimary,
      colorTextSecondary: textSecondary,
      colorInputBackground: inputBg,
      colorInputText: textPrimary,
      fontFamily: "Inter, sans-serif",
      borderRadius: "0.625rem",
    },
    elements: {
      modalBackdrop: "bg-black/80 backdrop-blur-sm",
      card: isPunk
        ? "border border-slate-800 bg-[#0d1117] shadow-2xl shadow-black/80 rounded-2xl text-slate-100"
        : "border border-[#24332c] bg-[#0a0e0c] shadow-2xl shadow-black/90 rounded-2xl text-[#E7E9E5]",
      headerTitle: isPunk
        ? "font-pixel text-cyan-300 uppercase tracking-wide text-lg font-bold"
        : "font-sans text-[#7FAF9B] uppercase tracking-wide text-lg font-bold",
      headerSubtitle: "font-sans text-slate-400 text-xs",
      modalCloseButton: "text-slate-400 hover:text-slate-100 transition-colors",
      socialButtonsBlockButton: isPunk
        ? "border border-slate-800 bg-[#161b22] font-sans text-xs hover:border-cyan-500/50 hover:bg-[#1f242c] text-slate-100 rounded-lg transition-all"
        : "border border-[#1a241f] bg-[#0f1412] font-sans text-xs hover:border-[#7FAF9B]/50 hover:bg-[#151c19] text-[#E7E9E5] rounded-lg transition-all",
      socialButtonsBlockButtonText: "font-sans text-xs font-semibold text-slate-100",
      lastAuthenticationStrategyBadge: isPunk
        ? "font-sans text-[10px] font-semibold bg-cyan-950/80 text-cyan-300 border border-cyan-800/80 rounded-full px-2 py-0.5"
        : "font-sans text-[10px] font-semibold bg-emerald-950/80 text-[#7FAF9B] border border-emerald-800/80 rounded-full px-2 py-0.5",
      dividerRow: "my-4",
      dividerLine: isPunk ? "bg-slate-800" : "bg-[#1a241f]",
      dividerText: "font-sans text-xs font-medium text-slate-400 uppercase tracking-wider",
      formButtonPrimary: isPunk
        ? "border border-indigo-400 bg-indigo-600 font-sans text-xs font-semibold text-white hover:bg-indigo-500 shadow-md shadow-indigo-500/30 uppercase tracking-wider rounded-full py-2.5"
        : "border border-[#7FAF9B] bg-[#7FAF9B] font-sans text-xs font-semibold text-black hover:bg-[#9BC7B2] shadow-md shadow-[#7FAF9B]/20 uppercase tracking-wider rounded-full py-2.5",
      formFieldInput: isPunk
        ? "border border-slate-800 bg-[#05070a] font-sans text-xs text-slate-100 focus:border-cyan-400 rounded-lg placeholder:text-slate-500"
        : "border border-[#24332c] bg-[#000000] font-sans text-xs text-[#E7E9E5] focus:border-[#7FAF9B] rounded-lg placeholder:text-[#6B7C73]",
      formFieldLabel: "font-sans text-xs font-medium text-slate-300",
      footer: "hidden",
      footerAction: "font-sans text-xs text-slate-400 hover:text-slate-200",
      footerActionLink: isPunk
        ? "font-sans text-xs text-cyan-400 hover:text-cyan-300 underline"
        : "font-sans text-xs text-[#7FAF9B] hover:text-[#9BC7B2] underline",
      logoBox: "hidden",
      logoImage: "hidden",
      userButtonPopoverCard: isPunk
        ? "border border-slate-800 bg-[#0d1117] shadow-xl rounded-xl"
        : "border border-[#24332c] bg-[#0a0e0c] shadow-xl rounded-xl",
      userButtonPopoverActionButton: isPunk
        ? "font-sans text-xs text-slate-300 hover:bg-slate-800 hover:text-cyan-300"
        : "font-sans text-xs text-slate-300 hover:bg-[#151c19] hover:text-[#7FAF9B]",
      userButtonPopoverActionButtonIcon: isPunk ? "text-cyan-400" : "text-[#7FAF9B]",
      userButtonPopoverFooter: "hidden",
      userButtonAvatarBox: isPunk
        ? "w-8 h-8 rounded-full border border-cyan-500/40 shadow-sm"
        : "w-8 h-8 rounded-full border border-[#7FAF9B]/40 shadow-sm",
      profileSection: isPunk ? "border-b border-slate-800 py-4" : "border-b border-[#1a241f] py-4",
      profileSectionTitleText: isPunk
        ? "font-sans font-semibold text-cyan-300 text-xs tracking-wide"
        : "font-sans font-semibold text-[#7FAF9B] text-xs tracking-wide",
      profileSectionSubtitleText: "font-sans text-slate-400 text-xs",
      profileSectionContent: "text-slate-200",
      userProfileCard: "bg-transparent border-0 shadow-none",
      breadcrumbsItem: "text-slate-400 text-xs font-sans",
      badge: isPunk
        ? "font-sans text-[10px] bg-slate-800 text-cyan-300 border border-slate-700"
        : "font-sans text-[10px] bg-[#151c19] text-[#7FAF9B] border border-[#24332c]",
      accordionTriggerButton: isPunk
        ? "text-slate-200 hover:bg-slate-800"
        : "text-slate-200 hover:bg-[#151c19]",
    },
  };
}

export function ClerkDynamicProvider({ children }: { children: React.ReactNode }) {
  const { theme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const currentTheme = mounted ? theme : "calm-green-dark";
  const themeConfig = getClerkThemeConfig(currentTheme);

  return (
    <ClerkProvider
      appearance={{
        variables: themeConfig.variables,
        elements: themeConfig.elements,
      }}
    >
      {children}
    </ClerkProvider>
  );
}
