// src/components/LabGuide/CreateGuideLab/StepEditor/StepEditorModal.tsx
import { useState, useEffect } from "react"
import { cn } from "@/lib/utils"
import { X, Terminal, Shield, HelpCircle, FileText } from "lucide-react"
import type { LabGuideStepCreateRequest } from "@/types/LabGuide"
import { MetaFields } from "./MetaFields"
import { ContentTab } from "./ContentTab"
import { ChecksTab } from "./ChecksTab"
import { QuizTab } from "./QuizTab"

interface StepEditorModalProps {
    isOpen: boolean
    onClose: () => void
    initialData: LabGuideStepCreateRequest | null
    onSave: (data: LabGuideStepCreateRequest) => void
}

const EMPTY_STEP: LabGuideStepCreateRequest = {
    title: "",
    description: "",
    theory_content: "",
    commands: [],
    tasks: [],
    hints: [],
    validations: [],
    quiz: undefined,
    points: 10,
}

type EditorTab = "content" | "checks" | "quiz"

const TABS: { key: EditorTab; label: string; icon: React.ElementType }[] = [
    { key: "content", label: "Content", icon: Terminal },
    { key: "checks", label: "Checks & Hints", icon: Shield },
    { key: "quiz", label: "Quiz", icon: HelpCircle },
]

export function StepEditorModal({ isOpen, onClose, initialData, onSave }: StepEditorModalProps) {
    const [data, setData] = useState<LabGuideStepCreateRequest>(EMPTY_STEP)
    const [activeTab, setActiveTab] = useState<EditorTab>("content")

    useEffect(() => {
        if (isOpen) {
            setData(initialData ? { ...initialData } : EMPTY_STEP)
            setActiveTab("content")
        }
    }, [isOpen, initialData])

    if (!isOpen) return null

    const update = <K extends keyof LabGuideStepCreateRequest>(
        key: K,
        value: LabGuideStepCreateRequest[K]
    ) => {
        setData((prev) => ({ ...prev, [key]: value }))
    }

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        if (!data.title.trim()) return
        onSave(data)
    }

    const isValid = data.title.trim().length > 0

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

            <div className="relative w-full max-w-5xl h-[90vh] bg-white rounded-xl border border-[#e8e8e8] shadow-2xl mx-4 flex flex-col overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-[#e8e8e8] shrink-0 bg-white">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-[#e6f7f8] flex items-center justify-center text-[#1ca9b1]">
                            <FileText className="h-4 w-4" />
                        </div>
                        <div>
                            <h2 className="text-[15px] font-semibold text-[#3a3a3a]">
                                {initialData ? "Edit Step" : "New Step"}
                            </h2>
                            <p className="text-[11px] text-[#727373]">
                                {initialData ? "Update this learning step" : "Define a new learning step"}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 text-[#c4c4c4] hover:text-[#3a3a3a] hover:bg-[#f5f5f5] rounded-lg transition-colors"
                    >
                        <X className="h-4 w-4" />
                    </button>
                </div>

                {/* Meta Fields - Always Visible */}
                <div className="px-6 py-4 border-b border-[#e8e8e8] bg-[#fafafa] shrink-0">
                    <MetaFields data={data} onChange={update} />
                </div>

                {/* Body: Sidebar + Content */}
                <form onSubmit={handleSubmit} className="flex flex-1 overflow-hidden">
                    {/* Sidebar */}
                    <div className="w-52 border-r border-[#e8e8e8] bg-[#fafafa] p-3 space-y-1 shrink-0 overflow-y-auto">
                        {TABS.map((tab) => {
                            const Icon = tab.icon
                            const isActive = activeTab === tab.key
                            return (
                                <button
                                    key={tab.key}
                                    type="button"
                                    onClick={() => setActiveTab(tab.key)}
                                    className={cn(
                                        "w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-left transition-all",
                                        isActive
                                            ? "bg-white text-[#1ca9b1] shadow-sm ring-1 ring-[#e8e8e8] font-medium"
                                            : "text-[#727373] hover:text-[#3a3a3a] hover:bg-white/60"
                                    )}
                                >
                                    <Icon className={cn("h-4 w-4", isActive ? "text-[#1ca9b1]" : "text-[#c4c4c4]")} />
                                    <span className="text-[13px]">{tab.label}</span>
                                </button>
                            )
                        })}

                        {/* Mini summary */}
                        <div className="mt-6 pt-4 border-t border-[#e8e8e8] px-3 space-y-2">
                            <p className="text-[10px] font-semibold text-[#c4c4c4] uppercase tracking-wider">Summary</p>
                            <div className="space-y-1">
                                <div className="flex justify-between text-[11px]">
                                    <span className="text-[#727373]">Commands</span>
                                    <span className="font-medium text-[#3a3a3a]">{data.commands.length}</span>
                                </div>
                                <div className="flex justify-between text-[11px]">
                                    <span className="text-[#727373]">Tasks</span>
                                    <span className="font-medium text-[#3a3a3a]">{data.tasks.length}</span>
                                </div>
                                <div className="flex justify-between text-[11px]">
                                    <span className="text-[#727373]">Validations</span>
                                    <span className="font-medium text-[#3a3a3a]">{data.validations.length}</span>
                                </div>
                                <div className="flex justify-between text-[11px]">
                                    <span className="text-[#727373]">Quiz</span>
                                    <span className="font-medium text-[#3a3a3a]">{data.quiz ? "Yes" : "No"}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Tab Content */}
                    <div className="flex-1 overflow-y-auto bg-white">
                        {activeTab === "content" && (
                            <ContentTab data={data} onChange={update} />
                        )}
                        {activeTab === "checks" && (
                            <ChecksTab data={data} onChange={update} />
                        )}
                        {activeTab === "quiz" && (
                            <QuizTab data={data} onChange={update} />
                        )}
                    </div>
                </form>

                {/* Footer */}
                <div className="flex items-center justify-between px-6 py-4 border-t border-[#e8e8e8] shrink-0 bg-white">
                    <div className="flex items-center gap-2">
                        {!isValid && (
                            <span className="text-[11px] text-red-500">Title is required</span>
                        )}
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 rounded-lg text-sm font-medium text-[#727373] hover:bg-[#f5f5f5] transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            onClick={handleSubmit}
                            disabled={!isValid}
                            className={cn(
                                "px-5 py-2 rounded-lg text-sm font-medium text-white transition-all",
                                isValid
                                    ? "bg-[#1ca9b1] hover:bg-[#17959c] hover:shadow-md"
                                    : "bg-[#e8e8e8] text-[#c4c4c4] cursor-not-allowed"
                            )}
                        >
                            {initialData ? "Save Changes" : "Add Step"}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}