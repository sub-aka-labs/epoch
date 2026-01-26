import * as React from "react"

import { cn } from "@/lib/utils"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "placeholder:text-zinc-500 h-8 w-full min-w-0 border border-zinc-700 bg-zinc-900 px-3 py-1 text-[13px] text-white transition-colors outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-[13px] file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
        "focus-visible:border-zinc-500",
        className
      )}
      {...props}
    />
  )
}

export { Input }
