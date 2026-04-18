// src/components/LabDefinition/catalogue/FilterBar.tsx
import { Search, SlidersHorizontal, X } from "lucide-react"
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
        <div className="flex flex-col gap-4 rounded-xl border border-[#e8e8e8] bg-white p-4">
            {/* Search Row */}
            <div className="flex items-center gap-3">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#c4c4c4]" />
                    <input
                        type="text"
                        placeholder="Search labs by name or description..."
                        value={filters.searchQuery}
                        onChange={(e) => onFiltersChange({ ...filters, searchQuery: e.target.value })}
                        className={cn(
                            "w-full rounded-lg border border-[#e8e8e8] bg-[#fafafa] pl-10 pr-4 py-2.5",
                            "text-[13.5px] text-[#3a3a3a] placeholder:text-[#c4c4c4]",
                            "focus:border-[#1ca9b1] focus:bg-white focus:outline-none",
                            "transition-all duration-200"
                        )}
                    />
                    {filters.searchQuery && (
                        <button
                            onClick={() => onFiltersChange({ ...filters, searchQuery: "" })}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-[#c4c4c4] hover:text-[#727373]"
                        >
                            <X className="h-4 w-4" />
                        </button>
                    )}
                </div>

                {hasActiveFilters && (
                    <button
                        onClick={clearFilters}
                        className={cn(
                            "flex items-center gap-2 rounded-lg border border-[#e8e8e8] px-4 py-2.5",
                            "text-[13px] font-medium text-[#727373]",
                            "hover:border-[#1ca9b1] hover:text-[#1ca9b1]",
                            "transition-all duration-200"
                        )}
                    >
                        <X className="h-4 w-4" />
                        Clear
                    </button>
                )}
            </div>

            {/* Filters Row */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                        <SlidersHorizontal className="h-4 w-4 text-[#727373]" />
                        <span className="text-[12px] font-medium text-[#727373]">Filters:</span>
                    </div>

                    {/* Category Filter */}
                    <select
                        value={filters.category}
                        onChange={(e) => onFiltersChange({ ...filters, category: e.target.value as LabCategory | "all" })}
                        className={cn(
                            "rounded-md border border-[#e8e8e8] bg-white px-3 py-1.5",
                            "text-[12px] text-[#3a3a3a]",
                            "focus:border-[#1ca9b1] focus:outline-none",
                            "cursor-pointer hover:border-[#c4c4c4]",
                            "transition-all duration-200"
                        )}
                    >
                        {categories.map((cat) => (
                            <option key={cat.value} value={cat.value}>
                                {cat.label}
                            </option>
                        ))}
                    </select>

                    {/* Difficulty Filter */}
                    <select
                        value={filters.difficulty}
                        onChange={(e) => onFiltersChange({ ...filters, difficulty: e.target.value as LabDifficulty | "all" })}
                        className={cn(
                            "rounded-md border border-[#e8e8e8] bg-white px-3 py-1.5",
                            "text-[12px] text-[#3a3a3a]",
                            "focus:border-[#1ca9b1] focus:outline-none",
                            "cursor-pointer hover:border-[#c4c4c4]",
                            "transition-all duration-200"
                        )}
                    >
                        {difficulties.map((diff) => (
                            <option key={diff.value} value={diff.value}>
                                {diff.label}
                            </option>
                        ))}
                    </select>
                </div>

                {/* Results Count */}
                <div className="text-[12px] text-[#727373]">
                    {isLoading ? (
                        <span className="flex items-center gap-2">
                            <span className="h-3 w-3 animate-spin rounded-full border-2 border-[#e8e8e8] border-t-[#1ca9b1]" />
                            Loading...
                        </span>
                    ) : (
                        <span>
                            <span className="font-semibold text-[#3a3a3a]">{totalResults}</span> lab{totalResults !== 1 ? "s" : ""} available
                        </span>
                    )}
                </div>
            </div>
        </div>
    )
}