"use client";

import { ReactNode } from "react";
import { useScrollReveal } from "@/hooks/useScrollReveal";

interface ScrollRevealProps {
  children: ReactNode;
  className?: string;
  delay?: number;
  direction?: "up" | "down" | "left" | "right" | "none";
  duration?: number;
}

export default function ScrollReveal({
  children,
  className = "",
  delay = 0,
  direction = "up",
  duration = 700,
}: ScrollRevealProps) {
  const { ref, isVisible } = useScrollReveal<HTMLDivElement>();

  const directionStyles: Record<string, string> = {
    up: "translate-y-8",
    down: "-translate-y-8",
    left: "translate-x-8",
    right: "-translate-x-8",
    none: "",
  };

  return (
    <div
      ref={ref}
      className={`transition-all ${className}`}
      style={{
        transitionDuration: `${duration}ms`,
        transitionDelay: `${delay}ms`,
        transitionTimingFunction: "cubic-bezier(0.16, 1, 0.3, 1)",
        opacity: isVisible ? 1 : 0,
        transform: isVisible ? "translate(0, 0)" : undefined,
      }}
      // Apply initial transform via className when not visible
      data-visible={isVisible}
    >
      <div
        style={{
          transform: isVisible ? "none" : directionStyles[direction] === "translate-y-8" ? "translateY(2rem)" :
            directionStyles[direction] === "-translate-y-8" ? "translateY(-2rem)" :
            directionStyles[direction] === "translate-x-8" ? "translateX(2rem)" :
            directionStyles[direction] === "-translate-x-8" ? "translateX(-2rem)" : "none",
          transition: `transform ${duration}ms cubic-bezier(0.16, 1, 0.3, 1) ${delay}ms`,
        }}
      >
        {children}
      </div>
    </div>
  );
}
