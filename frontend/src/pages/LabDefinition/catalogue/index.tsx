// src/pages/LabDefinition/catalogue/index.tsx
import { useState, useMemo } from "react"
import { useNavigate } from "react-router-dom"
import { FlaskConical, AlertCircle, RefreshCw, Search } from "lucide-react"
import { usePublicLabs } from "@/hooks/LabDefinition"
import { useFeaturedLabs } from "@/hooks/LabDefinition/useFeaturedLabs"
import { LabCard, FilterBar, SkeletonGrid } from "@/components/LabDefinition/catalogue"
import { HeroSection } from "@/components/LabDefinition/catalogue/HeroSection"
import { CategoryBrowser } from "@/components/LabDefinition/catalogue/CategoryBrowser"
import type { LabCatalogFilters, PublicLabDefinition } from "@/types/LabDefinition"
import { HeroSectionSkeleton } from "@/components/LabDefinition/catalogue/HeroSectionSkeleton"
import { CatalogueFooter } from "@/components/LabDefinition/catalogue/CatalogueFooter"
import { cn } from "@/lib/utils"

const DEFAULT_FILTERS: LabCatalogFilters = {
    category: "all",
    difficulty: "all",
    searchQuery: "",
}

export default function LabCataloguePage() {
    const navigate = useNavigate()
    const [filters, setFilters] = useState<LabCatalogFilters>(DEFAULT_FILTERS)

    const { labs, isLoading, error, refetch } = usePublicLabs({
        limit: 100,
        category: filters.category === "all" ? undefined : filters.category,
        difficulty: filters.difficulty === "all" ? undefined : filters.difficulty,
    })

    const { featuredLabs, isLoading: isFeaturedLoading } = useFeaturedLabs(5)

    // Scroll handler for "Browse All Labs" button
    const scrollToLabs = () => {
        document.getElementById('labs-grid')?.scrollIntoView({ behavior: 'smooth' })
    }

    const categoryCounts = useMemo(() => {
        const counts: Record<string, number> = {}
        labs.forEach(lab => {
            counts[lab.category] = (counts[lab.category] || 0) + 1
        })
        return counts
    }, [labs])

    const filteredLabs = useMemo(() => {
        let result = labs

        if (filters.searchQuery.trim()) {
            const query = filters.searchQuery.toLowerCase()
            result = result.filter(
                (lab) =>
                    lab.name.toLowerCase().includes(query) ||
                    lab.description.toLowerCase().includes(query) ||
                    (lab.short_description?.toLowerCase().includes(query) ?? false) ||
                    lab.category.toLowerCase().includes(query)
            )
        }

        return result
    }, [labs, filters.searchQuery])

    const handleLabClick = (lab: PublicLabDefinition) => {
        navigate(`/labs/${lab.slug}`)
    }

    return (
        <div className="min-h-screen bg-[#fafafa]">
            {/* HERO SECTION */}
            {isFeaturedLoading ? (
                <HeroSectionSkeleton />
            ) : (
                <HeroSection
                    featuredLabs={featuredLabs}
                    totalLabs={labs.length}
                    completedLabs={0}
                    inProgressLabs={0}
                    onBrowseLabs={scrollToLabs}
                />
            )}

            {/* CATEGORY BROWSER */}
            <CategoryBrowser
                selectedCategory={filters.category}
                onCategoryChange={(cat) => setFilters(prev => ({ ...prev, category: cat }))}
                categoryCounts={categoryCounts}
            />

            {/* Main Content - labs grid with ID for scrolling */}
            <div id="labs-grid" className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
                {/* Section Header */}
                <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h2 className="text-xl font-semibold text-[#3a3a3a]">
                            {filters.category === "all" ? "All Labs" : `${filters.category.replace("_", " ")} Labs`}
                        </h2>
                        <p className="text-sm text-[#727373]">
                            {filteredLabs.length} {filteredLabs.length === 1 ? 'lab' : 'labs'} available
                        </p>
                    </div>

                    {/* Search Bar */}
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#c4c4c4]" />
                        <input
                            type="text"
                            placeholder="Search labs..."
                            value={filters.searchQuery}
                            onChange={(e) => setFilters(prev => ({ ...prev, searchQuery: e.target.value }))}
                            className={cn(
                                "w-full sm:w-64 rounded-lg border border-[#e8e8e8] bg-white pl-10 pr-4 py-2",
                                "text-sm text-[#3a3a3a] placeholder:text-[#c4c4c4]",
                                "focus:border-[#1ca9b1] focus:outline-none focus:ring-2 focus:ring-[#1ca9b1]/10",
                                "transition-all duration-200"
                            )}
                        />
                    </div>
                </div>

                {/* Difficulty Pills */}
                <div className="mb-6 flex flex-wrap items-center gap-2">
                    <span className="text-sm font-medium text-[#727373] mr-2">Difficulty:</span>
                    {[
                        { value: "all", label: "All Levels" },
                        { value: "beginner", label: "Beginner" },
                        { value: "intermediate", label: "Intermediate" },
                        { value: "advanced", label: "Advanced" },
                    ].map((diff) => (
                        <button
                            key={diff.value}
                            onClick={() => setFilters(prev => ({ ...prev, difficulty: diff.value as typeof filters.difficulty }))}
                            className={cn(
                                "rounded-full px-4 py-1.5 text-sm font-medium transition-all duration-200",
                                filters.difficulty === diff.value
                                    ? "bg-[#1ca9b1] text-white shadow-md shadow-[#1ca9b1]/20"
                                    : "bg-white border border-[#e8e8e8] text-[#727373] hover:border-[#1ca9b1]/30 hover:text-[#1ca9b1]"
                            )}
                        >
                            {diff.label}
                        </button>
                    ))}
                </div>

                {/* Error State */}
                {error && (
                    <div className="flex flex-col items-center justify-center gap-4 rounded-xl border border-red-200 bg-red-50 p-8 text-center">
                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
                            <AlertCircle className="h-6 w-6 text-red-600" />
                        </div>
                        <div>
                            <h3 className="text-[16px] font-semibold text-red-900">
                                Failed to load labs
                            </h3>
                            <p className="mt-1 text-[13px] text-red-700">{error}</p>
                        </div>
                        <button
                            onClick={() => refetch()}
                            className={cn(
                                "flex items-center gap-2 rounded-lg bg-white px-4 py-2",
                                "text-[13px] font-medium text-red-700",
                                "border border-red-200 hover:bg-red-100",
                                "transition-all duration-200"
                            )}
                        >
                            <RefreshCw className="h-4 w-4" />
                            Try again
                        </button>
                    </div>
                )}

                {/* Loading State */}
                {isLoading && !error && <SkeletonGrid count={6} />}

                {/* Empty State */}
                {!isLoading && !error && filteredLabs.length === 0 && (
                    <div className="flex flex-col items-center justify-center gap-4 rounded-xl border border-[#e8e8e8] bg-white p-12 text-center">
                        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#f8f8f8]">
                            <FlaskConical className="h-8 w-8 text-[#c4c4c4]" />
                        </div>
                        <div>
                            <h3 className="text-[16px] font-semibold text-[#3a3a3a]">
                                No labs found
                            </h3>
                            <p className="mt-1 text-[13px] text-[#727373]">
                                {filters.searchQuery || filters.category !== "all" || filters.difficulty !== "all"
                                    ? "Try adjusting your filters or search query"
                                    : "No published labs are currently available"}
                            </p>
                        </div>
                        {(filters.searchQuery || filters.category !== "all" || filters.difficulty !== "all") && (
                            <button
                                onClick={() => setFilters(DEFAULT_FILTERS)}
                                className={cn(
                                    "mt-2 rounded-lg bg-[#1ca9b1] px-4 py-2",
                                    "text-[13px] font-medium text-white",
                                    "hover:bg-[#17959c]",
                                    "transition-all duration-200"
                                )}
                            >
                                Clear filters
                            </button>
                        )}
                    </div>
                )}

                {/* Lab Grid */}
                {!isLoading && !error && filteredLabs.length > 0 && (
                    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                        {filteredLabs.map((lab) => (
                            <LabCard
                                key={lab.id}
                                lab={lab}
                                onClick={handleLabClick}
                            />
                        ))}
                    </div>
                )}
            </div>
            <CatalogueFooter />
        </div>
    )
}