"use client";

import { forwardRef } from "react";
import { cn } from "@/lib/utils/cn";

const base =
  "w-full rounded-2xl bg-surface px-4 text-[15px] text-ink shadow-soft outline-none ring-1 ring-line transition placeholder:text-faint focus:ring-2 focus:ring-accent-300";

export type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { className, ...props },
  ref,
) {
  return (
    <input ref={ref} className={cn("h-12", base, className)} {...props} />
  );
});

export type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement>;

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  function Textarea({ className, ...props }, ref) {
    return (
      <textarea
        ref={ref}
        className={cn("min-h-24 resize-none py-3", base, className)}
        {...props}
      />
    );
  },
);
