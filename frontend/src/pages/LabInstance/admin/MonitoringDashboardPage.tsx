// src/pages/LabInstance/admin/MonitoringDashboardPage.tsx
import { useState, useEffect, useCallback } from "react"
import { useNavigate } from "react-router-dom"
import { cn } from "@/lib/utils"
import { Activity, RefreshCw, AlertTriangle } from "lucide-react"
import { useMonitorTasks } from "@/hooks/LabInstance/admin/useMonitorTasks"
import { useMonitorEvents } from "@/hooks/LabInstance/admin/useMonitorEvents"
import { MonitoringTaskTable } from "@/components/LabInstance/admin/MonitoringDashboard/MonitoringTaskTable"
import { MonitoringEventList } from "@/components/LabInstance/admin/MonitoringDashboard/MonitoringEventList"
import { MonitoringFilterBar } from "@/components/LabInstance/admin/MonitoringDashboard/MonitoringFilterBar"

type ViewMode = "tasks" | "events"

export default function MonitoringDashboardPage() {
    const navigate = useNavigate()

    const {
        tasks,
        total: tasksTotal,
        isLoading: tasksLoading,
        error: tasksError,
        fetchMonitoringTasks,
    } = useMonitorTasks()

    const {
        events,
        total: eventsTotal,
        isLoading: eventsLoading,
        error: eventsError,
        fetchMonitoringEvents,
    } = useMonitorEvents()

    const [viewMode, setViewMode] = useState<ViewMode>("tasks")
    const [taskTypeFilter, setTaskTypeFilter] = useState("")
    const [statusFilter, setStatusFilter] = useState("")
    const [eventTypeFilter, setEventTypeFilter] = useState("")

    const hasActiveFilters =
        (viewMode === "tasks" && (taskTypeFilter || statusFilter)) ||
        (viewMode === "events" && eventTypeFilter)

    const loadTasks = useCallback(
        (skip = 0, limit = 100) => {
            fetchMonitoringTasks({
                task_type: taskTypeFilter || undefined,
                status: statusFilter || undefined,
                skip,
                limit,
            })
        },
        [fetchMonitoringTasks, taskTypeFilter, statusFilter]
    )

    const loadEvents = useCallback(
        (skip = 0, limit = 100) => {
            fetchMonitoringEvents({
                event_type: eventTypeFilter || undefined,
                skip,
                limit,
            })
        },
        [fetchMonitoringEvents, eventTypeFilter]
    )

    useEffect(() => {
        loadTasks(0, 100)
    }, [loadTasks])

    useEffect(() => {
        loadEvents(0, 100)
    }, [loadEvents])

    const handleRefresh = useCallback(() => {
        if (viewMode === "tasks") {
            loadTasks(0, 100)
        } else {
            loadEvents(0, 100)
        }
    }, [viewMode, loadTasks, loadEvents])

    const handleClearFilters = useCallback(() => {
        setTaskTypeFilter("")
        setStatusFilter("")
        setEventTypeFilter("")
    }, [])

    const handleViewInstance = useCallback(
        (instanceId: string) => {
            navigate(`/admin/lab-instances/${instanceId}`)
        },
        [navigate]
    )

    return (
        <div className="flex flex-col h-full bg-[#f9f9f9]">
            {/* Header */}
            <div className="bg-white border-b border-[#e8e8e8] px-6 py-5 shrink-0">
                <div className="flex items-center justify-between w-full px-4">
                    <div>
                        <h1 className="text-xl font-semibold text-[#3a3a3a]">
                            Monitoring Audit
                        </h1>
                        <p className="text-sm text-[#727373] mt-0.5">
                            Platform-wide auto-termination and health-check activity logs
                        </p>
                    </div>

                    <button
                        onClick={handleRefresh}
                        disabled={tasksLoading || eventsLoading}
                        className={cn(
                            "flex items-center gap-2 rounded-lg px-4 py-2",
                            "border border-[#e8e8e8] bg-white text-[#3a3a3a] text-sm font-medium",
                            "hover:bg-[#f5f5f5] hover:border-[#d4d4d4]",
                            "transition-all duration-200 disabled:opacity-50"
                        )}
                    >
                        <RefreshCw className={cn("h-4 w-4", (tasksLoading || eventsLoading) && "animate-spin")} />
                        <span>Refresh</span>
                    </button>
                </div>
            </div>

            {/* View Toggle + Filters */}
            <div className="bg-white border-b border-[#e8e8e8] px-6 py-3 shrink-0">
                <div className="w-full px-4 flex items-center gap-6">
                    {/* Tabs */}
                    <div className="flex items-center gap-1 bg-[#f5f5f5] rounded-lg p-1">
                        <button
                            onClick={() => setViewMode("tasks")}
                            className={cn(
                                "px-4 py-1.5 rounded-md text-[13px] font-medium transition-all",
                                viewMode === "tasks"
                                    ? "bg-white text-[#3a3a3a] shadow-sm"
                                    : "text-[#727373] hover:text-[#3a3a3a]"
                            )}
                        >
                            Tasks
                        </button>
                        <button
                            onClick={() => setViewMode("events")}
                            className={cn(
                                "px-4 py-1.5 rounded-md text-[13px] font-medium transition-all",
                                viewMode === "events"
                                    ? "bg-white text-[#3a3a3a] shadow-sm"
                                    : "text-[#727373] hover:text-[#3a3a3a]"
                            )}
                        >
                            Events
                        </button>
                    </div>

                    {/* Filters (via component) */}
                    <MonitoringFilterBar
                        viewMode={viewMode}
                        taskTypeFilter={taskTypeFilter}
                        statusFilter={statusFilter}
                        eventTypeFilter={eventTypeFilter}
                        onTaskTypeChange={setTaskTypeFilter}
                        onStatusChange={setStatusFilter}
                        onEventTypeChange={setEventTypeFilter}
                        onClearFilters={handleClearFilters}
                        hasActiveFilters={!!hasActiveFilters}
                    />
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6">
                <div className="w-full px-4 space-y-4">
                    {/* Info banner */}
                    <div className="flex items-start gap-3 p-4 bg-[#e6f7f8] border border-[#1ca9b1]/20 rounded-lg">
                        <Activity className="h-5 w-5 text-[#1ca9b1] shrink-0 mt-0.5" />
                        <div>
                            <p className="text-sm font-medium text-[#3a3a3a]">
                                {viewMode === "tasks"
                                    ? `${tasksTotal} monitoring task${tasksTotal !== 1 ? "s" : ""}`
                                    : `${eventsTotal} monitoring event${eventsTotal !== 1 ? "s" : ""}`}
                            </p>
                            <p className="text-xs text-[#727373] mt-0.5">
                                {viewMode === "tasks"
                                    ? "Tasks represent automated actions taken by the monitoring system on lab instances."
                                    : "Events are granular log entries for each step of a monitoring action."}
                            </p>
                        </div>
                    </div>

                    {/* Error state */}
                    {(viewMode === "tasks" ? tasksError : eventsError) && (
                        <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-lg">
                            <AlertTriangle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
                            <div>
                                <p className="text-sm font-medium text-red-800">
                                    Failed to load {viewMode}
                                </p>
                                <p className="text-xs text-red-600 mt-0.5">
                                    {viewMode === "tasks" ? tasksError : eventsError}
                                </p>
                            </div>
                        </div>
                    )}

                    {viewMode === "tasks" ? (
                        <MonitoringTaskTable
                            tasks={tasks}
                            isLoading={tasksLoading}
                            onViewInstance={handleViewInstance}
                        />
                    ) : (
                        <MonitoringEventList
                            events={events}
                            isLoading={eventsLoading}
                            onViewInstance={handleViewInstance}
                        />
                    )}
                </div>
            </div>
        </div>
    )
}