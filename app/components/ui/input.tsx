import * as React from "react";

import { cn } from "@/lib/utils";

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "placeholder:text-muted-foreground border-border dark:bg-card text-foreground h-8 w-full min-w-0 border bg-white px-3 py-1 text-[13px] transition-all outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-[13px] file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
        "focus-visible:border-primary focus-visible:ring-primary/20 focus-visible:ring-1",
        className,
      )}
      {...props}
    />
  );
}

export { Input };
