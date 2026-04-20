// src/components/LabGuide/CreateGuideLab/StepEditor/ContentTab.tsx

import { cn } from "@/lib/utils"
import { Plus, BookOpen, Terminal, CheckCircle, Trash2 } from "lucide-react"
import type { LabGuideStepCreateRequest, GuideCommand, GuideTask } from "@/types/LabGuide"
import { CommandEditor } from "./CommandEditor"

interface ContentTabProps {
    data: LabGuideStepCreateRequest
    onChange: <K extends keyof LabGuideStepCreateRequest>(key: K, value: LabGuideStepCreateRequest[K]) => void
}

export function ContentTab({ data, onChange }: ContentTabProps) {
    const updateCommands = (commands: GuideCommand[]) => onChange("commands", commands)
    const updateTasks = (tasks: GuideTask[]) => onChange("tasks", tasks)

    const addCommand = () => {
        updateCommands([
            ...data.commands,
            { label: "", command: "", timeout: 300, sudo: false, working_directory: "/home/user" },
        ])
    }

    const updateCommand = (i: number, patch: Partial<GuideCommand>) => {
        const next = data.commands.map((c, idx) => (idx === i ? { ...c, ...patch } : c))
        updateCommands(next)
    }

    const removeCommand = (i: number) => {
        updateCommands(data.commands.filter((_, idx) => idx !== i))
    }

    const addTask = () => {
        updateTasks([...data.tasks, { description: "", is_required: true }])
    }

    const updateTask = (i: number, patch: Partial<GuideTask>) => {
        const next = data.tasks.map((t, idx) => (idx === i ? { ...t, ...patch } : t))
        updateTasks(next)
    }

    const removeTask = (i: number) => {
        updateTasks(data.tasks.filter((_, idx) => idx !== i))
    }

    return (
        <div className="p-6 space-y-8">
            {/* Theory */}
            <section className="space-y-3">
                <div className="flex items-center gap-2">
                    <BookOpen className="h-4 w-4 text-[#1ca9b1]" />
                    <h3 className="text-[13px] font-semibold text-[#3a3a3a] uppercase tracking-wider">
                        Theory & Explanation
                    </h3>
                </div>
                <textarea
                    value={data.theory_content || ""}
                    onChange={(e) => onChange("theory_content", e.target.value)}
                    placeholder="Explain the concept or objective of this step. Markdown is supported..."
                    rows={5}
                    className={cn(
                        "w-full rounded-xl border border-[#d4d4d4] bg-white px-4 py-3",
                        "text-[13px] text-[#3a3a3a] placeholder:text-[#c4c4c4] leading-relaxed",
                        "outline-none focus:border-[#1ca9b1] focus:ring-1 focus:ring-[#1ca9b1]/20 transition-all resize-none"
                    )}
                />
            </section>

            {/* Commands */}
            <section className="space-y-3">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Terminal className="h-4 w-4 text-[#1ca9b1]" />
                        <h3 className="text-[13px] font-semibold text-[#3a3a3a] uppercase tracking-wider">
                            Commands
                        </h3>
                    </div>
                    <button
                        type="button"
                        onClick={addCommand}
                        className="flex items-center gap-1.5 text-xs font-semibold text-[#1ca9b1] hover:text-[#17959c] bg-[#e6f7f8] hover:bg-[#d4f0f2] px-3 py-1.5 rounded-lg transition-colors"
                    >
                        <Plus className="h-3.5 w-3.5" />
                        Add Command
                    </button>
                </div>

                {data.commands.length === 0 ? (
                    <div className="border border-dashed border-[#e8e8e8] rounded-xl p-8 text-center bg-[#fafafa]">
                        <Terminal className="h-6 w-6 text-[#c4c4c4] mx-auto mb-2" />
                        <p className="text-xs text-[#727373]">No commands yet. Add executable commands for this step.</p>
                        <p className="text-[11px] text-[#c4c4c4] mt-1">Each command can target a specific VM.</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {data.commands.map((cmd, i) => (
                            <CommandEditor
                                key={i}
                                index={i}
                                command={cmd}
                                onChange={(patch) => updateCommand(i, patch)}
                                onRemove={() => removeCommand(i)}
                            />
                        ))}
                    </div>
                )}
            </section>

            {/* Tasks */}
            <section className="space-y-3">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-[#1ca9b1]" />
                        <h3 className="text-[13px] font-semibold text-[#3a3a3a] uppercase tracking-wider">
                            Tasks / Objectives
                        </h3>
                    </div>
                    <button
                        type="button"
                        onClick={addTask}
                        className="flex items-center gap-1.5 text-xs font-semibold text-[#1ca9b1] hover:text-[#17959c] bg-[#e6f7f8] hover:bg-[#d4f0f2] px-3 py-1.5 rounded-lg transition-colors"
                    >
                        <Plus className="h-3.5 w-3.5" />
                        Add Task
                    </button>
                </div>

                {data.tasks.length === 0 ? (
                    <div className="border border-dashed border-[#e8e8e8] rounded-xl p-8 text-center bg-[#fafafa]">
                        <CheckCircle className="h-6 w-6 text-[#c4c4c4] mx-auto mb-2" />
                        <p className="text-xs text-[#727373]">No tasks defined yet.</p>
                    </div>
                ) : (
                    <div className="space-y-2">
                        {data.tasks.map((task, i) => (
                            <div
                                key={i}
                                className="flex items-center gap-3 bg-white border border-[#e8e8e8] rounded-lg px-4 py-3 group hover:border-[#1ca9b1]/30 transition-colors"
                            >
                                <CheckCircle className="h-4 w-4 text-[#1ca9b1] shrink-0" />
                                <input
                                    type="text"
                                    value={task.description}
                                    onChange={(e) => updateTask(i, { description: e.target.value })}
                                    placeholder="e.g., Identify open ports on the target"
                                    className={cn(
                                        "flex-1 bg-transparent text-[13px] text-[#3a3a3a] placeholder:text-[#c4c4c4]",
                                        "outline-none border-none focus:ring-0"
                                    )}
                                />
                                <label className="flex items-center gap-1.5 text-[11px] text-[#727373] shrink-0 cursor-pointer select-none">
                                    <input
                                        type="checkbox"
                                        checked={task.is_required}
                                        onChange={(e) => updateTask(i, { is_required: e.target.checked })}
                                        className="rounded border-[#d4d4d4] text-[#1ca9b1] focus:ring-[#1ca9b1] h-3.5 w-3.5"
                                    />
                                    Required
                                </label>
                                <button
                                    type="button"
                                    onClick={() => removeTask(i)}
                                    className="p-1.5 text-[#c4c4c4] hover:text-red-500 hover:bg-red-50 rounded-md transition-colors opacity-0 group-hover:opacity-100"
                                >
                                    <Trash2 className="h-3.5 w-3.5" />
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </section>
        </div>
    )
}