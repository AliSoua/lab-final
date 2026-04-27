// src/components/LabInstance/admin/ViewLabInstance/TasksTab.tsx
import { useEffect } from "react"
import { cn } from "@/lib/utils"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { ListTodo, Clock, Server, User } from "lucide-react"
import { TaskStatusBadge } from "./TaskStatusBadge"
import type { LabInstanceTask } from "@/types/LabInstance/LabInstanceTask"

interface TasksTabProps {
    instanceId: string
    tasks: LabInstanceTask[]
    total: number
    isLoading: boolean
    error: string | null
    onFetch: (instanceId: string, skip?: number, limit?: number) => void
}

function SkeletonRow() {
    return (
        <TableRow className="animate-pulse">
            <TableCell><div className="h-4 w-24 bg-[#f0f0f0] rounded" /></TableCell>
            <TableCell><div className="h-5 w-16 bg-[#f0f0f0] rounded-full" /></TableCell>
            <TableCell><div className="h-4 w-20 bg-[#f0f0f0] rounded" /></TableCell>
            <TableCell><div className="h-4 w-20 bg-[#f0f0f0] rounded" /></TableCell>
            <TableCell><div className="h-4 w-20 bg-[#f0f0f0] rounded" /></TableCell>
            <TableCell><div className="h-4 w-24 bg-[#f0f0f0] rounded" /></TableCell>
        </TableRow>
    )
}

function formatDate(dateStr: string | null): string {
    if (!dateStr) return "—"
    return new Date(dateStr).toLocaleString(undefined, {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    })
}

function formatDuration(started: string | null, finished: string | null): string {
    if (!started || !finished) return "—"
    const diff = new Date(finished).getTime() - new Date(started).getTime()
    if (diff < 1000) return "< 1s"
    const seconds = Math.floor(diff / 1000)
    if (seconds < 60) return `${seconds}s`
    const minutes = Math.floor(seconds / 60)
    const rem = seconds % 60
    return `${minutes}m ${rem}s`
}

export function TasksTab({
    instanceId,
    tasks,
    total,
    isLoading,
    error,
    onFetch,
}: TasksTabProps) {
    useEffect(() => {
        onFetch(instanceId, 0, 100)
    }, [instanceId, onFetch])

    if (!isLoading && tasks.length === 0) {
        return (
            <div className="border border-[#e8e8e8] rounded-xl bg-white shadow-sm p-12 text-center">
                <div className="w-12 h-12 rounded-full bg-[#f5f5f5] flex items-center justify-center mx-auto mb-4">
                    <ListTodo className="h-6 w-6 text-[#c4c4c4]" />
                </div>
                <h3 className="text-sm font-medium text-[#3a3a3a]">No tasks</h3>
                <p className="text-xs text-[#727373] mt-1">
                    Background tasks will appear here when operations are queued
                </p>
            </div>
        )
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <p className="text-xs text-[#727373]">
                    {total} task{total !== 1 ? "s" : ""} found
                </p>
            </div>

            {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-xs text-red-700">{error}</p>
                </div>
            )}

            <div className="border border-[#e8e8e8] rounded-xl bg-white shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-[#f9f9f9] hover:bg-[#f9f9f9]">
                                <TableHead className="text-xs font-semibold text-[#727373] uppercase tracking-wider">
                                    Type
                                </TableHead>
                                <TableHead className="text-xs font-semibold text-[#727373] uppercase tracking-wider">
                                    Status
                                </TableHead>
                                <TableHead className="text-xs font-semibold text-[#727373] uppercase tracking-wider">
                                    Enqueued
                                </TableHead>
                                <TableHead className="text-xs font-semibold text-[#727373] uppercase tracking-wider">
                                    Started
                                </TableHead>
                                <TableHead className="text-xs font-semibold text-[#727373] uppercase tracking-wider">
                                    Duration
                                </TableHead>
                                <TableHead className="text-xs font-semibold text-[#727373] uppercase tracking-wider">
                                    Worker
                                </TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                <>
                                    <SkeletonRow />
                                    <SkeletonRow />
                                    <SkeletonRow />
                                </>
                            ) : (
                                tasks.map((task, index) => (
                                    <TableRow
                                        key={task.id}
                                        className={cn(
                                            "transition-colors",
                                            index % 2 === 0 ? "bg-white" : "bg-[#f9f9f9]/50",
                                            "hover:bg-[#f5f5f5]"
                                        )}
                                    >
                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                <ListTodo className="h-3.5 w-3.5 text-[#1ca9b1]" />
                                                <span className="text-[13px] font-medium text-[#3a3a3a]">
                                                    {task.task_type}
                                                </span>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <TaskStatusBadge status={task.status} />
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-1.5">
                                                <Clock className="h-3 w-3 text-[#c4c4c4]" />
                                                <span className="text-[13px] text-[#3a3a3a]">
                                                    {formatDate(task.enqueued_at)}
                                                </span>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <span className="text-[13px] text-[#3a3a3a]">
                                                {formatDate(task.started_at)}
                                            </span>
                                        </TableCell>
                                        <TableCell>
                                            <span className="text-[13px] text-[#727373] font-mono">
                                                {formatDuration(task.started_at, task.finished_at)}
                                            </span>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-1.5">
                                                <Server className="h-3 w-3 text-[#c4c4c4]" />
                                                <span className="text-[13px] text-[#3a3a3a] font-mono">
                                                    {task.worker_host || "—"}
                                                </span>
                                                {task.worker_pid && (
                                                    <span className="text-[11px] text-[#c4c4c4]">
                                                        (pid {task.worker_pid})
                                                    </span>
                                                )}
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>
            </div>
        </div>
    )
}