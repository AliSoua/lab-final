// src/components/LabDefinition/ListLabDefinitions/Pagination.tsx
import { cn } from "@/lib/utils"
import { ChevronLeft, ChevronRight } from "lucide-react"

interface PaginationProps {
    currentPage: number
    totalPages: number
    totalItems: number
    itemsPerPage: number
    onPageChange: (page: number) => void
    isLoading?: boolean
}

export function Pagination({
    currentPage,
    totalPages,
    totalItems,
    itemsPerPage,
    onPageChange,
    isLoading
}: PaginationProps) {
    const startItem = totalItems === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1
    const endItem = Math.min(currentPage * itemsPerPage, totalItems)

    const getPageNumbers = () => {
        const pages: (number | string)[] = []

        if (totalPages <= 5) {
            for (let i = 1; i <= totalPages; i++) {
                pages.push(i)
            }
        } else {
            if (currentPage <= 3) {
                pages.push(1, 2, 3, 4, "...", totalPages)
            } else if (currentPage >= totalPages - 2) {
                pages.push(1, "...", totalPages - 3, totalPages - 2, totalPages - 1, totalPages)
            } else {
                pages.push(1, "...", currentPage - 1, currentPage, currentPage + 1, "...", totalPages)
            }
        }

        return pages
    }

    const showControls = totalPages > 1

    return (
        <div className="flex items-center justify-between">
            {/* Results info */}
            <span className="text-xs text-slate-500">
                {totalItems === 0 ? (
                    "No lab definitions"
                ) : (
                    <>
                        Showing <span className="font-medium text-slate-700">{startItem}</span> -{" "}
                        <span className="font-medium text-slate-700">{endItem}</span> of{" "}
                        <span className="font-medium text-slate-700">{totalItems}</span> lab definitions
                    </>
                )}
            </span>

            {/* Pagination controls */}
            {showControls && (
                <div className="flex items-center gap-1">
                    {/* Previous button */}
                    <button
                        onClick={() => onPageChange(currentPage - 1)}
                        disabled={currentPage === 1 || isLoading}
                        className={cn(
                            "flex h-8 w-8 items-center justify-center rounded-lg",
                            "text-slate-500 transition-colors duration-200",
                            currentPage === 1 || isLoading
                                ? "opacity-40 cursor-not-allowed"
                                : "hover:bg-slate-100 hover:text-slate-700"
                        )}
                    >
                        <ChevronLeft className="h-4 w-4" />
                    </button>

                    {/* Page numbers */}
                    {getPageNumbers().map((page, index) => (
                        <button
                            key={index}
                            onClick={() => typeof page === "number" && onPageChange(page)}
                            disabled={page === "..." || isLoading}
                            className={cn(
                                "flex h-8 w-8 items-center justify-center rounded-lg text-xs font-medium transition-colors duration-200",
                                page === currentPage
                                    ? "bg-sky-500 text-white shadow-sm"
                                    : page === "..."
                                        ? "cursor-default text-slate-400"
                                        : "text-slate-600 hover:bg-slate-100 hover:text-slate-800",
                                isLoading && page !== currentPage && "opacity-60"
                            )}
                        >
                            {page}
                        </button>
                    ))}

                    {/* Next button */}
                    <button
                        onClick={() => onPageChange(currentPage + 1)}
                        disabled={currentPage === totalPages || isLoading}
                        className={cn(
                            "flex h-8 w-8 items-center justify-center rounded-lg",
                            "text-slate-500 transition-colors duration-200",
                            currentPage === totalPages || isLoading
                                ? "opacity-40 cursor-not-allowed"
                                : "hover:bg-slate-100 hover:text-slate-700"
                        )}
                    >
                        <ChevronRight className="h-4 w-4" />
                    </button>
                </div>
            )}
        </div>
    )
}