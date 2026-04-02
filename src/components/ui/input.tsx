import * as React from "react";

import { cn } from "@/lib/utils";

export const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, ...props }, ref) => {
    return (
      <input
        ref={ref}
        className={cn(
          "flex h-10 w-full rounded-xl border border-white/10 bg-slate-900/80 px-3 py-2 text-sm text-white outline-none ring-0 placeholder:text-slate-500 focus:border-cyan-400/50",
          className,
        )}
        {...props}
      />
    );
  },
);
Input.displayName = "Input";
