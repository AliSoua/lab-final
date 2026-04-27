// src/components/LabInstance/admin/ViewLabInstance/InstanceHeader.tsx
import { cn } from "@/lib/utils"
import { Server, ArrowLeft, Power } from "lucide-react"
import type { LabInstance } from "@/types/LabInstance/LabInstance"
import { StatusBadge } from "@/components/LabInstance/admin/ListLabInstance/StatusBadge"

interface InstanceHeaderProps {
    instance: LabInstance
    onBack: () => void
}

export function InstanceHeader({ instance, onBack }: InstanceHeaderProps) {
    return (
        <div className="bg-white border-b border-[#e8e8e8] px-6 py-5 shrink-0">
            <div className="w-full px-4">
                <button
                    onClick={onBack}
                    className={cn(
                        "flex items-center gap-1.5 text-sm text-[#727373] hover:text-[#3a3a3a]",
                        "transition-colors mb-3"
                    )}
                >
                    <ArrowLeft className="h-4 w-4" />
                    <span>Back to Instances</span>
                </button>

                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-[#e6f7f8] flex items-center justify-center text-[#1ca9b1] shrink-0">
                            <Server className="h-5 w-5" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2.5">
                                <h1 className="text-lg font-semibold text-[#3a3a3a]">
                                    {instance.vm_name || instance.id.slice(0, 8)}
                                </h1>
                                <StatusBadge status={instance.status} />
                            </div>
                            <p className="text-xs text-[#727373] mt-0.5">
                                {instance.vcenter_host || "No vCenter"} · ID: {instance.id}
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#f9f9f9] border border-[#e8e8e8]">
                            <Power
                                className={cn(
                                    "h-3.5 w-3.5",
                                    instance.power_state === "poweredOn"
                                        ? "text-emerald-500"
                                        : "text-gray-400"
                                )}
                            />
                            <span className="text-xs font-medium text-[#3a3a3a] capitalize">
                                {instance.power_state || "Unknown"}
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}