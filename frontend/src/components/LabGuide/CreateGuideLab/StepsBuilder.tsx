// src/components/LabGuide/CreateGuideLab/StepsBuilder.tsx
import { useState } from "react"
import { cn } from "@/lib/utils"
import { Plus, ListOrdered, Pencil, Trash2 } from "lucide-react"
import { StepEditorModal } from "./StepEditorModal"
import type { LabGuideStepCreateRequest } from "@/types/LabGuide"

interface StepsBuilderProps {
    steps: LabGuideStepCreateRequest[]
    onChange: (steps: LabGuideStepCreateRequest[]) => void
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
        // Reorder
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

    return (
        <div className="space-y-4">
            {/* Header Card */}
            <div className="bg-white border border-[#e8e8e8] rounded-xl shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-[#e8e8e8] flex items-center justify-between">
                    <div>
                        <h2 className="text-[15px] font-semibold text-[#3a3a3a]">Guide Steps</h2>
                        <p className="text-xs text-[#727373] mt-0.5">
                            {steps.length} step{steps.length !== 1 ? "s" : ""} defined
                        </p>
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
                    <p className="text-xs text-[#727373] mt-1">Add your first theory block, command, or task</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {steps.map((step, index) => (
                        <div
                            key={index}
                            className={cn(
                                "bg-white border border-[#e8e8e8] rounded-xl shadow-sm overflow-hidden",
                                "hover:border-[#1ca9b1]/30 transition-colors"
                            )}
                        >
                            <div className="px-5 py-4 flex items-start gap-4">
                                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#e6f7f8] text-[#1ca9b1] text-xs font-bold">
                                    {index + 1}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h3 className="text-sm font-semibold text-[#3a3a3a]">
                                        {step.title || "Untitled Step"}
                                    </h3>
                                    {step.description && (
                                        <p className="text-xs text-[#727373] mt-0.5 line-clamp-2">
                                            {step.description}
                                        </p>
                                    )}
                                    <div className="flex items-center gap-3 mt-2">
                                        {step.theory_content && (
                                            <span className="text-[10px] px-2 py-0.5 rounded bg-[#f5f5f5] text-[#727373]">
                                                Theory
                                            </span>
                                        )}
                                        {step.commands.length > 0 && (
                                            <span className="text-[10px] px-2 py-0.5 rounded bg-[#e6f7f8] text-[#1ca9b1]">
                                                {step.commands.length} Command{step.commands.length !== 1 ? "s" : ""}
                                            </span>
                                        )}
                                        {step.tasks.length > 0 && (
                                            <span className="text-[10px] px-2 py-0.5 rounded bg-amber-50 text-amber-600">
                                                {step.tasks.length} Task{step.tasks.length !== 1 ? "s" : ""}
                                            </span>
                                        )}
                                        {step.validations.length > 0 && (
                                            <span className="text-[10px] px-2 py-0.5 rounded bg-green-50 text-green-600">
                                                {step.validations.length} Check{step.validations.length !== 1 ? "s" : ""}
                                            </span>
                                        )}
                                        {step.quiz && (
                                            <span className="text-[10px] px-2 py-0.5 rounded bg-purple-50 text-purple-600">
                                                Quiz
                                            </span>
                                        )}
                                        <span className="text-[10px] text-[#c4c4c4] ml-auto">
                                            {step.points || 0} pts
                                        </span>
                                    </div>
                                </div>
                                <div className="flex items-center gap-1">
                                    <button
                                        onClick={() => handleEdit(index)}
                                        className="p-1.5 text-[#c4c4c4] hover:text-[#1ca9b1] hover:bg-[#f5f5f5] rounded-lg transition-colors"
                                    >
                                        <Pencil className="h-3.5 w-3.5" />
                                    </button>
                                    <button
                                        onClick={() => handleDelete(index)}
                                        className="p-1.5 text-[#c4c4c4] hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                    >
                                        <Trash2 className="h-3.5 w-3.5" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
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