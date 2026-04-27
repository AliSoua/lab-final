// src/pages/LabInstance/admin/ViewLabInstancePage.tsx
import { useState, useEffect, useCallback } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { useLabInstance } from "@/hooks/LabInstance/useLabInstance"
import { useLabInstanceTask } from "@/hooks/LabInstance/useLabInstanceTask"
import { useLabInstanceEvent } from "@/hooks/LabInstance/useLabInstanceEvent"
import { InstanceHeader } from "@/components/LabInstance/admin/ViewLabInstance/InstanceHeader"
import { TabNav, type TabId } from "@/components/LabInstance/admin/ViewLabInstance/TabNav"
import { OverviewTab } from "@/components/LabInstance/admin/ViewLabInstance/OverviewTab"
import { TasksTab } from "@/components/LabInstance/admin/ViewLabInstance/TasksTab"
import { EventsTab } from "@/components/LabInstance/admin/ViewLabInstance/EventsTab"
import type { LabInstance } from "@/types/LabInstance/LabInstance"

export default function ViewLabInstancePage() {
    const { id } = useParams<{ id: string }>()
    const navigate = useNavigate()

    const [activeTab, setActiveTab] = useState<TabId>("overview")
    const [instance, setInstance] = useState<LabInstance | null>(null)

    const { getInstance, isLoading: instanceLoading } = useLabInstance()
    const {
        tasks,
        total: tasksTotal,
        isLoading: tasksLoading,
        error: tasksError,
        fetchTasks,
    } = useLabInstanceTask()
    const {
        events,
        total: eventsTotal,
        isLoading: eventsLoading,
        error: eventsError,
        fetchEvents,
    } = useLabInstanceEvent()

    useEffect(() => {
        if (!id) return

        getInstance(id)
            .then(setInstance)
            .catch(() => {
                // Error toast handled by hook
            })
    }, [id, getInstance])

    const handleBack = useCallback(() => {
        navigate("/admin/lab-instances")
    }, [navigate])

    if (instanceLoading && !instance) {
        return (
            <div className="flex flex-col h-full bg-[#f9f9f9]">
                <div className="flex-1 flex items-center justify-center">
                    <div className="h-8 w-8 border-2 border-[#1ca9b1]/30 border-t-[#1ca9b1] rounded-full animate-spin" />
                </div>
            </div>
        )
    }

    if (!instance) {
        return (
            <div className="flex flex-col h-full bg-[#f9f9f9]">
                <div className="flex-1 flex items-center justify-center">
                    <div className="text-center">
                        <p className="text-sm text-[#727373]">Instance not found</p>
                        <button
                            onClick={handleBack}
                            className="mt-3 text-[13px] text-[#1ca9b1] hover:underline"
                        >
                            Go back
                        </button>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="flex flex-col h-full bg-[#f9f9f9]">
            <InstanceHeader instance={instance} onBack={handleBack} />
            <TabNav activeTab={activeTab} onChange={setActiveTab} />

            <div className="flex-1 overflow-y-auto p-6">
                <div className="w-full px-4">
                    {activeTab === "overview" && <OverviewTab instance={instance} />}
                    {activeTab === "tasks" && (
                        <TasksTab
                            instanceId={instance.id}
                            tasks={tasks}
                            total={tasksTotal}
                            isLoading={tasksLoading}
                            error={tasksError}
                            onFetch={fetchTasks}
                        />
                    )}
                    {activeTab === "events" && (
                        <EventsTab
                            instanceId={instance.id}
                            events={events}
                            total={eventsTotal}
                            isLoading={eventsLoading}
                            error={eventsError}
                            onFetch={fetchEvents}
                        />
                    )}
                </div>
            </div>
        </div>
    )
}