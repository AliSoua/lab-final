// src/components/LabGuide/CreateGuideLab/StepsBuilder.tsx
import { useState } from "react"
import { cn } from "@/lib/utils"
import { Plus, ListOrdered, Pencil, Trash2, ArrowUp, ArrowDown, Server } from "lucide-react"
import { StepEditorModal } from "./StepEditor/StepEditorModal"
import type { LabGuideStepCreateRequest } from "@/types/LabGuide"

interface StepsBuilderProps {
    steps: LabGuideStepCreateRequest[]
    onChange: (steps: LabGuideStepCreateRequest[]) => void
}

function getStepVmTargets(step: LabGuideStepCreateRequest): string[] {
    const targets = new Set<string>()
    step.commands.forEach((c) => {
        if (c.target?.vm_name) targets.add(c.target.vm_name)
    })
    step.validations.forEach((v) => {
        if (v.target?.vm_name) targets.add(v.target.vm_name)
    })
    return Array.from(targets)
}

export function StepsBuilder({ steps, onChange }: StepsBuilderProps) {
    const [modalOpen, setModalOpen] = useState(false)
    const [editingIndex, setEditingIndex] = useState<number | null>(null)
    const [editingStep, setEditingStep] = useState<LabGuideStepCreateRequest | null>(null)

    const handleAdd = () => {
        setEditingIndex(null)
        setEditingStep(null)
        setModalOpen(true)
    }

    const handleEdit = (index: number) => {
        setEditingIndex(index)
        setEditingStep(steps[index])
        setModalOpen(true)
    }

    const handleDelete = (index: number) => {
        const next = steps.filter((_, i) => i !== index)
        next.forEach((s, i) => { s.order = i })
        onChange(next)
    }

    const moveStep = (index: number, direction: -1 | 1) => {
        const newIndex = index + direction
        if (newIndex < 0 || newIndex >= steps.length) return
        const next = [...steps]
        const [moved] = next.splice(index, 1)
        next.splice(newIndex, 0, moved)
        next.forEach((s, i) => { s.order = i })
        onChange(next)
    }

    const handleSave = (step: LabGuideStepCreateRequest) => {
        if (editingIndex !== null) {
            const next = [...steps]
            next[editingIndex] = { ...step, order: editingIndex }
            onChange(next)
        } else {
            onChange([...steps, { ...step, order: steps.length }])
        }
        setModalOpen(false)
    }

    const totalPoints = steps.reduce((sum, s) => sum + (s.points || 0), 0)

    return (
        <div className="space-y-4">
            {/* Header Card */}
            <div className="bg-white border border-[#e8e8e8] rounded-xl shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-[#e8e8e8] flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div>
                            <h2 className="text-[15px] font-semibold text-[#3a3a3a]">Guide Steps</h2>
                            <p className="text-xs text-[#727373] mt-0.5">
                                {steps.length} step{steps.length !== 1 ? "s" : ""} • {totalPoints} total points
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={handleAdd}
                        className={cn(
                            "flex items-center gap-2 rounded-lg px-4 py-2",
                            "bg-[#1ca9b1] text-white text-sm font-medium",
                            "hover:bg-[#17959c] hover:shadow-md",
                            "transition-all duration-200"
                        )}
                    >
                        <Plus className="h-4 w-4" />
                        <span>Add Step</span>
                    </button>
                </div>
            </div>

            {/* Steps List */}
            {steps.length === 0 ? (
                <div className="bg-white border border-[#e8e8e8] rounded-xl shadow-sm p-12 text-center">
                    <div className="w-12 h-12 rounded-full bg-[#f5f5f5] flex items-center justify-center mx-auto mb-4">
                        <ListOrdered className="h-6 w-6 text-[#c4c4c4]" />
                    </div>
                    <h3 className="text-sm font-medium text-[#3a3a3a]">No steps yet</h3>
                    <p className="text-xs text-[#727373] mt-1 max-w-xs mx-auto">
                        Add your first theory block, command, or task. Steps are VM-agnostic — targets are set per command/validation.
                    </p>
                </div>
            ) : (
                <div className="space-y-3">
                    {steps.map((step, index) => {
                        const vmTargets = getStepVmTargets(step)
                        return (
                            <div
                                key={index}
                                className={cn(
                                    "group bg-white border border-[#e8e8e8] rounded-xl shadow-sm overflow-hidden",
                                    "hover:border-[#1ca9b1]/40 hover:shadow-md transition-all duration-200"
                                )}
                            >
                                <div className="px-5 py-4 flex items-start gap-4">
                                    {/* Order Badge */}
                                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#e6f7f8] text-[#1ca9b1] text-sm font-bold">
                                        {index + 1}
                                    </div>

                                    {/* Content */}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <h3 className="text-sm font-semibold text-[#3a3a3a]">
                                                {step.title || "Untitled Step"}
                                            </h3>
                                            {vmTargets.length > 0 && (
                                                <div className="flex items-center gap-1">
                                                    <Server className="h-3 w-3 text-[#727373]" />
                                                    {vmTargets.map((vm) => (
                                                        <span
                                                            key={vm}
                                                            className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 font-medium"
                                                        >
                                                            {vm}
                                                        </span>
                                                    ))}
                                                </div>
                                            )}
                                        </div>

                                        {step.description && (
                                            <p className="text-xs text-[#727373] mt-1 line-clamp-2">
                                                {step.description}
                                            </p>
                                        )}

                                        {/* Stats Row */}
                                        <div className="flex items-center gap-2 mt-2.5 flex-wrap">
                                            {step.theory_content && (
                                                <span className="text-[10px] px-2 py-0.5 rounded bg-[#f5f5f5] text-[#727373] font-medium">
                                                    Theory
                                                </span>
                                            )}
                                            {step.commands.length > 0 && (
                                                <span className="text-[10px] px-2 py-0.5 rounded bg-[#e6f7f8] text-[#1ca9b1] font-medium">
                                                    {step.commands.length} Command{step.commands.length !== 1 ? "s" : ""}
                                                </span>
                                            )}
                                            {step.tasks.length > 0 && (
                                                <span className="text-[10px] px-2 py-0.5 rounded bg-amber-50 text-amber-600 font-medium">
                                                    {step.tasks.length} Task{step.tasks.length !== 1 ? "s" : ""}
                                                </span>
                                            )}
                                            {step.validations.length > 0 && (
                                                <span className="text-[10px] px-2 py-0.5 rounded bg-green-50 text-green-600 font-medium">
                                                    {step.validations.length} Check{step.validations.length !== 1 ? "s" : ""}
                                                </span>
                                            )}
                                            {step.quiz && (
                                                <span className="text-[10px] px-2 py-0.5 rounded bg-purple-50 text-purple-600 font-medium">
                                                    Quiz
                                                </span>
                                            )}
                                            <span className="text-[10px] text-[#c4c4c4] font-medium ml-auto">
                                                {step.points || 0} pts
                                            </span>
                                        </div>
                                    </div>

                                    {/* Actions */}
                                    <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button
                                            onClick={() => moveStep(index, -1)}
                                            disabled={index === 0}
                                            className="p-1.5 text-[#c4c4c4] hover:text-[#3a3a3a] hover:bg-[#f5f5f5] rounded-lg transition-colors disabled:opacity-30"
                                            title="Move up"
                                        >
                                            <ArrowUp className="h-3.5 w-3.5" />
                                        </button>
                                        <button
                                            onClick={() => moveStep(index, 1)}
                                            disabled={index === steps.length - 1}
                                            className="p-1.5 text-[#c4c4c4] hover:text-[#3a3a3a] hover:bg-[#f5f5f5] rounded-lg transition-colors disabled:opacity-30"
                                            title="Move down"
                                        >
                                            <ArrowDown className="h-3.5 w-3.5" />
                                        </button>
                                        <button
                                            onClick={() => handleEdit(index)}
                                            className="p-1.5 text-[#c4c4c4] hover:text-[#1ca9b1] hover:bg-[#f5f5f5] rounded-lg transition-colors"
                                            title="Edit step"
                                        >
                                            <Pencil className="h-3.5 w-3.5" />
                                        </button>
                                        <button
                                            onClick={() => handleDelete(index)}
                                            className="p-1.5 text-[#c4c4c4] hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                            title="Delete step"
                                        >
                                            <Trash2 className="h-3.5 w-3.5" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )
                    })}
                </div>
            )}

            <StepEditorModal
                isOpen={modalOpen}
                onClose={() => setModalOpen(false)}
                initialData={editingStep}
                onSave={handleSave}
            />
        </div>
    )
}