"use client";

import { ReactNode } from "react";

type BadgeVariant = "default" | "success" | "warning" | "error" | "info";
type BadgeSize = "sm" | "md";

interface BadgeProps {
  children: ReactNode;
  variant?: BadgeVariant;
  size?: BadgeSize;
  className?: string;
}

const variantStyles: Record<BadgeVariant, string> = {
  default: "bg-gray-100 text-gray-600",
  success: "bg-green-100 text-green-600",
  warning: "bg-yellow-100 text-yellow-600",
  error: "bg-red-100 text-red-600",
  info: "bg-blue-100 text-blue-600",
};

const sizeStyles: Record<BadgeSize, string> = {
  sm: "px-2 py-0.5 text-xs",
  md: "px-3 py-1 text-sm",
};

export function Badge({
  children,
  variant = "default",
  size = "sm",
  className = "",
}: BadgeProps) {
  return (
    <span
      className={`
        inline-flex items-center font-medium rounded-full
        ${variantStyles[variant]}
        ${sizeStyles[size]}
        ${className}
      `}
    >
      {children}
    </span>
  );
}

// Preset badges for common use cases
export function StatusBadge({
  status,
}: {
  status: "draft" | "active" | "closed";
}) {
  const config: Record<string, { label: string; variant: BadgeVariant }> = {
    draft: { label: "임시저장", variant: "default" },
    active: { label: "진행중", variant: "success" },
    closed: { label: "종료", variant: "error" },
  };

  const { label, variant } = config[status] || config.draft;

  return <Badge variant={variant}>{label}</Badge>;
}

export default Badge;
