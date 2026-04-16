// frontend/src/components/ui/page-loader.tsx
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface PageLoaderProps {
    className?: string;
    message?: string;
}

export function PageLoader({ className, message = "Loading..." }: PageLoaderProps) {
    return (
        <div className={cn(
            "flex flex-col items-center justify-center min-h-[50vh] gap-4",
            className
        )}>
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-muted-foreground text-sm">{message}</p>
        </div>
    );
}