// src/components/LabDefinition/CreateFullLabDefinitions/VMsStep.tsx
import { cn } from "@/lib/utils"
import { useFormContext } from "react-hook-form"
import type { CreateFullLabDefinitionFormData } from "@/types/LabDefinition/CreateFullLabDefinition"
import { useVMTemplates, type VMTemplate } from "@/hooks/LabDefinition/useVMTemplates"
import { Server, Check, Cpu, MemoryStick, HardDrive, Search, X, AlertCircle } from "lucide-react"
import { useState, useEffect } from "react"

export function VMsStep() {
    const { setValue, watch, formState: { errors } } = useFormContext<CreateFullLabDefinitionFormData>()
    const { templates, vcenters, isLoading, error, fetchTemplates } = useVMTemplates()
    const [searchTerm, setSearchTerm] = useState("")
    const [hasFetched, setHasFetched] = useState(false)

    const selectedTemplateId = watch("vms.0.source_vm_id")
    const selectedTemplate = templates.find(t => t.uuid === selectedTemplateId)

    // Fetch templates on mount
    useEffect(() => {
        if (!hasFetched) {
            fetchTemplates().catch(() => {
                // Error handled by hook
            })
            setHasFetched(true)
        }
    }, [fetchTemplates, hasFetched])

    const filteredTemplates = searchTerm
        ? templates.filter(t =>
            t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            t.guest_os.toLowerCase().includes(searchTerm.toLowerCase()) ||
            t.datacenter.toLowerCase().includes(searchTerm.toLowerCase())
        )
        : templates

    const handleSelect = (template: VMTemplate) => {
        setValue("vms", [{
            name: template.name,
            description: `Template from ${template.datacenter}`,
            source_vm_id: template.uuid,
            cpu_cores: template.cpu_count,
            memory_mb: template.memory_mb,
            disk_gb: 50, // Default disk, not provided by template API
            network_config: {},
            startup_delay: 0,
            order: 0
        }], { shouldValidate: true })
    }

    const handleClear = () => {
        setValue("vms", [], { shouldValidate: true })
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between pb-2 border-b border-[#e8e8e8]">
                <div className="flex items-center gap-2">
                    <Server className="h-4 w-4 text-[#1ca9b1]" />
                    <h2 className="text-[14px] font-semibold text-[#3a3a3a] uppercase tracking-wider">
                        Select VM Template
                    </h2>
                </div>
                {selectedTemplate && (
                    <button
                        type="button"
                        onClick={handleClear}
                        className="flex items-center gap-1.5 text-[12px] text-[#727373] hover:text-red-500 transition-colors"
                    >
                        <X className="h-3.5 w-3.5" />
                        Clear selection
                    </button>
                )}
            </div>

            {/* Selected Template Banner */}
            {selectedTemplate && (
                <div className="bg-[#e6f7f8] border border-[#1ca9b1]/20 rounded-xl p-4 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-[#1ca9b1]/10 flex items-center justify-center text-[#1ca9b1]">
                        <Check className="h-5 w-5" />
                    </div>
                    <div className="flex-1">
                        <p className="text-sm font-medium text-[#3a3a3a]">{selectedTemplate.name}</p>
                        <p className="text-[11px] text-[#727373] mt-0.5">
                            {selectedTemplate.guest_os} • {selectedTemplate.cpu_count} vCPU • {selectedTemplate.memory_mb}MB RAM
                        </p>
                    </div>
                    <span className="text-[10px] px-2 py-1 rounded bg-[#1ca9b1] text-white font-medium">
                        Selected
                    </span>
                </div>
            )}

            {/* Search */}
            <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#c4c4c4]" />
                <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search templates by name, OS, or datacenter..."
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

            {/* Templates List */}
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
                                fetchTemplates()
                            }}
                            className="text-[13px] text-[#1ca9b1] font-medium hover:text-[#17959c]"
                        >
                            Retry
                        </button>
                    </div>
                ) : filteredTemplates.length === 0 ? (
                    <div className="text-center py-12 bg-white rounded-xl border border-dashed border-[#d4d4d4]">
                        <Server className="h-12 w-12 text-[#c4c4c4] mx-auto mb-4" />
                        <p className="text-[13px] text-[#727373]">
                            {searchTerm ? "No templates match your search" : "No VM templates available"}
                        </p>
                    </div>
                ) : (
                    filteredTemplates.map((template) => {
                        const isSelected = template.uuid === selectedTemplateId

                        return (
                            <button
                                key={template.uuid}
                                type="button"
                                onClick={() => handleSelect(template)}
                                className={cn(
                                    "w-full text-left bg-white rounded-xl border p-4 transition-all duration-200",
                                    "hover:shadow-sm",
                                    isSelected
                                        ? "border-[#1ca9b1] ring-1 ring-[#1ca9b1]/20"
                                        : "border-[#e8e8e8] hover:border-[#1ca9b1]/50"
                                )}
                            >
                                <div className="flex items-center gap-3">
                                    <div className={cn(
                                        "w-10 h-10 rounded-lg flex items-center justify-center shrink-0",
                                        isSelected ? "bg-[#e6f7f8] text-[#1ca9b1]" : "bg-[#f5f5f5] text-[#c4c4c4]"
                                    )}>
                                        {isSelected ? (
                                            <Check className="h-5 w-5" />
                                        ) : (
                                            <Server className="h-5 w-5" />
                                        )}
                                    </div>

                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <p className="text-sm font-medium text-[#3a3a3a] truncate">
                                                {template.name}
                                            </p>
                                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#f5f5f5] text-[#727373] font-medium shrink-0">
                                                {template.datacenter}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-3 mt-1">
                                            <span className="flex items-center gap-1 text-[11px] text-[#727373]">
                                                <Cpu className="h-3 w-3" />
                                                {template.cpu_count} vCPU
                                            </span>
                                            <span className="flex items-center gap-1 text-[11px] text-[#727373]">
                                                <MemoryStick className="h-3 w-3" />
                                                {template.memory_mb}MB
                                            </span>
                                            <span className="flex items-center gap-1 text-[11px] text-[#727373]">
                                                <HardDrive className="h-3 w-3" />
                                                {template.guest_os}
                                            </span>
                                        </div>
                                    </div>

                                    {isSelected && (
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
            {errors.vms && (
                <p className="text-[12px] text-red-500 flex items-center gap-1">
                    <X className="h-3 w-3" />
                    {errors.vms.message || "Please select a VM template"}
                </p>
            )}
        </div>
    )
}