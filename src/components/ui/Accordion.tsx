"use client";

import React, { useState } from "react";
import { ChevronDown } from "lucide-react";
import { clsx } from "clsx";

interface AccordionItem {
  id: string;
  question: string;
  answer: string;
}

interface AccordionProps {
  items: AccordionItem[];
  className?: string;
  /** Allow multiple items open at once */
  multiple?: boolean;
}

export function Accordion({ items, className, multiple = false }: AccordionProps) {
  const [openIds, setOpenIds] = useState<Set<string>>(new Set());

  function toggle(id: string) {
    setOpenIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        if (!multiple) next.clear();
        next.add(id);
      }
      return next;
    });
  }

  return (
    <div className={clsx("divide-y divide-[hsl(var(--border))]", className)}>
      {items.map((item) => {
        const isOpen = openIds.has(item.id);
        return (
          <div key={item.id} className="py-1">
            <button
              type="button"
              onClick={() => toggle(item.id)}
              aria-expanded={isOpen}
              className={clsx(
                "w-full flex items-center justify-between gap-4 py-4 px-1 text-left",
                "font-sans font-semibold text-sm text-[var(--text-primary)]",
                "hover:text-[var(--accent-primary)] transition-colors duration-150",
                "focus-visible:outline-none focus-visible:text-[var(--accent-primary)]",
                "group cursor-pointer"
              )}
            >
              <span className="flex-1 pr-2">{item.question}</span>
              <ChevronDown
                className={clsx(
                  "h-4 w-4 shrink-0 text-[var(--text-muted)] transition-transform duration-300 ease-in-out",
                  "group-hover:text-[var(--accent-primary)]",
                  isOpen && "rotate-180 text-[var(--accent-primary)]"
                )}
                aria-hidden="true"
              />
            </button>
            <div
              className={clsx(
                "overflow-hidden transition-all duration-300 ease-in-out",
                isOpen ? "max-h-[800px] opacity-100" : "max-h-0 opacity-0"
              )}
              role="region"
              aria-hidden={!isOpen}
            >
              <div
                className={clsx(
                  "px-1 pb-5 pt-0 text-sm text-[var(--text-secondary)] leading-relaxed",
                  "border-l-2 border-indigo-200 dark:border-indigo-800/60 pl-4 ml-1"
                )}
              >
                {item.answer}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
