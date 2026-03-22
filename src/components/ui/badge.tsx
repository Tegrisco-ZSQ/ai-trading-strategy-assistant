import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/cn";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500/40",
  {
    variants: {
      variant: {
        default: "border-transparent bg-blue-500/15 text-blue-300",
        neutral: "border-slate-700 bg-slate-800 text-slate-200",
        positive: "border-emerald-700/60 bg-emerald-500/15 text-emerald-300",
        negative: "border-rose-700/60 bg-rose-500/15 text-rose-300",
        outline: "border-slate-600 text-slate-300"
      }
    },
    defaultVariants: {
      variant: "default"
    }
  }
);

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
