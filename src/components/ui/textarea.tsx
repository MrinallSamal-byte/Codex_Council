import * as React from "react";

import { cn } from "@/lib/utils";

export const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.ComponentProps<"textarea">
>(({ className, ...props }, ref) => {
  return (
    <textarea
      ref={ref}
      className={cn(
        "flex min-h-28 w-full rounded-xl border border-white/10 bg-slate-900/80 px-3 py-2 text-sm text-white outline-none placeholder:text-slate-500 focus:border-cyan-400/50",
        className,
      )}
      {...props}
    />
  );
});
Textarea.displayName = "Textarea";
