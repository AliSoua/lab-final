// src/components/LabDefinition/ListLabDefinitions/LabDefinitionFilters.tsx
import { useState, useEffect } from "react"
import { cn } from "@/lib/utils"
import { Search, Filter, X } from "lucide-react"
import type { LabDefinitionFilters } from "@/types/LabDefinition/ListLabs"
import { LabCategory, LabDifficulty } from "@/types/LabDefinition/CreateFullLabDefinition"

interface LabDefinitionFiltersProps {
    filters: LabDefinitionFilters
    onFiltersChange: (filters: LabDefinitionFilters) => void
    isLoading?: boolean
}

function useDebounce<T>(value: T, delay: number): T {
    const [debouncedValue, setDebouncedValue] = useState<T>(value)

    useEffect(() => {
        const timer = setTimeout(() => setDebouncedValue(value), delay)
        return () => clearTimeout(timer)
    }, [value, delay])

    return debouncedValue
}

export function LabDefinitionFilters({
    filters,
    onFiltersChange,
    isLoading
}: LabDefinitionFiltersProps) {
    const [localSearch, setLocalSearch] = useState(filters.searchQuery)
    const debouncedSearch = useDebounce(localSearch, 300)

    useEffect(() => {
        if (debouncedSearch !== filters.searchQuery) {
            onFiltersChange({ ...filters, searchQuery: debouncedSearch })
        }
    }, [debouncedSearch, filters, onFiltersChange])

    const hasActiveFilters =
        filters.category !== "all" ||
        filters.difficulty !== "all" ||
        filters.status !== "all" ||
        filters.searchQuery

    const clearFilters = () => {
        setLocalSearch("")
        onFiltersChange({
            category: "all",
            difficulty: "all",
            status: "all",
            searchQuery: "",
        })
    }

    return (
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            {/* Left side: Search */}
            <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-slate-400" />
                <span className="text-sm font-medium text-slate-700">Filter by:</span>
            </div>

            {/* Right side: Filter controls */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 flex-1 lg:justify-end">
                {/* Search Input */}
                <div className="relative w-full sm:w-72">
                    <Search className={cn(
                        "absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 transition-colors",
                        isLoading ? "text-sky-500 animate-pulse" : "text-slate-400"
                    )} />
                    <input
                        type="text"
                        placeholder="Search lab definitions..."
                        value={localSearch}
                        onChange={(e) => setLocalSearch(e.target.value)}
                        className={cn(
                            "w-full bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-4 py-2 text-sm text-slate-700",
                            "placeholder:text-slate-400",
                            "focus:bg-white focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 outline-none",
                            "transition-all duration-200"
                        )}
                    />
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                    {/* Category Filter */}
                    <select
                        value={filters.category}
                        onChange={(e) => onFiltersChange({
                            ...filters,
                            category: e.target.value as LabCategory | "all"
                        })}
                        className={cn(
                            "bg-white border border-slate-200 rounded-lg text-sm text-slate-700",
                            "focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 outline-none",
                            "px-3 py-2 cursor-pointer hover:border-slate-300 transition-colors",
                            "w-full sm:w-auto"
                        )}
                    >
                        <option value="all">All Categories</option>
                        <option value="database">Database</option>
                        <option value="networking">Networking</option>
                        <option value="security">Security</option>
                        <option value="devops">DevOps</option>
                        <option value="cloud">Cloud</option>
                        <option value="programming">Programming</option>
                    </select>

                    {/* Difficulty Filter */}
                    <select
                        value={filters.difficulty}
                        onChange={(e) => onFiltersChange({
                            ...filters,
                            difficulty: e.target.value as LabDifficulty | "all"
                        })}
                        className={cn(
                            "bg-white border border-slate-200 rounded-lg text-sm text-slate-700",
                            "focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 outline-none",
                            "px-3 py-2 cursor-pointer hover:border-slate-300 transition-colors",
                            "w-full sm:w-auto"
                        )}
                    >
                        <option value="all">All Levels</option>
                        <option value="beginner">Beginner</option>
                        <option value="intermediate">Intermediate</option>
                        <option value="advanced">Advanced</option>
                    </select>

                    {/* Status Filter */}
                    <select
                        value={filters.status}
                        onChange={(e) => onFiltersChange({
                            ...filters,
                            status: e.target.value as "all" | "published" | "draft" | "archived"
                        })}
                        className={cn(
                            "bg-white border border-slate-200 rounded-lg text-sm text-slate-700",
                            "focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 outline-none",
                            "px-3 py-2 cursor-pointer hover:border-slate-300 transition-colors",
                            "w-full sm:w-auto"
                        )}
                    >
                        <option value="all">All Status</option>
                        <option value="published">Published</option>
                        <option value="draft">Draft</option>
                        <option value="archived">Archived</option>
                    </select>

                    {/* Clear Filters */}
                    {hasActiveFilters && (
                        <button
                            onClick={clearFilters}
                            className={cn(
                                "flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg",
                                "text-sm text-slate-600 hover:text-slate-900 hover:bg-slate-100",
                                "transition-colors duration-200 whitespace-nowrap"
                            )}
                        >
                            <X className="h-4 w-4" />
                            <span className="hidden sm:inline">Clear</span>
                        </button>
                    )}
                </div>
            </div>
        </div>
    )
}