import { ReactNode } from "react";

interface BadgeProps {
  children: ReactNode;
  variant?: "default" | "success" | "warning" | "danger" | "info";
  className?: string;
}

const variants = {
  default: "bg-[#141516] text-[#d0d6e0]",
  success: "bg-[#27a644]/10 text-[#34d399]",
  warning: "bg-[#fbbf24]/10 text-[#fbbf24]",
  danger: "bg-[#f87171]/10 text-[#f87171]",
  info: "bg-[#3B82F6]/10 text-[#60A5FA]",
};

export default function Badge({ children, variant = "default", className = "" }: BadgeProps) {
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${variants[variant]} ${className}`}>
      {children}
    </span>
  );
}
