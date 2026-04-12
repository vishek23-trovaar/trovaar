"use client";

import { ButtonHTMLAttributes, ReactNode } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "danger" | "ghost" | "white";
  size?: "sm" | "md" | "lg";
  children: ReactNode;
  loading?: boolean;
}

const variants = {
  primary: "bg-primary text-white hover:bg-primary-dark shadow-sm hover:shadow-md hover:shadow-primary/20",
  secondary: "bg-secondary text-white hover:bg-slate-800 shadow-sm hover:shadow-md",
  outline: "border-2 border-primary text-primary hover:bg-primary hover:text-white hover:shadow-md hover:shadow-primary/20",
  danger: "bg-danger text-white hover:bg-red-600 shadow-sm hover:shadow-md hover:shadow-danger/20",
  ghost: "text-muted hover:text-secondary hover:bg-surface-dark",
  white: "bg-white text-primary hover:bg-blue-50 shadow-sm hover:shadow-md",
};

const sizes = {
  sm: "px-3 py-1.5 text-sm",
  md: "px-5 py-2.5 text-sm",
  lg: "px-6 py-3 text-base",
};

export default function Button({
  variant = "primary",
  size = "md",
  children,
  loading,
  disabled,
  className = "",
  ...props
}: ButtonProps) {
  return (
    <button
      className={`inline-flex items-center justify-center font-semibold rounded-lg transition-all duration-200
        ${variants[variant]} ${sizes[size]}
        ${disabled || loading ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}
        ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading && (
        <svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      )}
      {children}
    </button>
  );
}
