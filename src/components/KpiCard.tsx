import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { LucideIcon } from "lucide-react";

interface KpiCardProps {
  title: string;
  value: string;
  subtitle?: string;
  icon?: LucideIcon;
  trend?: "up" | "down" | "neutral";
  trendValue?: string;
  variant?: "default" | "primary" | "success" | "warning" | "danger";
  tooltip?: string;
  className?: string;
  large?: boolean;
}

const variantStyles = {
  default: "bg-card border-border",
  primary: "bg-primary/5 border-primary/20",
  success: "bg-success/5 border-success/20",
  warning: "bg-warning/5 border-warning/20",
  danger: "bg-destructive/5 border-destructive/20",
};

const iconVariant = {
  default: "text-muted-foreground",
  primary: "text-primary",
  success: "text-success",
  warning: "text-warning",
  danger: "text-destructive",
};

export function KpiCard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  trendValue,
  variant = "default",
  tooltip,
  className,
  large,
}: KpiCardProps) {
  const card = (
    <div
      className={cn(
        "rounded-lg border p-4 transition-all hover:shadow-lg hover:shadow-primary/5",
        variantStyles[variant],
        large && "p-6",
        className
      )}
    >
      <div className="flex items-start justify-between">
        <div className="space-y-1 min-w-0 flex-1">
          <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-body font-medium">{title}</p>
          <p className={cn("font-heading font-bold text-foreground truncate", large ? "text-2xl" : "text-lg")}>
            {value}
          </p>
          {subtitle && (
            <p className="text-xs text-muted-foreground">{subtitle}</p>
          )}
          {trend && trendValue && (
            <div className="flex items-center gap-1 mt-1">
              <span className={cn(
                "text-xs font-medium",
                trend === "up" && "text-success",
                trend === "down" && "text-destructive",
                trend === "neutral" && "text-muted-foreground"
              )}>
                {trend === "up" ? "▲" : trend === "down" ? "▼" : "—"} {trendValue}
              </span>
            </div>
          )}
        </div>
        {Icon && (
          <div className={cn("p-2 rounded-md bg-background/50", iconVariant[variant])}>
            <Icon className="h-4 w-4" />
          </div>
        )}
      </div>
    </div>
  );

  if (tooltip) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>{card}</TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-xs text-xs">
          {tooltip}
        </TooltipContent>
      </Tooltip>
    );
  }

  return card;
}
