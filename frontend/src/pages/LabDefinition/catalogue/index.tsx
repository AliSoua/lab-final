// src/pages/LabDefinition/catalogue/index.tsx
import { useState, useMemo } from "react"
import { useNavigate } from "react-router-dom"
import { Search, RefreshCw } from "lucide-react"
import { usePublicLabs } from "@/hooks/LabDefinition"
import { useFeaturedLabs } from "@/hooks/LabDefinition/useFeaturedLabs"
import { LabCard, SkeletonGrid } from "@/components/LabDefinition/catalogue"
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

    const scrollToLabs = () => {
        document.getElementById("labs-grid")?.scrollIntoView({ behavior: "smooth" })
    }

    const categoryCounts = useMemo(() => {
        const counts: Record<string, number> = {}
        labs.forEach((lab) => {
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
            {/* HERO */}
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

            {/* CATEGORIES */}
            <CategoryBrowser
                selectedCategory={filters.category}
                onCategoryChange={(cat) => setFilters((prev) => ({ ...prev, category: cat }))}
                categoryCounts={categoryCounts}
            />

            {/* MAIN CONTENT */}
            <div id="labs-grid" className="mx-auto max-w-7xl px-6 py-12 lg:px-14">
                {/* Header */}
                <div className="mb-8">
                    <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.2em] text-[#1ca9b1]">
                        Catalogue
                    </p>
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                        <h2 className="font-serif font-light text-2xl tracking-tight text-[#1a1a1a] lg:text-3xl">
                            {filters.category === "all"
                                ? "All Labs"
                                : filters.category.replace("_", " ")}
                        </h2>

                        <div className="relative w-full sm:w-72">
                            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#c4c4c4]" />
                            <input
                                type="text"
                                placeholder="Search labs..."
                                value={filters.searchQuery}
                                onChange={(e) =>
                                    setFilters((prev) => ({ ...prev, searchQuery: e.target.value }))
                                }
                                className={cn(
                                    "w-full rounded-lg border border-[#e8e8e8] bg-white py-2.5 pl-10 pr-4",
                                    "text-[13px] text-[#1a1a1a] placeholder:text-[#c4c4c4]",
                                    "focus:border-[#1ca9b1] focus:outline-none",
                                    "transition-colors duration-200"
                                )}
                            />
                        </div>
                    </div>
                </div>

                {/* Difficulty */}
                <div className="mb-8 flex flex-wrap items-center gap-2">
                    <span className="mr-1 font-mono text-[10px] uppercase tracking-[0.2em] text-[#a0a0a0]">
                        Level
                    </span>
                    {[
                        { value: "all", label: "All" },
                        { value: "beginner", label: "Beginner" },
                        { value: "intermediate", label: "Intermediate" },
                        { value: "advanced", label: "Advanced" },
                    ].map((diff) => (
                        <button
                            key={diff.value}
                            onClick={() =>
                                setFilters((prev) => ({
                                    ...prev,
                                    difficulty: diff.value as typeof filters.difficulty,
                                }))
                            }
                            className={cn(
                                "h-9 rounded-lg border px-4 text-[12px] font-medium transition-all duration-200",
                                filters.difficulty === diff.value
                                    ? "border-[#1ca9b1] bg-[#1ca9b1] text-white"
                                    : "border-[#e8e8e8] bg-white text-[#727373] hover:border-[#c4c4c4] hover:text-[#1a1a1a]"
                            )}
                        >
                            {diff.label}
                        </button>
                    ))}

                    <span className="ml-auto text-[12px] text-[#a0a0a0]">
                        <span className="font-semibold text-[#1a1a1a]">{filteredLabs.length}</span> result
                        {filteredLabs.length !== 1 ? "s" : ""}
                    </span>
                </div>

                {/* Error */}
                {error && (
                    <div className="flex flex-col items-center gap-4 rounded-xl border border-[#e8e8e8] bg-white py-12 text-center">
                        <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#1ca9b1]">
                            Error
                        </p>
                        <h3 className="font-serif font-light text-xl text-[#1a1a1a]">
                            Failed to load labs
                        </h3>
                        <p className="max-w-sm text-[13px] text-[#727373]">{error}</p>
                        <button
                            onClick={() => refetch()}
                            className={cn(
                                "mt-2 flex h-10 items-center gap-2 rounded-lg border border-[#e8e8e8] px-5",
                                "text-[13px] font-medium text-[#727373]",
                                "hover:border-[#c4c4c4] hover:text-[#1a1a1a]",
                                "transition-all duration-200"
                            )}
                        >
                            <RefreshCw className="h-4 w-4" />
                            Try again
                        </button>
                    </div>
                )}

                {/* Loading */}
                {isLoading && !error && <SkeletonGrid count={6} />}

                {/* Empty */}
                {!isLoading && !error && filteredLabs.length === 0 && (
                    <div className="flex flex-col items-center gap-4 rounded-xl border border-[#e8e8e8] bg-white py-16 text-center">
                        <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#1ca9b1]">
                            No results
                        </p>
                        <h3 className="font-serif font-light text-xl text-[#1a1a1a]">
                            No labs found
                        </h3>
                        <p className="max-w-sm text-[13px] text-[#727373]">
                            {filters.searchQuery || filters.category !== "all" || filters.difficulty !== "all"
                                ? "Try adjusting your filters or search query"
                                : "No published labs are currently available"}
                        </p>
                        {(filters.searchQuery || filters.category !== "all" || filters.difficulty !== "all") && (
                            <button
                                onClick={() => setFilters(DEFAULT_FILTERS)}
                                className={cn(
                                    "mt-2 h-10 rounded-lg bg-[#1ca9b1] px-6",
                                    "text-[13px] font-medium text-white",
                                    "hover:bg-[#17959c]",
                                    "transition-colors duration-200"
                                )}
                            >
                                Clear filters
                            </button>
                        )}
                    </div>
                )}

                {/* Grid */}
                {!isLoading && !error && filteredLabs.length > 0 && (
                    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                        {filteredLabs.map((lab) => (
                            <LabCard key={lab.id} lab={lab} onClick={handleLabClick} />
                        ))}
                    </div>
                )}
            </div>

            <CatalogueFooter />
        </div>
    )
}