// src/components/LabInstance/admin/ViewLabInstance/OverviewTab.tsx
import { cn } from "@/lib/utils"
import {
    Server,
    Monitor,
    Globe,
    User,
    Clock,
    Info,
    Hash,
    Link2,
    AlertCircle,
} from "lucide-react"
import type { LabInstance } from "@/types/LabInstance/LabInstance"

interface OverviewTabProps {
    instance: LabInstance
}

function InfoRow({
    icon: Icon,
    label,
    value,
    mono = false,
    highlight = false,
}: {
    icon: React.ElementType
    label: string
    value: string | null | undefined
    mono?: boolean
    highlight?: boolean
}) {
    return (
        <div className="flex items-start gap-3 py-3 border-b border-[#f0f0f0] last:border-0">
            <Icon className="h-4 w-4 text-[#c4c4c4] shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
                <p className="text-[11px] font-medium text-[#727373] uppercase tracking-wider">
                    {label}
                </p>
                <p
                    className={cn(
                        "text-[13px] text-[#3a3a3a] mt-0.5 truncate",
                        mono && "font-mono",
                        highlight && "text-[#1ca9b1] font-medium"
                    )}
                >
                    {value || "—"}
                </p>
            </div>
        </div>
    )
}

function formatDate(dateStr: string | null | undefined): string {
    if (!dateStr) return "—"
    return new Date(dateStr).toLocaleString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
    })
}

export function OverviewTab({ instance }: OverviewTabProps) {
    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* VM Details */}
            <div className="border border-[#e8e8e8] rounded-xl bg-white shadow-sm overflow-hidden">
                <div className="px-5 py-3 border-b border-[#e8e8e8] bg-[#f9f9f9]">
                    <div className="flex items-center gap-2">
                        <Monitor className="h-4 w-4 text-[#1ca9b1]" />
                        <h3 className="text-[13px] font-semibold text-[#3a3a3a]">
                            VM Details
                        </h3>
                    </div>
                </div>
                <div className="px-5">
                    <InfoRow icon={Hash} label="VM UUID" value={instance.vm_uuid} mono />
                    <InfoRow icon={Server} label="VM Name" value={instance.vm_name} />
                    <InfoRow icon={Globe} label="IP Address" value={instance.ip_address} highlight />
                    <InfoRow
                        icon={Info}
                        label="Power State"
                        value={instance.power_state || undefined}
                    />
                </div>
            </div>

            {/* Identity & Ownership */}
            <div className="border border-[#e8e8e8] rounded-xl bg-white shadow-sm overflow-hidden">
                <div className="px-5 py-3 border-b border-[#e8e8e8] bg-[#f9f9f9]">
                    <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-[#1ca9b1]" />
                        <h3 className="text-[13px] font-semibold text-[#3a3a3a]">
                            Identity
                        </h3>
                    </div>
                </div>
                <div className="px-5">
                    <InfoRow icon={Hash} label="Instance ID" value={instance.id} mono />
                    <InfoRow
                        icon={Hash}
                        label="Lab Definition ID"
                        value={instance.lab_definition_id}
                        mono
                    />
                    <InfoRow icon={User} label="Trainee ID" value={instance.trainee_id} mono />
                    <InfoRow
                        icon={Hash}
                        label="Guide Version"
                        value={instance.guide_version_id || undefined}
                        mono
                    />
                </div>
            </div>

            {/* Timing */}
            <div className="border border-[#e8e8e8] rounded-xl bg-white shadow-sm overflow-hidden">
                <div className="px-5 py-3 border-b border-[#e8e8e8] bg-[#f9f9f9]">
                    <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-[#1ca9b1]" />
                        <h3 className="text-[13px] font-semibold text-[#3a3a3a]">
                            Timeline
                        </h3>
                    </div>
                </div>
                <div className="px-5">
                    <InfoRow icon={Clock} label="Created" value={formatDate(instance.created_at)} />
                    <InfoRow icon={Clock} label="Started" value={formatDate(instance.started_at)} />
                    <InfoRow icon={Clock} label="Stopped" value={formatDate(instance.stopped_at)} />
                    <InfoRow icon={Clock} label="Expires" value={formatDate(instance.expires_at)} />
                </div>
            </div>

            {/* Connections & Session */}
            <div className="border border-[#e8e8e8] rounded-xl bg-white shadow-sm overflow-hidden">
                <div className="px-5 py-3 border-b border-[#e8e8e8] bg-[#f9f9f9]">
                    <div className="flex items-center gap-2">
                        <Link2 className="h-4 w-4 text-[#1ca9b1]" />
                        <h3 className="text-[13px] font-semibold text-[#3a3a3a]">
                            Connections & Session
                        </h3>
                    </div>
                </div>
                <div className="px-5">
                    <InfoRow
                        icon={Link2}
                        label="Connection URL"
                        value={instance.connection_url || undefined}
                        mono
                    />
                    <InfoRow
                        icon={Hash}
                        label="Guacamole Connection ID"
                        value={instance.guacamole_connection_id || undefined}
                        mono
                    />
                    <InfoRow
                        icon={Info}
                        label="Current Step"
                        value={instance.current_step_index?.toString()}
                    />
                </div>
            </div>

            {/* Error (only if present) */}
            {instance.error_message && (
                <div className="lg:col-span-2 border border-red-200 rounded-xl bg-red-50 overflow-hidden">
                    <div className="px-5 py-3 border-b border-red-200 bg-red-100/50">
                        <div className="flex items-center gap-2">
                            <AlertCircle className="h-4 w-4 text-red-600" />
                            <h3 className="text-[13px] font-semibold text-red-800">
                                Error
                            </h3>
                        </div>
                    </div>
                    <div className="px-5 py-3">
                        <p className="text-[13px] text-red-700 font-mono whitespace-pre-wrap">
                            {instance.error_message}
                        </p>
                    </div>
                </div>
            )}
        </div>
    )
}