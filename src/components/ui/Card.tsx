import { CSSProperties, ReactNode } from "react";

interface CardProps {
  children: ReactNode;
  className?: string;
  hover?: boolean;
  onClick?: () => void;
  style?: CSSProperties;
}

export default function Card({ children, className = "", hover, onClick, style }: CardProps) {
  return (
    <div
      className={`bg-white rounded-2xl border border-border/80 shadow-sm
        ${hover ? "hover:shadow-lg hover:border-primary/20 hover:-translate-y-0.5 transition-all duration-300 cursor-pointer" : "transition-shadow duration-300"}
        ${className}`}
      onClick={onClick}
      style={style}
    >
      {children}
    </div>
  );
}
