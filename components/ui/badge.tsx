import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 select-none",
  {
    variants: {
      variant: {
        default: "border-transparent bg-primary/20 text-primary border-primary/30",
        secondary: "border-transparent bg-secondary text-secondary-foreground",
        destructive: "border-transparent bg-destructive/20 text-destructive-foreground border-destructive/30",
        outline: "text-foreground border-border",
        // Courier Specific Badges
        ready: "bg-blue-500/15 text-blue-400 border-blue-500/30",
        dispatched: "bg-purple-500/15 text-purple-400 border-purple-500/30",
        transit: "bg-amber-500/15 text-amber-400 border-amber-500/30",
        delivered: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
        failed: "bg-red-500/15 text-red-400 border-red-500/30",
        returned: "bg-slate-500/20 text-slate-400 border-slate-500/30",
        // Payment Badges
        paid: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
        pending: "bg-amber-500/15 text-amber-400 border-amber-500/30",
        refunded: "bg-rose-500/15 text-rose-400 border-rose-500/30",
        // Sync Badges
        synced: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
        syncFailed: "bg-rose-500/20 text-rose-400 border-rose-500/40 animate-pulse",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {
  dot?: boolean;
}

function Badge({ className, variant, dot = true, children, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props}>
      {dot && (
        <span
          className={cn(
            "h-1.5 w-1.5 rounded-full",
            variant === "ready" && "bg-blue-400",
            variant === "dispatched" && "bg-purple-400",
            variant === "transit" && "bg-amber-400 animate-pulse",
            variant === "delivered" && "bg-emerald-400",
            variant === "failed" && "bg-red-400",
            variant === "returned" && "bg-slate-400",
            variant === "paid" && "bg-emerald-400",
            variant === "pending" && "bg-amber-400",
            variant === "synced" && "bg-emerald-400",
            variant === "syncFailed" && "bg-rose-400",
            (!variant || variant === "default") && "bg-primary"
          )}
        />
      )}
      {children}
    </div>
  );
}

export { Badge, badgeVariants };
