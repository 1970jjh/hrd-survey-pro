"use client";

import { HTMLAttributes, ReactNode } from "react";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  hover?: boolean;
  padding?: "none" | "sm" | "md" | "lg";
}

const paddingStyles = {
  none: "",
  sm: "p-4",
  md: "p-6",
  lg: "p-8",
};

export function Card({
  children,
  hover = false,
  padding = "md",
  className = "",
  ...props
}: CardProps) {
  return (
    <div
      className={`
        bg-white border-3 border-black shadow-[4px_4px_0px_#0a0a0a]
        ${hover ? "transition-all duration-100 cursor-pointer hover:shadow-[6px_6px_0px_#0a0a0a] hover:translate-x-[-2px] hover:translate-y-[-2px]" : ""}
        ${paddingStyles[padding]}
        ${className}
      `}
      {...props}
    >
      {children}
    </div>
  );
}

interface CardHeaderProps {
  children: ReactNode;
  action?: ReactNode;
  className?: string;
}

export function CardHeader({
  children,
  action,
  className = "",
}: CardHeaderProps) {
  return (
    <div className={`flex items-center justify-between mb-4 ${className}`}>
      <h3 className="text-lg font-bold uppercase tracking-wide text-[var(--color-foreground)]">
        {children}
      </h3>
      {action && <div>{action}</div>}
    </div>
  );
}

interface CardContentProps {
  children: ReactNode;
  className?: string;
}

export function CardContent({ children, className = "" }: CardContentProps) {
  return <div className={className}>{children}</div>;
}

interface CardFooterProps {
  children: ReactNode;
  className?: string;
}

export function CardFooter({ children, className = "" }: CardFooterProps) {
  return (
    <div className={`mt-4 pt-4 border-t-3 border-black ${className}`}>
      {children}
    </div>
  );
}

export default Card;
