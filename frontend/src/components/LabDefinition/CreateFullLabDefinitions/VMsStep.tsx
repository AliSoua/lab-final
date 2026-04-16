// src/components/LabDefinition/CreateFullLabDefinitions/VMsStep.tsx
import { cn } from "@/lib/utils"
import { useFormContext, useFieldArray } from "react-hook-form"
import type { CreateFullLabDefinitionFormData } from "@/types/LabDefinition/CreateFullLabDefinition"
import { Server, Plus, Trash2, Cpu, HardDrive, MemoryStick, Network } from "lucide-react"
import { useEffect } from "react"

// Mock VM Templates with VALID UUIDs (not "template-1")
const MOCK_VM_TEMPLATES = [
    {
        id: "esxi-1",
        name: "ESXi 8.0 Host",
        type: "esxi",
        cpu: 4,
        ram: 8192,
        disk: 100
    },
    {
        id: "vcenter-1",
        name: "vCenter Server 8",
        type: "vcenter",
        cpu: 4,
        ram: 16384,
        disk: 200
    },
    {
        id: "ubuntu-1",
        name: "Ubuntu 22.04 LTS",
        type: "linux",
        cpu: 2,
        ram: 4096,
        disk: 50
    },
    {
        id: "windows-1",
        name: "Windows Server 2022",
        type: "windows",
        cpu: 4,
        ram: 8192,
        disk: 80
    },
    {
        id: "kali-1",
        name: "Kali Linux",
        type: "security",
        cpu: 2,
        ram: 4096,
        disk: 60
    },
]

