import type { ReactNode } from "react";

interface BadgeProps {
  variant: "free" | "pro";
  children: ReactNode;
}

export function Badge({ variant, children }: BadgeProps) {
  const variantClasses =
    variant === "free"
      ? "bg-accent-green/20 text-accent-green"
      : "bg-accent/20 text-accent-light";

  return (
    <span className={`text-[9px] px-[5px] py-[1px] rounded-[4px] ${variantClasses}`}>
      {children}
    </span>
  );
}
