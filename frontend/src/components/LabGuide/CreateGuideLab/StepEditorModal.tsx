// src/components/LabGuide/CreateGuideLab/StepEditorModal.tsx
import { useState, useEffect } from "react"
import { cn } from "@/lib/utils"
import { X, Terminal, CheckCircle, Lightbulb, Shield, HelpCircle, Plus, Trash2 } from "lucide-react"
import type {
    LabGuideStepCreateRequest,
    GuideCommand,
    GuideTask,
    GuideHint,
    ValidationCheck,
    GuideQuiz,
} from "@/types/LabGuide"

interface StepEditorModalProps {
    isOpen: boolean
    onClose: () => void
    initialData: LabGuideStepCreateRequest | null
    onSave: (data: LabGuideStepCreateRequest) => void
}

const EMPTY_STEP: LabGuideStepCreateRequest = {
    title: "",
    description: "",
    target_vm_name: "",
    theory_content: "",
    commands: [],
    tasks: [],
    hints: [],
    validations: [],
    quiz: undefined,
    points: 10,
}

export function StepEditorModal({ isOpen, onClose, initialData, onSave }: StepEditorModalProps) {
    const [data, setData] = useState<LabGuideStepCreateRequest>(EMPTY_STEP)
    const [activeTab, setActiveTab] = useState<"content" | "checks" | "quiz">("content")

    useEffect(() => {
        if (isOpen) {
            setData(initialData ? { ...initialData } : EMPTY_STEP)
            setActiveTab("content")
        }
    }, [isOpen, initialData])

    if (!isOpen) return null

    const update = <K extends keyof LabGuideStepCreateRequest>(key: K, value: LabGuideStepCreateRequest[K]) => {
        setData((prev) => ({ ...prev, [key]: value }))
    }

    const addCommand = () => {
        update("commands", [...data.commands, { label: "", command: "", timeout: 300, sudo: false }])
    }

    const updateCommand = (i: number, patch: Partial<GuideCommand>) => {
        const next = data.commands.map((c, idx) => (idx === i ? { ...c, ...patch } : c))
        update("commands", next)
    }

    const removeCommand = (i: number) => {
        update("commands", data.commands.filter((_, idx) => idx !== i))
    }

    const addTask = () => {
        update("tasks", [...data.tasks, { description: "", is_required: true }])
    }

    const updateTask = (i: number, patch: Partial<GuideTask>) => {
        const next = data.tasks.map((t, idx) => (idx === i ? { ...t, ...patch } : t))
        update("tasks", next)
    }

    const removeTask = (i: number) => {
        update("tasks", data.tasks.filter((_, idx) => idx !== i))
    }

    const updateHint = (level: number, content: string) => {
        const next = [...data.hints]
        const idx = next.findIndex((h) => h.level === level)
        if (idx >= 0) {
            next[idx] = { ...next[idx], content }
        } else {
            next.push({ level, content })
        }
        update("hints", next.sort((a, b) => a.level - b.level))
    }

    const getHint = (level: number) => data.hints.find((h) => h.level === level)?.content || ""

    const addValidation = () => {
        update("validations", [
            ...data.validations,
            { type: "port_open", description: "", is_blocking: false, points: 0 },
        ])
    }

    const updateValidation = (i: number, patch: Partial<ValidationCheck>) => {
        const next = data.validations.map((v, idx) => (idx === i ? { ...v, ...patch } : v))
        update("validations", next)
    }

    const removeValidation = (i: number) => {
        update("validations", data.validations.filter((_, idx) => idx !== i))
    }

    const toggleQuiz = (enable: boolean) => {
        if (!enable) {
            update("quiz", undefined)
        } else {
            const q: GuideQuiz = {
                question: "",
                type: "short_answer",
                correct_answer: "",
                points: 10,
            }
            update("quiz", q)
        }
    }

    const updateQuiz = (patch: Partial<GuideQuiz>) => {
        if (!data.quiz) return
        update("quiz", { ...data.quiz, ...patch })
    }

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        if (!data.title.trim()) return
        onSave(data)
    }

    const tabs = [
        { key: "content" as const, label: "Content", icon: Terminal },
        { key: "checks" as const, label: "Checks & Hints", icon: Shield },
        { key: "quiz" as const, label: "Quiz", icon: HelpCircle },
    ]

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

            <div className="relative w-full max-w-2xl max-h-[90vh] bg-white rounded-xl border border-[#e8e8e8] shadow-xl mx-4 flex flex-col overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-[#e8e8e8] shrink-0">
                    <div className="flex items-center gap-2">
                        <Terminal className="h-5 w-5 text-[#1ca9b1]" />
                        <h2 className="text-[15px] font-semibold text-[#3a3a3a]">
                            {initialData ? "Edit Step" : "Add Step"}
                        </h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1.5 text-[#c4c4c4] hover:text-[#3a3a3a] hover:bg-[#f5f5f5] rounded-lg transition-colors"
                    >
                        <X className="h-4 w-4" />
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex items-center gap-1 px-6 pt-4 border-b border-[#e8e8e8] shrink-0">
                    {tabs.map((tab) => (
                        <button
                            key={tab.key}
                            onClick={() => setActiveTab(tab.key)}
                            className={cn(
                                "flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-t-lg transition-colors",
                                activeTab === tab.key
                                    ? "text-[#1ca9b1] bg-[#e6f7f8]"
                                    : "text-[#727373] hover:text-[#3a3a3a] hover:bg-[#f9f9f9]"
                            )}
                        >
                            <tab.icon className="h-3.5 w-3.5" />
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* Scrollable Form */}
                <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
                    {/* Always visible: Title & Target */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <label className="text-[11px] font-medium text-[#727373] uppercase tracking-wider">
                                Step Title *
                            </label>
                            <input
                                type="text"
                                value={data.title}
                                onChange={(e) => update("title", e.target.value)}
                                placeholder="e.g., Scan Target Network"
                                className={cn(
                                    "w-full rounded-lg border border-[#d4d4d4] bg-white px-3 py-2",
                                    "text-[13px] text-[#3a3a3a] placeholder:text-[#c4c4c4]",
                                    "outline-none focus:border-[#1ca9b1] transition-colors"
                                )}
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[11px] font-medium text-[#727373] uppercase tracking-wider">
                                Target VM Name
                            </label>
                            <input
                                type="text"
                                value={data.target_vm_name || ""}
                                onChange={(e) => update("target_vm_name", e.target.value)}
                                placeholder="e.g., attacker-kali"
                                className={cn(
                                    "w-full rounded-lg border border-[#d4d4d4] bg-white px-3 py-2",
                                    "text-[13px] text-[#3a3a3a] placeholder:text-[#c4c4c4]",
                                    "outline-none focus:border-[#1ca9b1] transition-colors"
                                )}
                            />
                        </div>
                    </div>

                    {/* Points */}
                    <div className="space-y-1.5">
                        <label className="text-[11px] font-medium text-[#727373] uppercase tracking-wider">
                            Points
                        </label>
                        <input
                            type="number"
                            min={0}
                            value={data.points}
                            onChange={(e) => update("points", parseInt(e.target.value) || 0)}
                            className={cn(
                                "w-32 rounded-lg border border-[#d4d4d4] bg-white px-3 py-2",
                                "text-[13px] text-[#3a3a3a]",
                                "outline-none focus:border-[#1ca9b1] transition-colors"
                            )}
                        />
                    </div>

                    {activeTab === "content" && (
                        <div className="space-y-5">
                            {/* Theory */}
                            <div className="space-y-1.5">
                                <label className="text-[11px] font-medium text-[#727373] uppercase tracking-wider">
                                    Theory / Explanation
                                </label>
                                <textarea
                                    value={data.theory_content || ""}
                                    onChange={(e) => update("theory_content", e.target.value)}
                                    placeholder="Explain the concept or objective of this step (markdown supported)..."
                                    rows={4}
                                    className={cn(
                                        "w-full rounded-lg border border-[#d4d4d4] bg-white px-3 py-2",
                                        "text-[13px] text-[#3a3a3a] placeholder:text-[#c4c4c4]",
                                        "outline-none focus:border-[#1ca9b1] transition-colors resize-none"
                                    )}
                                />
                            </div>

                            {/* Commands */}
                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <label className="text-[11px] font-medium text-[#727373] uppercase tracking-wider">
                                        Commands
                                    </label>
                                    <button
                                        type="button"
                                        onClick={addCommand}
                                        className="flex items-center gap-1 text-xs font-medium text-[#1ca9b1] hover:text-[#17959c]"
                                    >
                                        <Plus className="h-3 w-3" />
                                        Add Command
                                    </button>
                                </div>
                                {data.commands.length === 0 && (
                                    <p className="text-xs text-[#c4c4c4] italic">No commands added yet</p>
                                )}
                                {data.commands.map((cmd, i) => (
                                    <div key={i} className="border border-[#e8e8e8] rounded-lg p-3 space-y-2">
                                        <div className="flex items-center gap-2">
                                            <input
                                                type="text"
                                                value={cmd.label}
                                                onChange={(e) => updateCommand(i, { label: e.target.value })}
                                                placeholder="Label: e.g., Scan ports"
                                                className={cn(
                                                    "flex-1 rounded-md border border-[#d4d4d4] bg-white px-2.5 py-1.5",
                                                    "text-[12px] text-[#3a3a3a] placeholder:text-[#c4c4c4]",
                                                    "outline-none focus:border-[#1ca9b1]"
                                                )}
                                            />
                                            <button
                                                type="button"
                                                onClick={() => removeCommand(i)}
                                                className="p-1 text-[#c4c4c4] hover:text-red-500 transition-colors"
                                            >
                                                <Trash2 className="h-3.5 w-3.5" />
                                            </button>
                                        </div>
                                        <textarea
                                            value={cmd.command}
                                            onChange={(e) => updateCommand(i, { command: e.target.value })}
                                            placeholder="nmap -sV 192.168.1.10"
                                            rows={2}
                                            className={cn(
                                                "w-full rounded-md border border-[#d4d4d4] bg-white px-2.5 py-1.5",
                                                "text-[12px] font-mono text-[#3a3a3a] placeholder:text-[#c4c4c4]",
                                                "outline-none focus:border-[#1ca9b1] resize-none"
                                            )}
                                        />
                                        <div className="flex items-center gap-3">
                                            <label className="flex items-center gap-1.5 text-xs text-[#727373]">
                                                <input
                                                    type="checkbox"
                                                    checked={cmd.sudo}
                                                    onChange={(e) => updateCommand(i, { sudo: e.target.checked })}
                                                    className="rounded border-[#d4d4d4] text-[#1ca9b1] focus:ring-[#1ca9b1]"
                                                />
                                                sudo
                                            </label>
                                            <input
                                                type="number"
                                                value={cmd.timeout}
                                                onChange={(e) => updateCommand(i, { timeout: parseInt(e.target.value) || 300 })}
                                                className="w-20 rounded-md border border-[#d4d4d4] bg-white px-2 py-1 text-[11px]"
                                            />
                                            <span className="text-[11px] text-[#c4c4c4]">timeout (s)</span>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Tasks */}
                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <label className="text-[11px] font-medium text-[#727373] uppercase tracking-wider">
                                        Tasks / Objectives
                                    </label>
                                    <button
                                        type="button"
                                        onClick={addTask}
                                        className="flex items-center gap-1 text-xs font-medium text-[#1ca9b1] hover:text-[#17959c]"
                                    >
                                        <Plus className="h-3 w-3" />
                                        Add Task
                                    </button>
                                </div>
                                {data.tasks.length === 0 && (
                                    <p className="text-xs text-[#c4c4c4] italic">No tasks added yet</p>
                                )}
                                {data.tasks.map((task, i) => (
                                    <div key={i} className="flex items-center gap-2">
                                        <CheckCircle className="h-4 w-4 text-[#1ca9b1] shrink-0" />
                                        <input
                                            type="text"
                                            value={task.description}
                                            onChange={(e) => updateTask(i, { description: e.target.value })}
                                            placeholder="e.g., Identify open ports"
                                            className={cn(
                                                "flex-1 rounded-md border border-[#d4d4d4] bg-white px-2.5 py-1.5",
                                                "text-[12px] text-[#3a3a3a] placeholder:text-[#c4c4c4]",
                                                "outline-none focus:border-[#1ca9b1]"
                                            )}
                                        />
                                        <label className="flex items-center gap-1 text-[11px] text-[#727373] whitespace-nowrap">
                                            <input
                                                type="checkbox"
                                                checked={task.is_required}
                                                onChange={(e) => updateTask(i, { is_required: e.target.checked })}
                                                className="rounded border-[#d4d4d4] text-[#1ca9b1]"
                                            />
                                            Required
                                        </label>
                                        <button
                                            type="button"
                                            onClick={() => removeTask(i)}
                                            className="p-1 text-[#c4c4c4] hover:text-red-500"
                                        >
                                            <Trash2 className="h-3.5 w-3.5" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {activeTab === "checks" && (
                        <div className="space-y-5">
                            {/* Hints */}
                            <div className="space-y-2">
                                <label className="text-[11px] font-medium text-[#727373] uppercase tracking-wider flex items-center gap-1.5">
                                    <Lightbulb className="h-3.5 w-3.5" />
                                    Progressive Hints
                                </label>
                                {[1, 2, 3].map((level) => (
                                    <div key={level} className="space-y-1">
                                        <span className="text-[10px] font-medium text-[#c4c4c4] uppercase">
                                            Hint Level {level}
                                        </span>
                                        <textarea
                                            value={getHint(level)}
                                            onChange={(e) => updateHint(level, e.target.value)}
                                            placeholder={
                                                level === 1
                                                    ? "Vague nudge..."
                                                    : level === 2
                                                        ? "More specific direction..."
                                                        : "Almost the full solution..."
                                            }
                                            rows={2}
                                            className={cn(
                                                "w-full rounded-md border border-[#d4d4d4] bg-white px-3 py-2",
                                                "text-[12px] text-[#3a3a3a] placeholder:text-[#c4c4c4]",
                                                "outline-none focus:border-[#1ca9b1] resize-none"
                                            )}
                                        />
                                    </div>
                                ))}
                            </div>

                            {/* Validations */}
                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <label className="text-[11px] font-medium text-[#727373] uppercase tracking-wider flex items-center gap-1.5">
                                        <Shield className="h-3.5 w-3.5" />
                                        Validation Checks
                                    </label>
                                    <button
                                        type="button"
                                        onClick={addValidation}
                                        className="flex items-center gap-1 text-xs font-medium text-[#1ca9b1] hover:text-[#17959c]"
                                    >
                                        <Plus className="h-3 w-3" />
                                        Add Check
                                    </button>
                                </div>
                                {data.validations.length === 0 && (
                                    <p className="text-xs text-[#c4c4c4] italic">No validation checks configured</p>
                                )}
                                {data.validations.map((val, i) => (
                                    <div key={i} className="border border-[#e8e8e8] rounded-lg p-3 space-y-2">
                                        <div className="flex items-center gap-2">
                                            <select
                                                value={val.type}
                                                onChange={(e) => updateValidation(i, { type: e.target.value as ValidationCheck["type"] })}
                                                className="rounded-md border border-[#d4d4d4] bg-white px-2 py-1 text-[12px]"
                                            >
                                                <option value="port_open">Port Open</option>
                                                <option value="port_closed">Port Closed</option>
                                                <option value="file_exists">File Exists</option>
                                                <option value="file_content">File Content</option>
                                                <option value="command_output">Command Output</option>
                                                <option value="user_has_root">User Has Root</option>
                                                <option value="service_running">Service Running</option>
                                                <option value="process_running">Process Running</option>
                                                <option value="ping_reachable">Ping Reachable</option>
                                                <option value="custom_script">Custom Script</option>
                                            </select>
                                            <input
                                                type="text"
                                                value={val.description}
                                                onChange={(e) => updateValidation(i, { description: e.target.value })}
                                                placeholder="Description"
                                                className="flex-1 rounded-md border border-[#d4d4d4] bg-white px-2 py-1 text-[12px]"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => removeValidation(i)}
                                                className="p-1 text-[#c4c4c4] hover:text-red-500"
                                            >
                                                <Trash2 className="h-3.5 w-3.5" />
                                            </button>
                                        </div>
                                        <div className="grid grid-cols-2 gap-2">
                                            {(val.type === "port_open" || val.type === "port_closed") && (
                                                <input
                                                    type="number"
                                                    value={val.port || ""}
                                                    onChange={(e) => updateValidation(i, { port: parseInt(e.target.value) || undefined })}
                                                    placeholder="Port"
                                                    className="rounded-md border border-[#d4d4d4] bg-white px-2 py-1 text-[12px]"
                                                />
                                            )}
                                            {(val.type === "file_exists" || val.type === "file_content") && (
                                                <input
                                                    type="text"
                                                    value={val.file_path || ""}
                                                    onChange={(e) => updateValidation(i, { file_path: e.target.value })}
                                                    placeholder="File path"
                                                    className="rounded-md border border-[#d4d4d4] bg-white px-2 py-1 text-[12px]"
                                                />
                                            )}
                                            <input
                                                type="number"
                                                value={val.points || 0}
                                                onChange={(e) => updateValidation(i, { points: parseInt(e.target.value) || 0 })}
                                                placeholder="Points"
                                                className="rounded-md border border-[#d4d4d4] bg-white px-2 py-1 text-[12px]"
                                            />
                                        </div>
                                        <label className="flex items-center gap-1.5 text-[11px] text-[#727373]">
                                            <input
                                                type="checkbox"
                                                checked={val.is_blocking}
                                                onChange={(e) => updateValidation(i, { is_blocking: e.target.checked })}
                                                className="rounded border-[#d4d4d4] text-[#1ca9b1]"
                                            />
                                            Blocking (must pass to continue)
                                        </label>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {activeTab === "quiz" && (
                        <div className="space-y-4">
                            <label className="flex items-center gap-2 text-sm font-medium text-[#3a3a3a]">
                                <input
                                    type="checkbox"
                                    checked={!!data.quiz}
                                    onChange={(e) => toggleQuiz(e.target.checked)}
                                    className="rounded border-[#d4d4d4] text-[#1ca9b1] h-4 w-4"
                                />
                                Include Quiz for this Step
                            </label>

                            {data.quiz && (
                                <div className="border border-[#e8e8e8] rounded-lg p-4 space-y-3">
                                    <div className="space-y-1.5">
                                        <label className="text-[11px] font-medium text-[#727373] uppercase tracking-wider">
                                            Question
                                        </label>
                                        <input
                                            type="text"
                                            value={data.quiz.question}
                                            onChange={(e) => updateQuiz({ question: e.target.value })}
                                            placeholder="e.g., What port is SSH running on?"
                                            className={cn(
                                                "w-full rounded-lg border border-[#d4d4d4] bg-white px-3 py-2",
                                                "text-[13px] text-[#3a3a3a] placeholder:text-[#c4c4c4]",
                                                "outline-none focus:border-[#1ca9b1]"
                                            )}
                                        />
                                    </div>

                                    <div className="space-y-1.5">
                                        <label className="text-[11px] font-medium text-[#727373] uppercase tracking-wider">
                                            Quiz Type
                                        </label>
                                        <select
                                            value={data.quiz.type}
                                            onChange={(e) => updateQuiz({ type: e.target.value as GuideQuiz["type"] })}
                                            className={cn(
                                                "w-full rounded-lg border border-[#d4d4d4] bg-white px-3 py-2",
                                                "text-[13px] text-[#3a3a3a]",
                                                "outline-none focus:border-[#1ca9b1]"
                                            )}
                                        >
                                            <option value="short_answer">Short Answer</option>
                                            <option value="multiple_choice">Multiple Choice</option>
                                            <option value="flag">Flag Format</option>
                                        </select>
                                    </div>

                                    {data.quiz.type === "multiple_choice" && (
                                        <div className="space-y-2">
                                            <label className="text-[11px] font-medium text-[#727373] uppercase tracking-wider">
                                                Options (comma-separated)
                                            </label>
                                            <input
                                                type="text"
                                                value={data.quiz.options?.join(", ") || ""}
                                                onChange={(e) => updateQuiz({ options: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) })}
                                                placeholder="21, 22, 80, 443"
                                                className={cn(
                                                    "w-full rounded-lg border border-[#d4d4d4] bg-white px-3 py-2",
                                                    "text-[13px] text-[#3a3a3a] placeholder:text-[#c4c4c4]",
                                                    "outline-none focus:border-[#1ca9b1]"
                                                )}
                                            />
                                        </div>
                                    )}

                                    <div className="space-y-1.5">
                                        <label className="text-[11px] font-medium text-[#727373] uppercase tracking-wider">
                                            Correct Answer
                                        </label>
                                        <input
                                            type="text"
                                            value={data.quiz.correct_answer}
                                            onChange={(e) => updateQuiz({ correct_answer: e.target.value })}
                                            placeholder={data.quiz.type === "flag" ? "FLAG{...}" : "22"}
                                            className={cn(
                                                "w-full rounded-lg border border-[#d4d4d4] bg-white px-3 py-2",
                                                "text-[13px] text-[#3a3a3a] placeholder:text-[#c4c4c4]",
                                                "outline-none focus:border-[#1ca9b1]"
                                            )}
                                        />
                                    </div>

                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="space-y-1.5">
                                            <label className="text-[11px] font-medium text-[#727373] uppercase tracking-wider">
                                                Points
                                            </label>
                                            <input
                                                type="number"
                                                min={0}
                                                value={data.quiz.points}
                                                onChange={(e) => updateQuiz({ points: parseInt(e.target.value) || 0 })}
                                                className={cn(
                                                    "w-full rounded-lg border border-[#d4d4d4] bg-white px-3 py-2",
                                                    "text-[13px] text-[#3a3a3a]",
                                                    "outline-none focus:border-[#1ca9b1]"
                                                )}
                                            />
                                        </div>
                                        <div className="flex items-end pb-2">
                                            <label className="flex items-center gap-1.5 text-xs text-[#727373]">
                                                <input
                                                    type="checkbox"
                                                    checked={data.quiz.case_sensitive || false}
                                                    onChange={(e) => updateQuiz({ case_sensitive: e.target.checked })}
                                                    className="rounded border-[#d4d4d4] text-[#1ca9b1]"
                                                />
                                                Case Sensitive
                                            </label>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </form>

                {/* Footer */}
                <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-[#e8e8e8] shrink-0 bg-white">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2 rounded-lg text-sm font-medium text-[#727373] hover:bg-[#f5f5f5]"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        onClick={handleSubmit}
                        disabled={!data.title.trim()}
                        className={cn(
                            "flex items-center gap-2 px-4 py-2 rounded-lg",
                            "bg-[#1ca9b1] text-white text-sm font-medium",
                            "hover:bg-[#17959c] transition-colors",
                            "disabled:opacity-60 disabled:cursor-not-allowed"
                        )}
                    >
                        {initialData ? "Update Step" : "Add Step"}
                    </button>
                </div>
            </div>
        </div>
    )
}