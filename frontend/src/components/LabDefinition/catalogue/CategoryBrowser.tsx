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
    Layers,
} from "lucide-react"
import type { LabCategory } from "@/types/LabDefinition/CreateFullLabDefinition"

interface CategoryBrowserProps {
    selectedCategory: LabCategory | "all"
    onCategoryChange: (category: LabCategory | "all") => void
    categoryCounts?: Record<string, number>
}

const categories = [
    { id: "database" as LabCategory, label: "Database", icon: Database },
    { id: "networking" as LabCategory, label: "Networking", icon: Network },
    { id: "security" as LabCategory, label: "Security", icon: Shield },
    { id: "devops" as LabCategory, label: "DevOps", icon: Cpu },
    { id: "cloud" as LabCategory, label: "Cloud", icon: Cloud },
    { id: "programming" as LabCategory, label: "Programming", icon: Code2 },
    { id: "web_development" as LabCategory, label: "Web Dev", icon: Globe },
    { id: "data_science" as LabCategory, label: "Data Science", icon: BarChart3 },
]

export function CategoryBrowser({
    selectedCategory,
    onCategoryChange,
}: CategoryBrowserProps) {
    const items = [
        { id: "all" as const, label: "All Labs", icon: Layers },
        ...categories,
    ]

    return (
        <section className="mx-auto max-w-7xl px-6 py-16 lg:px-14 lg:py-20">
            {/* ── Header: mono eyebrow + serif headline ── */}
            <div className="mb-10">
                <p className="mb-3 font-mono text-[11px] uppercase tracking-[0.2em] text-[#1ca9b1]">
                    Filter by Topic
                </p>
                <h2 className="max-w-2xl font-serif font-light text-3xl tracking-tight text-[#1a1a1a] lg:text-[2.75rem] leading-[1.15]">
                    Find labs that match your focus
                </h2>
                <p className="mt-4 max-w-xl text-[15px] leading-relaxed text-[#727373]">
                    Select a category to narrow the catalogue to relevant hands-on environments.
                </p>
            </div>

            {/* ── Full-width single-line category bar ── */}
            <div className="flex gap-2">
                {items.map((item) => {
                    const Icon = item.icon
                    const isSelected = selectedCategory === item.id

                    return (
                        <button
                            key={item.id}
                            onClick={() => onCategoryChange(item.id as LabCategory | "all")}
                            className={cn(
                                "group flex flex-1 items-center justify-center gap-2.5 rounded-lg border py-2.5",
                                "transition-all duration-200",
                                isSelected
                                    ? "border-[#1ca9b1] bg-[#1ca9b1] text-white shadow-sm"
                                    : "border-[#e8e8e8] bg-white text-[#3a3a3a] hover:border-[#c4c4c4]"
                            )}
                        >
                            <Icon
                                className={cn(
                                    "h-4 w-4 transition-colors duration-200",
                                    isSelected
                                        ? "text-white/90"
                                        : "text-[#a0a0a0] group-hover:text-[#727373]"
                                )}
                            />
                            <span className="whitespace-nowrap text-[13px] font-medium">
                                {item.label}
                            </span>
                        </button>
                    )
                })}
            </div>
        </section>
    )
}