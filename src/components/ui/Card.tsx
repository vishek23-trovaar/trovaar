import { ReactNode } from "react";

interface CardProps {
  children: ReactNode;
  className?: string;
  hover?: boolean;
  onClick?: () => void;
}

export default function Card({ children, className = "", hover, onClick }: CardProps) {
  return (
    <div
      className={`bg-white rounded-xl border border-border shadow-sm
        ${hover ? "hover:shadow-md hover:border-primary/20 transition-all duration-200 cursor-pointer" : ""}
        ${className}`}
      onClick={onClick}
    >
      {children}
    </div>
  );
}
