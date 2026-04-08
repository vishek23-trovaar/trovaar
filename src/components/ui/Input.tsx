"use client";

import { InputHTMLAttributes, forwardRef, useId } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, className = "", id: externalId, ...props }, ref) => {
    const generatedId = useId();
    const id = externalId || generatedId;

    return (
      <div className="w-full">
        {label && (
          <label htmlFor={id} className="block text-sm font-medium text-secondary mb-1.5">
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={id}
          className={`w-full px-4 py-2.5 rounded-lg border transition-colors duration-200
            ${error ? "border-danger focus:ring-danger/20" : "border-border focus:ring-primary/20"}
            focus:outline-none focus:ring-2 focus:border-primary bg-white text-secondary placeholder-muted
            ${className}`}
          {...props}
        />
        {error && <p className="mt-1 text-sm text-danger">{error}</p>}
      </div>
    );
  }
);

Input.displayName = "Input";
export default Input;
