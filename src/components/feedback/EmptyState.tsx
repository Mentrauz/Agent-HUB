import React, { ReactNode } from "react";

interface EmptyStateProps {
  title: string;
  description: string;
  icon?: ReactNode;
  action?: ReactNode;
}

export function EmptyState({ title, description, icon, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center space-y-4 rounded-[14px] border border-dashed border-[var(--border-strong)] p-10 text-center">
      {icon && <div className="text-[var(--text-muted)] [&_svg]:h-5 [&_svg]:w-5 [&_svg]:stroke-[1.5]">{icon}</div>}
      <div className="max-w-md space-y-1">
        <h3 className="font-sans text-sm font-medium text-[var(--text-primary)]">{title}</h3>
        <p className="font-sans text-[13px] leading-5 text-[var(--text-muted)]">{description}</p>
      </div>
      {action && <div>{action}</div>}
    </div>
  );
}
