// src/components/ui/scrollable-card-list.tsx
import { cn } from '@/lib/utils';
import { ReactNode } from 'react';

interface ScrollableCardListProps {
    children: ReactNode;
    maxHeight?: string;
    className?: string;
    emptyState?: ReactNode;
    isLoading?: boolean;
    loadingSkeleton?: ReactNode;
}

export function ScrollableCardList({
    children,
    maxHeight = '280px',
    className,
    emptyState,
    isLoading,
    loadingSkeleton,
}: ScrollableCardListProps) {
    if (isLoading) {
        return (
            <div className={cn('space-y-2', className)}>
                {loadingSkeleton || (
                    <>
                        <div className="h-[72px] bg-slate-100 rounded-lg animate-pulse" />
                        <div className="h-[72px] bg-slate-100 rounded-lg animate-pulse" />
                        <div className="h-[72px] bg-slate-100 rounded-lg animate-pulse" />
                    </>
                )}
            </div>
        );
    }

    // Check if children is empty
    const isEmpty = !children || (Array.isArray(children) && children.length === 0);

    if (isEmpty && emptyState) {
        return <>{emptyState}</>;
    }

    return (
        <div
            className={cn(
                'relative overflow-hidden rounded-lg border border-slate-200 bg-white',
                className
            )}
        >
            {/* Custom Scrollbar Container */}
            <div
                className="overflow-y-auto scrollbar-thin scrollbar-thumb-slate-300 scrollbar-track-transparent hover:scrollbar-thumb-slate-400"
                style={{ maxHeight }}
            >
                <div className="p-2 space-y-1.5">
                    {children}
                </div>
            </div>

            {/* Fade overlay at bottom when scrollable */}
            <div className="absolute bottom-0 left-0 right-0 h-4 bg-gradient-to-t from-white to-transparent pointer-events-none" />
        </div>
    );
}