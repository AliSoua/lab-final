import { cn } from "@/lib/utils"
import { Search, Filter, X } from "lucide-react"
import type { InfrastructureFilters } from "@/types/infrastructure"

interface InfrastructureFiltersProps {
    filters: InfrastructureFilters
    onFiltersChange: (filters: InfrastructureFilters) => void
    isLoading?: boolean
    hosts: { id: string; name: string }[]
    showTypeFilter?: boolean  // Added optional prop
}

export function InfrastructureFilters({
    filters,
    onFiltersChange,
    isLoading,
    hosts,
    showTypeFilter = true,  // Default to true for backward compatibility
}: InfrastructureFiltersProps) {
    const hasActiveFilters =
        filters.host !== "all" ||
        filters.type !== "all" ||
        filters.status !== "all" ||
        filters.searchQuery !== ""

    const clearFilters = () => {
        onFiltersChange({
            host: "all",
            type: "all",
            status: "all",
            searchQuery: "",
        })
    }

    return (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            {/* Search */}
            <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#c4c4c4]" />
                <input
                    type="text"
                    placeholder="Search templates, VMs, hosts..."
                    value={filters.searchQuery}
                    onChange={(e) =>
                        onFiltersChange({ ...filters, searchQuery: e.target.value })
                    }
                    disabled={isLoading}
                    className={cn(
                        "w-full rounded-lg border border-[#d4d4d4] bg-white pl-10 pr-4 py-2",
                        "text-[13px] text-[#3a3a3a] placeholder:text-[#c4c4c4]",
                        "outline-none focus:border-[#1ca9b1] transition-colors",
                        "disabled:opacity-60"
                    )}
                />
            </div>

            {/* Filter Group */}
            <div className="flex items-center gap-2 flex-wrap">
                {/* ESXi Host Filter */}
                <div className="relative">
                    <select
                        value={filters.host}
                        onChange={(e) =>
                            onFiltersChange({ ...filters, host: e.target.value })
                        }
                        disabled={isLoading}
                        className={cn(
                            "appearance-none rounded-lg border border-[#d4d4d4] bg-white pl-3 pr-8 py-2",
                            "text-[13px] text-[#3a3a3a]",
                            "outline-none focus:border-[#1ca9b1] transition-colors",
                            "disabled:opacity-60 cursor-pointer"
                        )}
                    >
                        <option value="all">All Hosts</option>
                        {hosts.map((host) => (
                            <option key={host.id} value={host.id}>
                                {host.name}
                            </option>
                        ))}
                    </select>
                    <Filter className="absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#727373] pointer-events-none" />
                </div>

                {/* Type Filter - conditionally shown */}
                {showTypeFilter && (
                    <div className="relative">
                        <select
                            value={filters.type}
                            onChange={(e) =>
                                onFiltersChange({ ...filters, type: e.target.value })
                            }
                            disabled={isLoading}
                            className={cn(
                                "appearance-none rounded-lg border border-[#d4d4d4] bg-white pl-3 pr-8 py-2",
                                "text-[13px] text-[#3a3a3a]",
                                "outline-none focus:border-[#1ca9b1] transition-colors",
                                "disabled:opacity-60 cursor-pointer"
                            )}
                        >
                            <option value="all">All Types</option>
                            <option value="esxi">ESXi</option>
                            <option value="vcenter">vCenter</option>
                            <option value="linux">Linux</option>
                            <option value="windows">Windows</option>
                            <option value="security">Security</option>
                            <option value="other">Other</option>
                        </select>
                        <Filter className="absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#727373] pointer-events-none" />
                    </div>
                )}

                {/* Status Filter */}
                <div className="relative">
                    <select
                        value={filters.status}
                        onChange={(e) =>
                            onFiltersChange({ ...filters, status: e.target.value })
                        }
                        disabled={isLoading}
                        className={cn(
                            "appearance-none rounded-lg border border-[#d4d4d4] bg-white pl-3 pr-8 py-2",
                            "text-[13px] text-[#3a3a3a]",
                            "outline-none focus:border-[#1ca9b1] transition-colors",
                            "disabled:opacity-60 cursor-pointer"
                        )}
                    >
                        <option value="all">All Status</option>
                        <option value="available">Available</option>
                        <option value="in_use">In Use</option>
                        <option value="maintenance">Maintenance</option>
                        <option value="deprecated">Deprecated</option>
                    </select>
                    <Filter className="absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#727373] pointer-events-none" />
                </div>

                {/* Clear Filters */}
                {hasActiveFilters && (
                    <button
                        onClick={clearFilters}
                        disabled={isLoading}
                        className={cn(
                            "flex items-center gap-1.5 rounded-lg px-3 py-2",
                            "border border-[#d4d4d4] bg-white text-[#727373]",
                            "text-[13px] font-medium",
                            "hover:bg-[#f5f5f5] hover:text-[#3a3a3a]",
                            "transition-colors disabled:opacity-60"
                        )}
                    >
                        <X className="h-3.5 w-3.5" />
                        Clear
                    </button>
                )}
            </div>
        </div>
    )
}