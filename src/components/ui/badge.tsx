import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium uppercase tracking-[0.18em]",
  {
    variants: {
      variant: {
        default: "border-cyan-400/30 bg-cyan-400/10 text-cyan-200",
        secondary: "border-white/10 bg-white/5 text-slate-300",
        critical: "border-rose-500/30 bg-rose-500/10 text-rose-200",
        high: "border-orange-400/30 bg-orange-400/10 text-orange-200",
        medium: "border-amber-400/30 bg-amber-400/10 text-amber-200",
        low: "border-lime-400/30 bg-lime-400/10 text-lime-200",
        info: "border-sky-400/30 bg-sky-400/10 text-sky-200",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}
