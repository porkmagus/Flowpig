import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "~/lib/utils";
import { motion } from "framer-motion";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-linear-accent focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default:
          "bg-linear-text text-white hover:bg-linear-text/90 active:scale-[0.98]",
        destructive:
          "bg-linear-error text-white hover:bg-linear-error/90 active:scale-[0.98]",
        outline:
          "border border-linear-border bg-transparent hover:bg-linear-surface hover:border-linear-border-hover active:scale-[0.98]",
        secondary:
          "bg-linear-surface text-linear-text hover:bg-linear-border active:scale-[0.98]",
        ghost:
          "hover:bg-linear-surface active:scale-[0.98]",
        link:
          "text-linear-accent underline-offset-4 hover:underline",
        accent:
          "bg-linear-accent text-white hover:bg-linear-accent-hover active:scale-[0.98]",
      },
      size: {
        default: "h-9 px-4 py-2",
        xs: "h-7 px-2.5 text-xs",
        sm: "h-8 px-3 text-xs",
        lg: "h-10 px-6",
        icon: "h-9 w-9",
        "icon-sm": "h-8 w-8",
        "icon-xs": "h-7 w-7",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  withMotion?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, withMotion = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    
    const buttonContent = (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );

    if (withMotion) {
      return (
        <motion.div
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.98 }}
          transition={{ duration: 0.15 }}
        >
          {buttonContent}
        </motion.div>
      );
    }

    return buttonContent;
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
