// src/components/LabInstance/admin/ViewLabInstance/TabNav.tsx
import { cn } from "@/lib/utils"

export type TabId = "overview" | "tasks" | "events"

interface TabNavProps {
    activeTab: TabId
    onChange: (tab: TabId) => void
}

const tabs: { id: TabId; label: string }[] = [
    { id: "overview", label: "Overview" },
    { id: "tasks", label: "Tasks" },
    { id: "events", label: "Events" },
]

export function TabNav({ activeTab, onChange }: TabNavProps) {
    return (
        <div className="bg-white border-b border-[#e8e8e8] px-6">
            <div className="w-full px-4 flex items-center gap-1">
                {tabs.map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => onChange(tab.id)}
                        className={cn(
                            "relative px-4 py-3 text-[13px] font-medium transition-colors",
                            activeTab === tab.id
                                ? "text-[#1ca9b1]"
                                : "text-[#727373] hover:text-[#3a3a3a]"
                        )}
                    >
                        {tab.label}
                        {activeTab === tab.id && (
                            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#1ca9b1] rounded-full" />
                        )}
                    </button>
                ))}
            </div>
        </div>
    )
}