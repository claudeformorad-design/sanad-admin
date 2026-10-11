import * as React from "react";
import { cn } from "@/lib/utils";

export function Input({ className, ...props }: React.ComponentProps<"input">) {
  return <input data-slot="input" className={cn("h-11 py-2 flex w-full min-w-0 field disabled:cursor-not-allowed disabled:opacity-50", className)} {...props} />;
}
