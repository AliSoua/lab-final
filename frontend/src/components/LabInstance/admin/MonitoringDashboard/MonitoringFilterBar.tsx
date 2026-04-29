// src/components/LabInstance/admin/MonitoringDashboard/MonitoringFilterBar.tsx
import { cn } from "@/lib/utils"
import { Filter, X } from "lucide-react"

interface MonitoringFilterBarProps {
    viewMode: "tasks" | "events"
    taskTypeFilter: string
    statusFilter: string
    eventTypeFilter: string
    onTaskTypeChange: (value: string) => void
    onStatusChange: (value: string) => void
    onEventTypeChange: (value: string) => void
    onClearFilters: () => void
    hasActiveFilters: boolean
}

export function MonitoringFilterBar({
    viewMode,
    taskTypeFilter,
    statusFilter,
    eventTypeFilter,
    onTaskTypeChange,
    onStatusChange,
    onEventTypeChange,
    onClearFilters,
    hasActiveFilters,
}: MonitoringFilterBarProps) {
    return (
        <div className="flex items-center gap-3 flex-1">
            <Filter className="h-3.5 w-3.5 text-[#c4c4c4] shrink-0" />

            {viewMode === "tasks" ? (
                <>
                    <div className="relative">
                        <select
                            value={taskTypeFilter}
                            onChange={(e) => onTaskTypeChange(e.target.value)}
                            className={cn(
                                "appearance-none text-[12px] border rounded-md px-3 py-1.5 pr-8 bg-white",
                                "focus:outline-none focus:border-[#1ca9b1] transition-colors",
                                taskTypeFilter
                                    ? "border-[#1ca9b1] text-[#1ca9b1] font-medium"
                                    : "border-[#e8e8e8] text-[#3a3a3a]"
                            )}
                        >
                            <option value="">All task types</option>
                            <option value="monitoring.session_timeout">Session Timeout</option>
                            <option value="monitoring.health_check">Health Check</option>
                        </select>
                        <div className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2">
                            <svg className="h-3 w-3 text-[#727373]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                        </div>
                    </div>

                    <div className="relative">
                        <select
                            value={statusFilter}
                            onChange={(e) => onStatusChange(e.target.value)}
                            className={cn(
                                "appearance-none text-[12px] border rounded-md px-3 py-1.5 pr-8 bg-white",
                                "focus:outline-none focus:border-[#1ca9b1] transition-colors",
                                statusFilter
                                    ? "border-[#1ca9b1] text-[#1ca9b1] font-medium"
                                    : "border-[#e8e8e8] text-[#3a3a3a]"
                            )}
                        >
                            <option value="">All statuses</option>
                            <option value="completed">Completed</option>
                            <option value="failed">Failed</option>
                            <option value="running">Running</option>
                            <option value="queued">Queued</option>
                        </select>
                        <div className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2">
                            <svg className="h-3 w-3 text-[#727373]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                        </div>
                    </div>
                </>
            ) : (
                <div className="relative">
                    <select
                        value={eventTypeFilter}
                        onChange={(e) => onEventTypeChange(e.target.value)}
                        className={cn(
                            "appearance-none text-[12px] border rounded-md px-3 py-1.5 pr-8 bg-white",
                            "focus:outline-none focus:border-[#1ca9b1] transition-colors",
                            eventTypeFilter
                                ? "border-[#1ca9b1] text-[#1ca9b1] font-medium"
                                : "border-[#e8e8e8] text-[#3a3a3a]"
                        )}
                    >
                        <option value="">All event types</option>
                        <option value="expired_instance_detected">Expired Detected</option>
                        <option value="instance_auto_terminated">Auto Terminated</option>
                        <option value="auto_terminate_failed">Terminate Failed</option>
                        <option value="unhealthy_instance_detected">Unhealthy Detected</option>
                        <option value="instance_auto_failed">Auto Failed</option>
                        <option value="auto_fail_failed">Auto Fail Failed</option>
                        <option value="task_queued">Task Queued</option>
                        <option value="task_started">Task Started</option>
                        <option value="task_completed">Task Completed</option>
                        <option value="task_failed">Task Failed</option>
                    </select>
                    <div className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2">
                        <svg className="h-3 w-3 text-[#727373]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                    </div>
                </div>
            )}

            {hasActiveFilters && (
                <button
                    onClick={onClearFilters}
                    className={cn(
                        "flex items-center gap-1 text-[11px] font-medium text-[#727373]",
                        "hover:text-red-600 transition-colors"
                    )}
                >
                    <X className="h-3 w-3" />
                    Clear
                </button>
            )}
        </div>
    )
}