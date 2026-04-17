// src/components/infrastructure/InfrastructurePagination.tsx
import { cn } from "@/lib/utils"
import { ChevronLeft, ChevronRight } from "lucide-react"

interface InfrastructurePaginationProps {
    currentPage: number
    totalPages: number
    totalItems: number
    itemsPerPage: number
    onPageChange: (page: number) => void
    isLoading?: boolean
}

export function InfrastructurePagination({
    currentPage,
    totalPages,
    totalItems,
    itemsPerPage,
    onPageChange,
    isLoading
}: InfrastructurePaginationProps) {
    const startItem = totalItems === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1
    const endItem = Math.min(currentPage * itemsPerPage, totalItems)

    const getPageNumbers = () => {
        const pages: (number | string)[] = []

        if (totalPages <= 7) {
            for (let i = 1; i <= totalPages; i++) {
                pages.push(i)
            }
        } else {
            if (currentPage <= 3) {
                pages.push(1, 2, 3, 4, 5, "...", totalPages)
            } else if (currentPage >= totalPages - 2) {
                pages.push(1, "...", totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages)
            } else {
                pages.push(1, "...", currentPage - 1, currentPage, currentPage + 1, "...", totalPages)
            }
        }

        return pages
    }

    if (totalPages <= 1) {
        return (
            <div className="flex items-center justify-between pt-4 border-t border-[#e8e8e8]">
                <span className="text-xs text-[#727373]">
                    Showing <span className="font-medium text-[#3a3a3a]">{startItem}</span> -{" "}
                    <span className="font-medium text-[#3a3a3a]">{endItem}</span> of{" "}
                    <span className="font-medium text-[#3a3a3a]">{totalItems}</span> items
                </span>
            </div>
        )
    }

    return (
        <div className="flex items-center justify-between pt-4 border-t border-[#e8e8e8]">
            <span className="text-xs text-[#727373]">
                Showing <span className="font-medium text-[#3a3a3a]">{startItem}</span> -{" "}
                <span className="font-medium text-[#3a3a3a]">{endItem}</span> of{" "}
                <span className="font-medium text-[#3a3a3a]">{totalItems}</span> items
            </span>

            <div className="flex items-center gap-1">
                <button
                    onClick={() => onPageChange(currentPage - 1)}
                    disabled={currentPage === 1 || isLoading}
                    className={cn(
                        "flex h-8 w-8 items-center justify-center rounded-lg",
                        "text-[#727373] transition-colors duration-200",
                        currentPage === 1 || isLoading
                            ? "opacity-40 cursor-not-allowed"
                            : "hover:bg-[#f5f5f5] hover:text-[#3a3a3a]"
                    )}
                >
                    <ChevronLeft className="h-4 w-4" />
                </button>

                {getPageNumbers().map((page, index) => (
                    <button
                        key={index}
                        onClick={() => typeof page === "number" && onPageChange(page)}
                        disabled={page === "..." || isLoading}
                        className={cn(
                            "flex h-8 w-8 items-center justify-center rounded-lg text-xs font-medium transition-colors duration-200",
                            page === currentPage
                                ? "bg-[#1ca9b1] text-white shadow-sm"
                                : page === "..."
                                    ? "cursor-default text-[#c4c4c4]"
                                    : "text-[#3a3a3a] hover:bg-[#f5f5f5] hover:text-[#1ca9b1]",
                            isLoading && page !== currentPage && "opacity-60"
                        )}
                    >
                        {page}
                    </button>
                ))}

                <button
                    onClick={() => onPageChange(currentPage + 1)}
                    disabled={currentPage === totalPages || isLoading}
                    className={cn(
                        "flex h-8 w-8 items-center justify-center rounded-lg",
                        "text-[#727373] transition-colors duration-200",
                        currentPage === totalPages || isLoading
                            ? "opacity-40 cursor-not-allowed"
                            : "hover:bg-[#f5f5f5] hover:text-[#3a3a3a]"
                    )}
                >
                    <ChevronRight className="h-4 w-4" />
                </button>
            </div>
        </div>
    )
}