export function VMsStep() {
    const { control, register, watch, setValue } = useFormContext<CreateFullLabDefinitionFormData>()

    const { fields, append, remove } = useFieldArray({
        control,
        name: "vms",
    })

    const vms = watch("vms")

    // Load demo data with VALID UUIDs
    useEffect(() => {
        if (fields.length === 0) {
            append([
                {
                    name: "ESXi Host 01",
                    description: "Primary ESXi host for virtualization lab",
                    vm_template_id: "550e8400-e29b-41d4-a716-446655440001", // Valid UUID
                    cpu_cores: 4,
                    memory_mb: 8192,
                    disk_gb: 100,
                    network_config: { vlan: "100", type: "management" },
                    startup_delay: 0,
                    order: 0
                },
                {
                    name: "vCenter Server",
                    description: "vCenter Server Appliance for managing ESXi hosts",
                    vm_template_id: "550e8400-e29b-41d4-a716-446655440002", // Valid UUID
                    cpu_cores: 4,
                    memory_mb: 16384,
                    disk_gb: 200,
                    network_config: { vlan: "100", type: "management" },
                    startup_delay: 30,
                    order: 1
                },
                {
                    name: "Ubuntu Workstation",
                    description: "Student workstation for lab exercises",
                    vm_template_id: "550e8400-e29b-41d4-a716-446655440003", // Valid UUID
                    cpu_cores: 2,
                    memory_mb: 4096,
                    disk_gb: 50,
                    network_config: { vlan: "200", type: "workstation" },
                    startup_delay: 60,
                    order: 2
                }
            ])
        }
    }, [append, fields.length])

    const handleTemplateChange = (index: number, templateId: string) => {
        const template = MOCK_VM_TEMPLATES.find(t => t.id === templateId)
        if (template) {
            setValue(`vms.${index}.vm_template_id`, templateId)
            setValue(`vms.${index}.cpu_cores`, template.cpu)
            setValue(`vms.${index}.memory_mb`, template.ram)
            setValue(`vms.${index}.disk_gb`, template.disk)
        }
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between pb-2 border-b border-[#e8e8e8]">
                <div className="flex items-center gap-2">
                    <Server className="h-4 w-4 text-[#1ca9b1]" />
                    <h2 className="text-[14px] font-semibold text-[#3a3a3a] uppercase tracking-wider">
                        Virtual Machines
                    </h2>
                </div>
                <button
                    type="button"
                    onClick={() => append({
                        name: "",
                        description: "",
                        vm_template_id: "",
                        cpu_cores: 2,
                        memory_mb: 4096,
                        disk_gb: 50,
                        network_config: {},
                        startup_delay: 0,
                        order: fields.length
                    })}
                    className={cn(
                        "flex items-center gap-2 px-4 py-2 rounded-lg",
                        "bg-[#1ca9b1] text-white text-[12px] font-medium",
                        "hover:bg-[#17959c] transition-colors duration-200"
                    )}
                >
                    <Plus className="h-4 w-4" />
                    Add VM
                </button>
            </div>

            <div className="space-y-4">
                {fields.map((field, index) => {
                    const templateId = watch(`vms.${index}.vm_template_id`)
                    const selectedTemplate = MOCK_VM_TEMPLATES.find(t => t.id === templateId)

                    return (
                        <div key={field.id} className="bg-white rounded-xl border border-[#e8e8e8] p-6 shadow-sm">
                            <div className="flex items-start justify-between mb-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-lg bg-[#f5f5f5] flex items-center justify-center text-[#1ca9b1]">
                                        <Server className="h-5 w-5" />
                                    </div>
                                    <div>
                                        <h3 className="text-[13.5px] font-semibold text-[#3a3a3a]">
                                            VM #{index + 1}
                                        </h3>
                                        <p className="text-[11px] text-[#727373]">
                                            {selectedTemplate?.name || "Select a template"}
                                        </p>
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => remove(index)}
                                    className="p-2 text-[#c4c4c4] hover:text-red-500 transition-colors"
                                >
                                    <Trash2 className="h-4 w-4" />
                                </button>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="col-span-2 space-y-2">
                                    <label className="text-[11px] font-medium text-[#727373] uppercase tracking-wider">
                                        VM Name *
                                    </label>
                                    <input
                                        type="text"
                                        {...register(`vms.${index}.name` as const, { required: true })}
                                        placeholder="e.g., Web Server 01"
                                        className={cn(
                                            "w-full bg-transparent px-3 py-2 text-[13px] text-[#3a3a3a]",
                                            "border border-[#d4d4d4] rounded-lg outline-none",
                                            "placeholder:text-[#c8c8c8]",
                                            "focus:border-[#1ca9b1] transition-colors duration-200"
                                        )}
                                    />
                                </div>

                                <div className="col-span-2 space-y-2">
                                    <label className="text-[11px] font-medium text-[#727373] uppercase tracking-wider">
                                        Description
                                    </label>
                                    <input
                                        type="text"
                                        {...register(`vms.${index}.description` as const)}
                                        placeholder="Purpose of this VM in the lab..."
                                        className={cn(
                                            "w-full bg-transparent px-3 py-2 text-[13px] text-[#3a3a3a]",
                                            "border border-[#d4d4d4] rounded-lg outline-none",
                                            "placeholder:text-[#c8c8c8]",
                                            "focus:border-[#1ca9b1] transition-colors duration-200"
                                        )}
                                    />
                                </div>

                                <div className="col-span-2 space-y-2">
                                    <label className="text-[11px] font-medium text-[#727373] uppercase tracking-wider">
                                        VM Template *
                                    </label>
                                    <select
                                        value={templateId}
                                        onChange={(e) => handleTemplateChange(index, e.target.value)}
                                        className={cn(
                                            "w-full bg-transparent px-3 py-2 text-[13px] text-[#3a3a3a]",
                                            "border border-[#d4d4d4] rounded-lg outline-none",
                                            "focus:border-[#1ca9b1] transition-colors duration-200"
                                        )}
                                    >
                                        <option value="">Select template...</option>
                                        {MOCK_VM_TEMPLATES.map(template => (
                                            <option key={template.id} value={template.id}>
                                                {template.name} ({template.cpu} vCPU, {template.ram / 1024}GB RAM)
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div className="col-span-2 sm:col-span-1 space-y-2">
                                    <label className="text-[11px] font-medium text-[#727373] uppercase tracking-wider flex items-center gap-1">
                                        <Cpu className="h-3 w-3" />
                                        CPU Cores
                                    </label>
                                    <input
                                        type="number"
                                        {...register(`vms.${index}.cpu_cores` as const, { valueAsNumber: true })}
                                        min={1}
                                        max={16}
                                        className={cn(
                                            "w-full bg-transparent px-3 py-2 text-[13px] text-[#3a3a3a]",
                                            "border border-[#d4d4d4] rounded-lg outline-none",
                                            "focus:border-[#1ca9b1] transition-colors duration-200"
                                        )}
                                    />
                                </div>

                                <div className="col-span-2 sm:col-span-1 space-y-2">
                                    <label className="text-[11px] font-medium text-[#727373] uppercase tracking-wider flex items-center gap-1">
                                        <MemoryStick className="h-3 w-3" />
                                        Memory (MB)
                                    </label>
                                    <input
                                        type="number"
                                        {...register(`vms.${index}.memory_mb` as const, { valueAsNumber: true })}
                                        step={512}
                                        min={512}
                                        className={cn(
                                            "w-full bg-transparent px-3 py-2 text-[13px] text-[#3a3a3a]",
                                            "border border-[#d4d4d4] rounded-lg outline-none",
                                            "focus:border-[#1ca9b1] transition-colors duration-200"
                                        )}
                                    />
                                </div>

                                <div className="col-span-2 sm:col-span-1 space-y-2">
                                    <label className="text-[11px] font-medium text-[#727373] uppercase tracking-wider flex items-center gap-1">
                                        <HardDrive className="h-3 w-3" />
                                        Disk (GB)
                                    </label>
                                    <input
                                        type="number"
                                        {...register(`vms.${index}.disk_gb` as const, { valueAsNumber: true })}
                                        min={10}
                                        className={cn(
                                            "w-full bg-transparent px-3 py-2 text-[13px] text-[#3a3a3a]",
                                            "border border-[#d4d4d4] rounded-lg outline-none",
                                            "focus:border-[#1ca9b1] transition-colors duration-200"
                                        )}
                                    />
                                </div>

                                <div className="col-span-2 sm:col-span-1 space-y-2">
                                    <label className="text-[11px] font-medium text-[#727373] uppercase tracking-wider flex items-center gap-1">
                                        <Network className="h-3 w-3" />
                                        Startup Delay (s)
                                    </label>
                                    <input
                                        type="number"
                                        {...register(`vms.${index}.startup_delay` as const, { valueAsNumber: true })}
                                        min={0}
                                        className={cn(
                                            "w-full bg-transparent px-3 py-2 text-[13px] text-[#3a3a3a]",
                                            "border border-[#d4d4d4] rounded-lg outline-none",
                                            "focus:border-[#1ca9b1] transition-colors duration-200"
                                        )}
                                    />
                                </div>
                            </div>
                        </div>
                    )
                })}

                {fields.length === 0 && (
                    <div className="text-center py-12 bg-[#f9f9f9] rounded-xl border border-dashed border-[#d4d4d4]">
                        <Server className="h-12 w-12 text-[#c4c4c4] mx-auto mb-4" />
                        <p className="text-[13px] text-[#727373] mb-4">No VMs configured yet</p>
                        <button
                            type="button"
                            onClick={() => append({
                                name: "",
                                description: "",
                                vm_template_id: "",
                                cpu_cores: 2,
                                memory_mb: 4096,
                                disk_gb: 50,
                                network_config: {},
                                startup_delay: 0,
                                order: 0
                            })}
                            className="text-[13px] text-[#1ca9b1] font-medium hover:text-[#17959c]"
                        >
                            Add your first VM
                        </button>
                    </div>
                )}
            </div>
        </div>
    )
}