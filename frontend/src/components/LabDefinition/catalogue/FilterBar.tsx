// src/components/LabDefinition/catalogue/FilterBar.tsx
import { Search, X } from "lucide-react"
import { cn } from "@/lib/utils"
import type { LabCatalogFilters } from "@/types/LabDefinition/publicLabs"
import { LabCategory, LabDifficulty } from "@/types/LabDefinition/publicLabs"

interface FilterBarProps {
    filters: LabCatalogFilters
    onFiltersChange: (filters: LabCatalogFilters) => void
    totalResults: number
    isLoading?: boolean
}

const categories: { value: LabCategory | "all"; label: string }[] = [
    { value: "all", label: "All Categories" },
    { value: LabCategory.DATABASE, label: "Database" },
    { value: LabCategory.NETWORKING, label: "Networking" },
    { value: LabCategory.SECURITY, label: "Security" },
    { value: LabCategory.DEVOPS, label: "DevOps" },
    { value: LabCategory.CLOUD, label: "Cloud" },
    { value: LabCategory.PROGRAMMING, label: "Programming" },
]

const difficulties: { value: LabDifficulty | "all"; label: string }[] = [
    { value: "all", label: "All Levels" },
    { value: LabDifficulty.BEGINNER, label: "Beginner" },
    { value: LabDifficulty.INTERMEDIATE, label: "Intermediate" },
    { value: LabDifficulty.ADVANCED, label: "Advanced" },
]

export function FilterBar({ filters, onFiltersChange, totalResults, isLoading }: FilterBarProps) {
    const hasActiveFilters = filters.category !== "all" || filters.difficulty !== "all" || filters.searchQuery

    const clearFilters = () => {
        onFiltersChange({
            category: "all",
            difficulty: "all",
            searchQuery: "",
        })
    }

    return (
        <div className="flex flex-col gap-4">
            {/* Search + Clear */}
            <div className="flex items-center gap-3">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#c4c4c4]" />
                    <input
                        type="text"
                        placeholder="Search labs..."
                        value={filters.searchQuery}
                        onChange={(e) => onFiltersChange({ ...filters, searchQuery: e.target.value })}
                        className={cn(
                            "w-full rounded-lg border border-[#e8e8e8] bg-white pl-10 pr-10 py-2.5",
                            "text-[13px] text-[#1a1a1a] placeholder:text-[#c4c4c4]",
                            "focus:border-[#1ca9b1] focus:outline-none",
                            "transition-colors duration-200"
                        )}
                    />
                    {filters.searchQuery && (
                        <button
                            onClick={() => onFiltersChange({ ...filters, searchQuery: "" })}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-[#c4c4c4] hover:text-[#727373] transition-colors"
                        >
                            <X className="h-4 w-4" />
                        </button>
                    )}
                </div>

                {hasActiveFilters && (
                    <button
                        onClick={clearFilters}
                        className={cn(
                            "flex h-10 items-center gap-2 rounded-lg border border-[#e8e8e8] px-4",
                            "text-[12px] font-medium text-[#727373]",
                            "hover:border-[#c4c4c4] hover:text-[#1a1a1a]",
                            "transition-all duration-200"
                        )}
                    >
                        <X className="h-3.5 w-3.5" />
                        Clear
                    </button>
                )}
            </div>

            {/* Filters + Results */}
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                    {/* Category */}
                    <select
                        value={filters.category}
                        onChange={(e) => onFiltersChange({ ...filters, category: e.target.value as LabCategory | "all" })}
                        className={cn(
                            "h-9 rounded-md border border-[#e8e8e8] bg-white px-3",
                            "text-[12px] text-[#3a3a3a]",
                            "focus:border-[#1ca9b1] focus:outline-none",
                            "cursor-pointer hover:border-[#c4c4c4]",
                            "transition-colors duration-200"
                        )}
                    >
                        {categories.map((cat) => (
                            <option key={cat.value} value={cat.value}>
                                {cat.label}
                            </option>
                        ))}
                    </select>

                    {/* Difficulty */}
                    <select
                        value={filters.difficulty}
                        onChange={(e) => onFiltersChange({ ...filters, difficulty: e.target.value as LabDifficulty | "all" })}
                        className={cn(
                            "h-9 rounded-md border border-[#e8e8e8] bg-white px-3",
                            "text-[12px] text-[#3a3a3a]",
                            "focus:border-[#1ca9b1] focus:outline-none",
                            "cursor-pointer hover:border-[#c4c4c4]",
                            "transition-colors duration-200"
                        )}
                    >
                        {difficulties.map((diff) => (
                            <option key={diff.value} value={diff.value}>
                                {diff.label}
                            </option>
                        ))}
                    </select>
                </div>

                {/* Results count */}
                <div className="text-[12px] text-[#a0a0a0]">
                    {isLoading ? (
                        <span className="flex items-center gap-2">
                            <span className="h-3 w-3 animate-spin rounded-full border-2 border-[#e8e8e8] border-t-[#1ca9b1]" />
                            Loading...
                        </span>
                    ) : (
                        <span>
                            <span className="font-semibold text-[#1a1a1a]">{totalResults}</span> result{totalResults !== 1 ? "s" : ""}
                        </span>
                    )}
                </div>
            </div>
        </div>
    )
}