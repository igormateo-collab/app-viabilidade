import { cn } from "@/lib/utils";
import { getStatusConfig } from "@/data/mockData";

interface StatusBadgeProps {
  status: "excellent" | "viable" | "attention" | "inviable";
  label: string;
  size?: "sm" | "md" | "lg";
}

export function StatusBadge({ status, label, size = "md" }: StatusBadgeProps) {
  const config = getStatusConfig(status);
  return (
    <span className={cn(
      "inline-flex items-center gap-1.5 rounded-full border font-body font-medium",
      config.bg, config.text, config.border,
      size === "sm" && "px-2 py-0.5 text-[10px]",
      size === "md" && "px-3 py-1 text-xs",
      size === "lg" && "px-4 py-1.5 text-sm",
    )}>
      <span className={cn("rounded-full", 
        size === "sm" ? "h-1.5 w-1.5" : "h-2 w-2",
        status === "excellent" && "bg-success animate-pulse",
        status === "viable" && "bg-info",
        status === "attention" && "bg-warning animate-pulse",
        status === "inviable" && "bg-destructive animate-pulse",
      )} />
      {label}
    </span>
  );
}
