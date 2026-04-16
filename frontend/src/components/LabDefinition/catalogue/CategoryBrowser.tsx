// src/components/LabDefinition/catalogue/CategoryBrowser.tsx
import { cn } from "@/lib/utils"
import {
    Database,
    Network,
    Shield,
    Cloud,
    Code2,
    Globe,
    Cpu,
    BarChart3,
    Layers
} from "lucide-react"
import type { LabCategory } from "@/types/LabDefinition/CreateFullLabDefinition"

interface CategoryBrowserProps {
    selectedCategory: LabCategory | "all"
    onCategoryChange: (category: LabCategory | "all") => void
    categoryCounts?: Record<string, number>
}

const categories = [
    {
        id: "database" as LabCategory,
        label: "Database",
        icon: Database,
        description: "SQL, NoSQL & Data Management",
        gradient: "from-blue-500 to-blue-600",
        bgColor: "bg-blue-50/50",
        borderColor: "border-blue-200",
        textColor: "text-blue-700",
        shadowColor: "shadow-blue-500/20"
    },
    {
        id: "networking" as LabCategory,
        label: "Networking",
        icon: Network,
        description: "TCP/IP, DNS & Routing",
        gradient: "from-indigo-500 to-indigo-600",
        bgColor: "bg-indigo-50/50",
        borderColor: "border-indigo-200",
        textColor: "text-indigo-700",
        shadowColor: "shadow-indigo-500/20"
    },
    {
        id: "security" as LabCategory,
        label: "Security",
        icon: Shield,
        description: "Cybersecurity & Compliance",
        gradient: "from-red-500 to-red-600",
        bgColor: "bg-red-50/50",
        borderColor: "border-red-200",
        textColor: "text-red-700",
        shadowColor: "shadow-red-500/20"
    },
    {
        id: "devops" as LabCategory,
        label: "DevOps",
        icon: Cpu,
        description: "CI/CD & Automation",
        gradient: "from-purple-500 to-purple-600",
        bgColor: "bg-purple-50/50",
        borderColor: "border-purple-200",
        textColor: "text-purple-700",
        shadowColor: "shadow-purple-500/20"
    },
    {
        id: "cloud" as LabCategory,
        label: "Cloud",
        icon: Cloud,
        description: "AWS, Azure & GCP",
        gradient: "from-sky-500 to-sky-600",
        bgColor: "bg-sky-50/50",
        borderColor: "border-sky-200",
        textColor: "text-sky-700",
        shadowColor: "shadow-sky-500/20"
    },
    {
        id: "programming" as LabCategory,
        label: "Programming",
        icon: Code2,
        description: "Languages & Frameworks",
        gradient: "from-emerald-500 to-emerald-600",
        bgColor: "bg-emerald-50/50",
        borderColor: "border-emerald-200",
        textColor: "text-emerald-700",
        shadowColor: "shadow-emerald-500/20"
    },
    {
        id: "web_development" as LabCategory,
        label: "Web Dev",
        icon: Globe,
        description: "Frontend & Backend",
        gradient: "from-orange-500 to-orange-600",
        bgColor: "bg-orange-50/50",
        borderColor: "border-orange-200",
        textColor: "text-orange-700",
        shadowColor: "shadow-orange-500/20"
    },
    {
        id: "data_science" as LabCategory,
        label: "Data Science",
        icon: BarChart3,
        description: "Analytics & ML",
        gradient: "from-pink-500 to-pink-600",
        bgColor: "bg-pink-50/50",
        borderColor: "border-pink-200",
        textColor: "text-pink-700",
        shadowColor: "shadow-pink-500/20"
    },
]

