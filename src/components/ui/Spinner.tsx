"use client";

interface SpinnerProps {
  size?: "sm" | "md" | "lg";
  color?: string;
  className?: string;
}

const sizeStyles = {
  sm: "h-4 w-4 border-2",
  md: "h-8 w-8 border-3",
  lg: "h-12 w-12 border-4",
};

export function Spinner({
  size = "md",
  color = "var(--color-primary)",
  className = "",
}: SpinnerProps) {
  return (
    <div
      className={`
        animate-spin rounded-full
        border-t-transparent
        ${sizeStyles[size]}
        ${className}
      `}
      style={{ borderColor: `${color}`, borderTopColor: "transparent" }}
    />
  );
}

interface LoadingOverlayProps {
  message?: string;
}

export function LoadingOverlay({
  message = "로딩 중...",
}: LoadingOverlayProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/80 backdrop-blur-sm">
      <div className="text-center">
        <Spinner size="lg" />
        <p className="mt-4 text-[var(--color-muted)]">{message}</p>
      </div>
    </div>
  );
}

interface LoadingCardProps {
  rows?: number;
}

export function LoadingCard({ rows = 3 }: LoadingCardProps) {
  return (
    <div className="glass-card p-6 animate-pulse">
      <div className="h-6 bg-gray-200 rounded w-1/3 mb-4" />
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="h-4 bg-gray-200 rounded w-full mb-2" />
      ))}
    </div>
  );
}

export default Spinner;
