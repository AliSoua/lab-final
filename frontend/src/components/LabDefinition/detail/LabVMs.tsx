// src/components/LabDefinition/detail/LabVMs.tsx
import { Computer, Cpu, HardDrive, MemoryStick } from "lucide-react"
import { cn } from "@/lib/utils"
import type { LabVM } from "@/types/LabDefinition/LabDetail"

interface LabVMsProps {
    vms: LabVM[]
}

function getOSIcon(osType: string): string {
    const os = osType.toLowerCase()
    if (os.includes("windows")) return "🪟"
    if (os.includes("ubuntu")) return "🐧"
    if (os.includes("debian")) return "🐧"
    if (os.includes("centos")) return "🐧"
    if (os.includes("redhat")) return "🐧"
    if (os.includes("linux")) return "🐧"
    return "🖥️"
}

export function LabVMs({ vms }: LabVMsProps) {
    if (!vms || vms.length === 0) {
        return null
    }

    return (
        <div className="rounded-xl border border-[#e8e8e8] bg-white p-6">
            <div className="mb-5 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#1ca9b1]/10">
                    <Computer className="h-5 w-5 text-[#1ca9b1]" />
                </div>
                <div>
                    <h2 className="text-[16px] font-semibold text-[#3a3a3a]">
                        Virtual Machines
                    </h2>
                    <p className="text-[12px] text-[#727373]">
                        Resources provisioned for this lab
                    </p>
                </div>
            </div>

            <div className={cn(
                "grid gap-4",
                vms.length === 1 ? "grid-cols-1" : "sm:grid-cols-2"
            )}>
                {vms.map((vm) => (
                    <div
                        key={vm.id}
                        className={cn(
                            "group relative overflow-hidden rounded-xl border border-[#e8e8e8] bg-[#fafafa] p-5",
                            "transition-all duration-200 hover:border-[#1ca9b1]/30 hover:shadow-md"
                        )}
                    >
                        {/* OS Icon */}
                        <div className="absolute right-4 top-4 text-3xl opacity-30 group-hover:opacity-50 transition-opacity">
                            {getOSIcon(vm.os_type)}
                        </div>

                        {/* VM Name */}
                        <div className="mb-4">
                            <h3 className="text-[14px] font-semibold text-[#3a3a3a]">
                                {vm.name}
                            </h3>
                            {vm.description && (
                                <p className="mt-1 text-[12px] text-[#727373] line-clamp-2">
                                    {vm.description}
                                </p>
                            )}
                        </div>

                        {/* Specs Grid */}
                        <div className="grid grid-cols-2 gap-3">
                            <div className="flex items-center gap-2 rounded-lg bg-white border border-[#f0f0f0] px-3 py-2">
                                <Cpu className="h-3.5 w-3.5 text-[#1ca9b1]" />
                                <span className="text-[11px] font-medium text-[#727373]">
                                    {vm.cpu_cores} vCPUs
                                </span>
                            </div>
                            <div className="flex items-center gap-2 rounded-lg bg-white border border-[#f0f0f0] px-3 py-2">
                                <MemoryStick className="h-3.5 w-3.5 text-[#1ca9b1]" />
                                <span className="text-[11px] font-medium text-[#727373]">
                                    {vm.memory_mb} MB RAM
                                </span>
                            </div>
                            <div className="flex items-center gap-2 rounded-lg bg-white border border-[#f0f0f0] px-3 py-2">
                                <HardDrive className="h-3.5 w-3.5 text-[#1ca9b1]" />
                                <span className="text-[11px] font-medium text-[#727373]">
                                    {vm.disk_gb} GB Disk
                                </span>
                            </div>
                            <div className="flex items-center gap-2 rounded-lg bg-white border border-[#f0f0f0] px-3 py-2">
                                <span className="text-[11px] font-medium text-[#727373] truncate">
                                    {vm.os_type}
                                </span>
                            </div>
                        </div>

                        {/* Hostname */}
                        {vm.hostname && (
                            <div className="mt-3 pt-3 border-t border-[#f0f0f0]">
                                <span className="text-[11px] text-[#727373]">
                                    Host: <code className="text-[#1ca9b1] font-mono bg-[#1ca9b1]/5 px-1.5 py-0.5 rounded">{vm.hostname}</code>
                                </span>
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    )
}