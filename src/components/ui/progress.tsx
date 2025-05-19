
import * as React from "react"
import * as ProgressPrimitive from "@radix-ui/react-progress"

import { cn } from "@/lib/utils"

const Progress = React.forwardRef<
  React.ElementRef<typeof ProgressPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof ProgressPrimitive.Root>
>(({ className, value, ...props }, ref) => (
  <ProgressPrimitive.Root
    ref={ref}
    className={cn(
      "relative h-4 w-full overflow-hidden rounded-full bg-secondary",
      className
    )}
    {...props}
  >
    <ProgressPrimitive.Indicator
      className={cn(
        "h-full w-full flex-1 transition-all",
        value === 100 ? "bg-green-500" :
        value !== undefined && value >= 70 ? "bg-green-400" :
        value !== undefined && value >= 40 ? "bg-amber-500" :
        value !== undefined && value >= 20 ? "bg-amber-400" :
        "bg-red-500"
      )}
      style={{ 
        transform: `translateX(-${100 - (value || 0)}%)`,
        transition: "transform 0.3s ease, background-color 0.5s ease"
      }}
    />
  </ProgressPrimitive.Root>
))
Progress.displayName = ProgressPrimitive.Root.displayName

export { Progress }
