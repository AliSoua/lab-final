// components/ui/highlight-badge.tsx
import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
import { CheckCircle2, XCircle, AlertCircle } from "lucide-react";

const highlightBadgeVariants = cva(
  "inline-flex items-center gap-1.5 px-2 py-1 rounded border text-xs font-medium transition-colors",
  {
    variants: {
      variant: {
        // Neutral
        default: "bg-slate-50 text-slate-700 border-slate-200",
        secondary: "bg-slate-100 text-slate-700 border-slate-200",
        
        // Semantic colors (like your execution badges)
        primary: "bg-sky-50 text-sky-700 border-sky-200",
        success: "bg-emerald-50 text-emerald-700 border-emerald-200",
        warning: "bg-amber-50 text-amber-700 border-amber-200",
        error: "bg-rose-50 text-rose-700 border-rose-200",
        danger: "bg-rose-50 text-rose-700 border-rose-200", // alias for error
        
        // Extended palette
        violet: "bg-violet-50 text-violet-700 border-violet-200",
        orange: "bg-orange-50 text-orange-700 border-orange-200",
        cyan: "bg-cyan-50 text-cyan-700 border-cyan-200",
      },
      size: {
        default: "text-xs px-2 py-1",
        sm: "text-[10px] px-1.5 py-0.5",
        lg: "text-sm px-2.5 py-1.5",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface HighlightBadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof highlightBadgeVariants> {
  label?: string;
  value?: string | number;
  icon?: React.ReactNode;
  maxWidth?: string | number;
  truncate?: boolean;
  /** Use mono font for the value (good for IDs, exit codes) */
  mono?: boolean;
  /** Inverse style - solid background with light text */
  solid?: boolean;
}

function HighlightBadge({
  className,
  variant,
  size,
  label,
  value,
  icon,
  maxWidth,
  truncate = true,
  mono = false,
  solid = false,
  children,
  ...props
}: HighlightBadgeProps & { children?: React.ReactNode }) {
  // Compute solid variant overrides
  const solidClasses = {
    default: "bg-slate-700 text-white border-slate-700",
    secondary: "bg-slate-600 text-white border-slate-600",
    primary: "bg-sky-600 text-white border-sky-600",
    success: "bg-emerald-600 text-white border-emerald-600",
    warning: "bg-amber-500 text-white border-amber-500",
    error: "bg-rose-600 text-white border-rose-600",
    danger: "bg-rose-600 text-white border-rose-600",
    violet: "bg-violet-600 text-white border-violet-600",
    orange: "bg-orange-600 text-white border-orange-600",
    cyan: "bg-cyan-600 text-white border-cyan-600",
  };

  const variantClass = solid && variant 
    ? solidClasses[variant as keyof typeof solidClasses] || solidClasses.default
    : undefined;

  return (
    <div
      className={cn(
        highlightBadgeVariants({ variant, size }), 
        variantClass,
        className
      )}
      {...props}
    >
      {icon && (
        <span className="flex-shrink-0 opacity-80">
          {icon}
        </span>
      )}
      
      {label && (
        <span className="text-[10px] uppercase tracking-wider opacity-70 font-sans">
          {label}
        </span>
      )}
      
      {(value !== undefined || children) && (
        <span
          className={cn(
            truncate && "truncate",
            mono && "font-mono",
            maxWidth && typeof maxWidth === 'number' 
              ? `max-w-[${maxWidth}px]` 
              : maxWidth 
                ? `max-w-[${maxWidth}]` 
                : undefined
          )}
          style={{
            maxWidth: typeof maxWidth === 'number' 
              ? `${maxWidth}px` 
              : maxWidth
          }}
          title={value !== undefined ? String(value) : undefined}
        >
          {children || value}
        </span>
      )}
    </div>
  );
}

// Convenience components for common patterns
export function StatusBadge({ 
  status, 
  ...props 
}: Omit<HighlightBadgeProps, 'variant'> & { 
  status: 'pending' | 'queued' | 'running' | 'completed' | 'failed' | 'cancelled' | 'timeout' 
}) {
  const config = {
    pending: { variant: 'warning' as const, label: 'Pending' },
    queued: { variant: 'primary' as const, label: 'Queued' },
    running: { variant: 'success' as const, label: 'Running' },
    completed: { variant: 'success' as const, label: 'Completed' },
    failed: { variant: 'error' as const, label: 'Failed' },
    cancelled: { variant: 'secondary' as const, label: 'Cancelled' },
    timeout: { variant: 'orange' as const, label: 'Timeout' },
  }[status];

  return (
    <HighlightBadge 
      variant={config.variant} 
      {...props}
    >
      {config.label}
    </HighlightBadge>
  );
}

export function ExitCodeBadge({ 
  code, 
  ...props 
}: Omit<HighlightBadgeProps, 'variant' | 'value'> & { code: number }) {
  return (
    <HighlightBadge
      variant={code === 0 ? 'success' : 'error'}
      mono
      {...props}
    >
      Exit: {code}
    </HighlightBadge>
  );
}

export function ResultBadge({ 
  type, 
  count, 
  ...props 
}: Omit<HighlightBadgeProps, 'variant' | 'icon'> & { 
  type: 'ok' | 'changed' | 'failed' | 'unreachable' 
}) {
  const config = {
    ok: { variant: 'success' as const, icon: CheckCircle2, label: 'OK' },
    changed: { variant: 'warning' as const, icon: 'Δ', label: 'Changed' },
    failed: { variant: 'error' as const, icon: XCircle, label: 'Failed' },
    unreachable: { variant: 'orange' as const, icon: AlertCircle, label: 'Unreachable' },
  }[type];

  const Icon = config.icon;

  return (
    <HighlightBadge
      variant={config.variant}
      icon={typeof Icon === 'string' ? <span className="text-[10px]">{Icon}</span> : <Icon className="h-3.5 w-3.5" />}
      {...props}
    >
      {count}
    </HighlightBadge>
  );
}

export { HighlightBadge, highlightBadgeVariants };