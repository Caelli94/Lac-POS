"use client"

import * as React from "react"
import * as CheckboxPrimitive from "@radix-ui/react-checkbox"
import { Check } from "lucide-react"
import { cn } from "@/lib/utils"

const Checkbox = React.forwardRef<
    React.ElementRef<typeof CheckboxPrimitive.Root>,
    React.ComponentPropsWithoutRef<typeof CheckboxPrimitive.Root>
>(({ className, ...props }, ref) => (
    <CheckboxPrimitive.Root
        ref={ref}
        className={cn(
            "peer shrink-0 border border-primary ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground",
            className
        )}
        style={{
            width: 'var(--checkbox-size, 1rem)',
            height: 'var(--checkbox-size, 1rem)',
            borderRadius: 'var(--checkbox-radius, 0.25rem)',
            boxShadow: 'var(--checkbox-shadow, none)',
            '--tw-border-opacity': '1',
            borderColor: 'var(--checkbox-color, currentColor)',
        } as React.CSSProperties}
        {...props}
    >
        <CheckboxPrimitive.Indicator
            className={cn("flex items-center justify-center text-current")}
            style={{ color: 'var(--checkbox-tick-color, white)' }}
        >
            <Check className="w-[85%] h-[85%]" strokeWidth={3.5} />
        </CheckboxPrimitive.Indicator>

        {/* Override default background logic with inline styles to support dynamic colors */}
        <style jsx global>{`
            [data-state=checked] {
                background-color: var(--checkbox-color, currentColor) !important;
                border-color: var(--checkbox-color, currentColor) !important;
            }
        `}</style>
    </CheckboxPrimitive.Root>
))
Checkbox.displayName = CheckboxPrimitive.Root.displayName

export { Checkbox }