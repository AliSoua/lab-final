// src/components/LabDefinition/CreateFullLabDefinitions/ConnectionsStep.tsx
import { cn } from "@/lib/utils"
import { useFormContext } from "react-hook-form"
import type { CreateFullLabDefinitionFormData, LabConnectionSlot } from "@/types/LabDefinition/CreateFullLabDefinition"
import { useLabConnection } from "@/hooks/LabDefinition/useLabConnection"
import { Link, Check, X, Search, AlertCircle, Terminal, Monitor, Eye } from "lucide-react"
import { useState, useEffect } from "react"

const PROTOCOL_ICONS = {
    ssh: Terminal,
    rdp: Monitor,
    vnc: Eye,
}

const PROTOCOL_LABELS = {
    ssh: "SSH",
    rdp: "RDP",
    vnc: "VNC",
}

export function ConnectionsStep() {
    const { setValue, watch, formState: { errors } } = useFormContext<CreateFullLabDefinitionFormData>()
    const { grouped, isLoading, error, refetchGrouped } = useLabConnection()
    const [searchTerm, setSearchTerm] = useState("")
    const [hasFetched, setHasFetched] = useState(false)

    const selectedSlots = watch("connections") || []

    // Fetch grouped connections on mount
    useEffect(() => {
        if (!hasFetched) {
            refetchGrouped().catch(() => {
                // Error handled by hook
            })
            setHasFetched(true)
        }
    }, [refetchGrouped, hasFetched])

    const filteredGroups = searchTerm
        ? grouped.filter(g =>
            g.slug.toLowerCase().includes(searchTerm.toLowerCase()) ||
            g.connections.some(c => c.title.toLowerCase().includes(searchTerm.toLowerCase()))
        )
        : grouped

    const getAvailableProtocols = (slug: string): string[] => {
        const group = grouped.find(g => g.slug === slug)
        if (!group) return []
        return group.connections.map(c => c.protocol)
    }

    const isSlugSelected = (slug: string) => {
        return selectedSlots.some((s: LabConnectionSlot) => s.slug === slug)
    }

    const handleAddSlot = (slug: string) => {
        const available = getAvailableProtocols(slug)
        const newSlot: LabConnectionSlot = {
            slug,
            ssh: available.includes("ssh"),
            rdp: available.includes("rdp"),
            vnc: available.includes("vnc"),
        }
        setValue("connections", [...selectedSlots, newSlot], { shouldValidate: true })
    }

    const handleRemoveSlot = (slug: string) => {
        setValue(
            "connections",
            selectedSlots.filter((s: LabConnectionSlot) => s.slug !== slug),
            { shouldValidate: true }
        )
    }

    const handleToggleProtocol = (slug: string, protocol: "ssh" | "rdp" | "vnc") => {
        const updated = selectedSlots.map((s: LabConnectionSlot) => {
            if (s.slug === slug) {
                return { ...s, [protocol]: !s[protocol] }
            }
            return s
        })
        setValue("connections", updated, { shouldValidate: true })
    }

    const handleClearAll = () => {
        setValue("connections", [], { shouldValidate: true })
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between pb-2 border-b border-[#e8e8e8]">
                <div className="flex items-center gap-2">
                    <Link className="h-4 w-4 text-[#1ca9b1]" />
                    <h2 className="text-[14px] font-semibold text-[#3a3a3a] uppercase tracking-wider">
                        Select Lab Connections
                    </h2>
                </div>
                {selectedSlots.length > 0 && (
                    <button
                        type="button"
                        onClick={handleClearAll}
                        className="flex items-center gap-1.5 text-[12px] text-[#727373] hover:text-red-500 transition-colors"
                    >
                        <X className="h-3.5 w-3.5" />
                        Clear all
                    </button>
                )}
            </div>

            {/* Selected Slots */}
            {selectedSlots.length > 0 && (
                <div className="space-y-3">
                    <p className="text-[12px] font-medium text-[#727373] uppercase tracking-wider">
                        Selected Connections
                    </p>
                    {selectedSlots.map((slot) => {
                        const available = getAvailableProtocols(slot.slug)
                        return (
                            <div
                                key={slot.slug}
                                className="bg-[#e6f7f8] border border-[#1ca9b1]/20 rounded-xl p-4"
                            >
                                <div className="flex items-center justify-between mb-3">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-lg bg-[#1ca9b1]/10 flex items-center justify-center text-[#1ca9b1]">
                                            <Check className="h-4 w-4" />
                                        </div>
                                        <p className="text-sm font-medium text-[#3a3a3a]">{slot.slug}</p>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => handleRemoveSlot(slot.slug)}
                                        className="text-[#727373] hover:text-red-500 transition-colors"
                                    >
                                        <X className="h-4 w-4" />
                                    </button>
                                </div>
                                <div className="flex items-center gap-2 flex-wrap">
                                    {(["ssh", "rdp", "vnc"] as const).map((protocol) => {
                                        const isAvailable = available.includes(protocol)
                                        const isEnabled = slot[protocol]
                                        const Icon = PROTOCOL_ICONS[protocol]

                                        if (!isAvailable) return null

                                        return (
                                            <button
                                                key={protocol}
                                                type="button"
                                                onClick={() => handleToggleProtocol(slot.slug, protocol)}
                                                className={cn(
                                                    "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all",
                                                    isEnabled
                                                        ? "bg-[#1ca9b1] text-white"
                                                        : "bg-white text-[#727373] hover:bg-[#f5f5f5]"
                                                )}
                                            >
                                                <Icon className="h-3 w-3" />
                                                {PROTOCOL_LABELS[protocol]}
                                            </button>
                                        )
                                    })}
                                </div>
                            </div>
                        )
                    })}
                </div>
            )}

            {/* Search */}
            <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#c4c4c4]" />
                <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search connections by slug or title..."
                    disabled={isLoading}
                    className={cn(
                        "w-full rounded-lg border border-[#d4d4d4] bg-white pl-10 pr-3 py-2.5",
                        "text-[13px] text-[#3a3a3a] placeholder:text-[#c4c4c4]",
                        "outline-none focus:border-[#1ca9b1] focus:ring-1 focus:ring-[#1ca9b1]/20 transition-all",
                        isLoading && "opacity-50 cursor-not-allowed"
                    )}
                />
                {searchTerm && (
                    <button
                        type="button"
                        onClick={() => setSearchTerm("")}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-[#c4c4c4] hover:text-[#727373]"
                    >
                        <X className="h-4 w-4" />
                    </button>
                )}
            </div>

            {/* Available Groups List */}
            <div className="space-y-2">
                {isLoading ? (
                    <div className="space-y-3">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="bg-white rounded-xl border border-[#e8e8e8] p-4 animate-pulse">
                                <div className="flex items-center gap-3">
                                    <div className="h-10 w-10 rounded-lg bg-[#f0f0f0]" />
                                    <div className="space-y-2 flex-1">
                                        <div className="h-4 w-48 bg-[#f0f0f0] rounded" />
                                        <div className="h-3 w-32 bg-[#f0f0f0] rounded" />
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : error ? (
                    <div className="text-center py-12 bg-white rounded-xl border border-dashed border-[#d4d4d4]">
                        <AlertCircle className="h-12 w-12 text-red-400 mx-auto mb-4" />
                        <p className="text-[13px] text-[#727373] mb-2">{error}</p>
                        <button
                            type="button"
                            onClick={() => {
                                setHasFetched(false)
                                refetchGrouped()
                            }}
                            className="text-[13px] text-[#1ca9b1] font-medium hover:text-[#17959c]"
                        >
                            Retry
                        </button>
                    </div>
                ) : filteredGroups.length === 0 ? (
                    <div className="text-center py-12 bg-white rounded-xl border border-dashed border-[#d4d4d4]">
                        <Link className="h-12 w-12 text-[#c4c4c4] mx-auto mb-4" />
                        <p className="text-[13px] text-[#727373]">
                            {searchTerm ? "No connections match your search" : "No lab connections available"}
                        </p>
                    </div>
                ) : (
                    filteredGroups.map((group) => {
                        const selected = isSlugSelected(group.slug)
                        const availableProtocols = group.connections.map(c => c.protocol)

                        return (
                            <button
                                key={group.slug}
                                type="button"
                                onClick={() => {
                                    if (!selected) {
                                        handleAddSlot(group.slug)
                                    }
                                }}
                                disabled={selected}
                                className={cn(
                                    "w-full text-left bg-white rounded-xl border p-4 transition-all duration-200",
                                    "hover:shadow-sm",
                                    selected
                                        ? "border-[#1ca9b1] ring-1 ring-[#1ca9b1]/20 opacity-60 cursor-default"
                                        : "border-[#e8e8e8] hover:border-[#1ca9b1]/50"
                                )}
                            >
                                <div className="flex items-center gap-3">
                                    <div className={cn(
                                        "w-10 h-10 rounded-lg flex items-center justify-center shrink-0",
                                        selected ? "bg-[#e6f7f8] text-[#1ca9b1]" : "bg-[#f5f5f5] text-[#c4c4c4]"
                                    )}>
                                        {selected ? (
                                            <Check className="h-5 w-5" />
                                        ) : (
                                            <Link className="h-5 w-5" />
                                        )}
                                    </div>

                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <p className="text-sm font-medium text-[#3a3a3a] truncate">
                                                {group.slug}
                                            </p>
                                            {selected && (
                                                <span className="text-[10px] px-2 py-1 rounded bg-[#1ca9b1] text-white font-medium shrink-0">
                                                    Selected
                                                </span>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                                            {availableProtocols.map((protocol) => {
                                                const Icon = PROTOCOL_ICONS[protocol as keyof typeof PROTOCOL_ICONS]
                                                return (
                                                    <span
                                                        key={protocol}
                                                        className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded bg-[#f5f5f5] text-[#727373] font-medium"
                                                    >
                                                        <Icon className="h-3 w-3" />
                                                        {PROTOCOL_LABELS[protocol as keyof typeof PROTOCOL_LABELS]}
                                                    </span>
                                                )
                                            })}
                                        </div>
                                    </div>

                                    {selected && (
                                        <div className="w-6 h-6 rounded-full bg-[#1ca9b1] flex items-center justify-center text-white shrink-0">
                                            <Check className="h-4 w-4" />
                                        </div>
                                    )}
                                </div>
                            </button>
                        )
                    })
                )}
            </div>

            {/* Validation Error */}
            {errors.connections && (
                <p className="text-[12px] text-red-500 flex items-center gap-1">
                    <X className="h-3 w-3" />
                    {errors.connections.message || "Please select at least one connection"}
                </p>
            )}
        </div>
    )
}