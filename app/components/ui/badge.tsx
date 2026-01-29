import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center px-2 py-0.5 text-xs font-medium transition-colors",
  {
    variants: {
      variant: {
        default: "bg-primary/10 text-primary",
        secondary: "bg-secondary text-secondary-foreground",
        success:
          "bg-emerald-100 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
        warning:
          "bg-amber-100 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400",
        destructive:
          "bg-rose-100 dark:bg-rose-500/10 text-rose-700 dark:text-rose-400",
        info: "bg-sky-100 dark:bg-sky-500/10 text-sky-700 dark:text-sky-400",
        muted:
          "bg-zinc-100 dark:bg-zinc-500/10 text-zinc-700 dark:text-zinc-400",
        violet:
          "bg-violet-100 dark:bg-violet-500/10 text-violet-700 dark:text-violet-400",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

function Badge({
  className,
  variant,
  ...props
}: React.ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
  return (
    <span className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