export function CategoryBrowser({
    selectedCategory,
    onCategoryChange,
    categoryCounts = {}
}: CategoryBrowserProps) {
    const totalCount = Object.values(categoryCounts).reduce((a, b) => a + b, 0)

    return (
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
            <div className="mb-6 flex items-end justify-between">
                <div>
                    <h2 className="text-xl font-semibold text-[#3a3a3a]">
                        Browse by Category
                    </h2>
                    <p className="mt-1 text-sm text-[#727373]">
                        Select a topic to filter labs
                    </p>
                </div>
                <span className="text-sm text-[#727373]">
                    <span className="font-semibold text-[#3a3a3a]">{totalCount}</span> labs across{" "}
                    <span className="font-semibold text-[#3a3a3a]">{categories.length}</span> categories
                </span>
            </div>

            {/* Category Grid - Responsive Layout */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-5">
                {/* "All" Category Button */}
                <button
                    onClick={() => onCategoryChange("all")}
                    className={cn(
                        "group relative flex flex-col items-start gap-3 rounded-xl border-2 p-4 text-left transition-all duration-200",
                        selectedCategory === "all"
                            ? "border-[#1ca9b1] bg-gradient-to-br from-[#1ca9b1] to-[#17959c] text-white shadow-lg shadow-[#1ca9b1]/25"
                            : "border-[#e8e8e8] bg-white hover:border-[#1ca9b1]/50 hover:shadow-md"
                    )}
                >
                    <div className={cn(
                        "flex h-10 w-10 items-center justify-center rounded-lg transition-all duration-200",
                        selectedCategory === "all"
                            ? "bg-white/20 text-white"
                            : "bg-[#f8f8f8] text-[#727373] group-hover:bg-[#1ca9b1]/10 group-hover:text-[#1ca9b1]"
                    )}>
                        <Layers className="h-5 w-5" />
                    </div>
                    <div>
                        <span className={cn(
                            "block text-sm font-semibold",
                            selectedCategory === "all" ? "text-white" : "text-[#3a3a3a]"
                        )}>
                            All Labs
                        </span>
                        <span className={cn(
                            "text-xs",
                            selectedCategory === "all" ? "text-white/80" : "text-[#727373]"
                        )}>
                            {totalCount} labs
                        </span>
                    </div>
                    {selectedCategory === "all" && (
                        <div className="absolute right-3 top-3 h-2 w-2 rounded-full bg-white animate-pulse" />
                    )}
                </button>

                {/* Category Buttons */}
                {categories.map((cat) => {
                    const Icon = cat.icon
                    const isSelected = selectedCategory === cat.id
                    const count = categoryCounts[cat.id] || 0

                    return (
                        <button
                            key={cat.id}
                            onClick={() => onCategoryChange(cat.id)}
                            className={cn(
                                "group relative flex flex-col items-start gap-3 rounded-xl border-2 p-4 text-left transition-all duration-200",
                                isSelected
                                    ? cn("border-transparent bg-gradient-to-br shadow-lg", cat.gradient, cat.shadowColor)
                                    : cn("border-[#e8e8e8] bg-white hover:shadow-md", `hover:${cat.borderColor}`)
                            )}
                        >
                            <div className={cn(
                                "flex h-10 w-10 items-center justify-center rounded-lg transition-all duration-200",
                                isSelected
                                    ? "bg-white/20 text-white"
                                    : cn(cat.bgColor, cat.textColor)
                            )}>
                                <Icon className="h-5 w-5" />
                            </div>
                            <div className="min-w-0 flex-1">
                                <span className={cn(
                                    "block text-sm font-semibold truncate",
                                    isSelected ? "text-white" : "text-[#3a3a3a]"
                                )}>
                                    {cat.label}
                                </span>
                                <span className={cn(
                                    "text-xs truncate",
                                    isSelected ? "text-white/80" : "text-[#727373]"
                                )}>
                                    {count > 0 ? `${count} labs` : "No labs"}
                                </span>
                            </div>

                            {/* Selection Indicator */}
                            {isSelected && (
                                <div className="absolute right-3 top-3 h-2 w-2 rounded-full bg-white animate-pulse" />
                            )}
                        </button>
                    )
                })}
            </div>
        </div>
    )
}