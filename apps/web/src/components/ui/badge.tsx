import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "~/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-linear-accent focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-linear-text text-white hover:bg-linear-text/80",
        secondary:
          "border-transparent bg-linear-surface text-linear-text hover:bg-linear-border",
        destructive:
          "border-transparent bg-linear-error text-white hover:bg-linear-error/80",
        outline:
          "border-linear-border text-linear-text hover:bg-linear-surface",
        accent:
          "border-transparent bg-linear-accent-light text-linear-accent hover:bg-linear-accent/20",
        success:
          "border-transparent bg-linear-success-light text-linear-success hover:bg-linear-success/20",
        warning:
          "border-transparent bg-linear-warning-light text-linear-warning hover:bg-linear-warning/20",
        ghost:
          "border-transparent bg-transparent text-linear-text-secondary hover:bg-linear-surface",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
