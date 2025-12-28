"use client";

import { forwardRef, InputHTMLAttributes, ReactNode } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      label,
      error,
      helperText,
      leftIcon,
      rightIcon,
      className = "",
      id,
      ...props
    },
    ref
  ) => {
    const inputId = id || label?.toLowerCase().replace(/\s+/g, "-");

    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={inputId}
            className="block text-sm font-bold uppercase tracking-wide text-[var(--color-foreground)] mb-2"
          >
            {label}
            {props.required && <span className="text-red-500 ml-1">*</span>}
          </label>
        )}
        <div className="relative">
          {leftIcon && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-black">
              {leftIcon}
            </div>
          )}
          <input
            ref={ref}
            id={inputId}
            className={`
              w-full px-4 py-3
              bg-white
              border-3 border-black
              text-[var(--color-foreground)]
              font-medium
              placeholder:text-gray-400
              transition-all duration-100
              focus:outline-none focus:shadow-[4px_4px_0px_#0a0a0a] focus:translate-x-[-2px] focus:translate-y-[-2px]
              disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-gray-100
              ${leftIcon ? "pl-10" : ""}
              ${rightIcon ? "pr-10" : ""}
              ${error ? "border-red-500 bg-red-50" : ""}
              ${className}
            `}
            {...props}
          />
          {rightIcon && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-black">
              {rightIcon}
            </div>
          )}
        </div>
        {error && <p className="mt-2 text-sm font-bold text-red-500 uppercase">{error}</p>}
        {helperText && !error && (
          <p className="mt-2 text-sm text-gray-600">{helperText}</p>
        )}
      </div>
    );
  }
);

Input.displayName = "Input";

export default Input;
