// src/components/LabInstance/admin/MonitoringDashboard/MonitoringTaskTable.tsx
import { cn } from "@/lib/utils"
import { Clock, Hash, Server, ExternalLink } from "lucide-react"
import type { LabInstanceTask } from "@/types/LabInstance/LabInstanceTask"

interface MonitoringTaskTableProps {
    tasks: LabInstanceTask[]
    isLoading: boolean
    onViewInstance: (instanceId: string) => void
}

function SkeletonRow() {
    return (
        <div className="animate-pulse flex items-center gap-4 px-5 py-4 border-b border-[#f0f0f0] last:border-0">
            <div className="h-5 w-24 bg-[#f0f0f0] rounded-full shrink-0" />
            <div className="h-4 w-16 bg-[#f0f0f0] rounded shrink-0" />
            <div className="flex-1 h-4 bg-[#f0f0f0] rounded" />
            <div className="h-4 w-20 bg-[#f0f0f0] rounded shrink-0" />
        </div>
    )
}

function StatusBadge({ status }: { status: string }) {
    const cls = {
        completed: "bg-emerald-50 text-emerald-700 border-emerald-200",
        failed: "bg-red-50 text-red-700 border-red-200",
        running: "bg-amber-50 text-amber-700 border-amber-200",
        queued: "bg-slate-50 text-slate-700 border-slate-200",
    }[status] || "bg-slate-50 text-slate-700 border-slate-200"

    return (
        <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide border", cls)}>
            {status}
        </span>
    )
}

function formatDate(dateStr: string | null): string {
    if (!dateStr) return "—"
    return new Date(dateStr).toLocaleString(undefined, {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
    })
}

export function MonitoringTaskTable({
    tasks,
    isLoading,
    onViewInstance,
}: MonitoringTaskTableProps) {
    if (!isLoading && tasks.length === 0) {
        return (
            <div className="border border-[#e8e8e8] rounded-xl bg-white shadow-sm p-12 text-center">
                <div className="w-12 h-12 rounded-full bg-[#f5f5f5] flex items-center justify-center mx-auto mb-4">
                    <Clock className="h-6 w-6 text-[#c4c4c4]" />
                </div>
                <h3 className="text-sm font-medium text-[#3a3a3a]">No monitoring tasks</h3>
                <p className="text-xs text-[#727373] mt-1">
                    Monitoring tasks appear when the system auto-terminates or health-checks instances
                </p>
            </div>
        )
    }

    return (
        <div className="border border-[#e8e8e8] rounded-xl bg-white shadow-sm overflow-hidden">
            {/* Header */}
            <div className="grid grid-cols-[1fr_100px_140px_180px_80px] gap-4 px-5 py-3 bg-[#fafafa] border-b border-[#e8e8e8] text-[11px] font-semibold text-[#727373] uppercase tracking-wider">
                <span>Task Type</span>
                <span>Status</span>
                <span>Instance</span>
                <span>Timeline</span>
                <span className="text-right">Action</span>
            </div>

            <div className="divide-y divide-[#f0f0f0]">
                {isLoading ? (
                    <>
                        <SkeletonRow />
                        <SkeletonRow />
                        <SkeletonRow />
                    </>
                ) : (
                    tasks.map((task) => (
                        <div
                            key={task.id}
                            className="grid grid-cols-[1fr_100px_140px_180px_80px] gap-4 px-5 py-4 items-center transition-colors hover:bg-[#f9f9f9]"
                        >
                            <div>
                                <p className="text-[13px] font-medium text-[#3a3a3a]">
                                    {task.task_type.replace("monitoring.", "")}
                                </p>
                                <div className="flex items-center gap-1.5 mt-1">
                                    <Hash className="h-3 w-3 text-[#c4c4c4]" />
                                    <span className="text-[10px] text-[#c4c4c4] font-mono">
                                        {task.id.slice(0, 8)}
                                    </span>
                                </div>
                            </div>

                            <div>
                                <StatusBadge status={task.status} />
                            </div>

                            <div className="flex items-center gap-1.5">
                                <Server className="h-3.5 w-3.5 text-[#c4c4c4]" />
                                <span className="text-[12px] text-[#727373] font-mono">
                                    {task.lab_instance_id.slice(0, 8)}
                                </span>
                            </div>

                            <div className="text-[11px] text-[#727373] space-y-0.5">
                                <div className="flex items-center gap-1.5">
                                    <span className="text-[#c4c4c4] w-8">Start</span>
                                    <span>{formatDate(task.started_at)}</span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                    <span className="text-[#c4c4c4] w-8">End</span>
                                    <span>{formatDate(task.finished_at)}</span>
                                </div>
                            </div>

                            <div className="text-right">
                                <button
                                    onClick={() => onViewInstance(task.lab_instance_id)}
                                    className="inline-flex items-center gap-1 text-[11px] text-[#1ca9b1] hover:text-[#17959c] font-medium transition-colors"
                                >
                                    <ExternalLink className="h-3 w-3" />
                                    View
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    )
}