// src/components/LabGuide/ListGuideLab/CreateVersionModal.tsx
import { useState } from "react"
import { cn } from "@/lib/utils"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { GitBranch, Plus, Trash2, Loader2 } from "lucide-react"
import type { LabGuideListItem, LabGuideStepCreateRequest } from "@/types/LabGuide"

interface CreateVersionModalProps {
    guide: LabGuideListItem | null
    open: boolean
    onOpenChange: (open: boolean) => void
    onCreateVersion: (guideId: string, data: { steps: LabGuideStepCreateRequest[]; is_published: boolean }) => Promise<void>
    isSubmitting: boolean
}

const EMPTY_STEP: LabGuideStepCreateRequest = {
    title: "",
    description: "",
    theory_content: "",
    commands: [],
    tasks: [],
    hints: [],
    validations: [],
    points: 10,
    order: 0,
}

export function CreateVersionModal({
    guide,
    open,
    onOpenChange,
    onCreateVersion,
    isSubmitting,
}: CreateVersionModalProps) {
    const [steps, setSteps] = useState<LabGuideStepCreateRequest[]>([{ ...EMPTY_STEP, order: 1 }])
    const [isPublished, setIsPublished] = useState(false)
    const [activeStepIndex, setActiveStepIndex] = useState(0)

    const handleAddStep = () => {
        setSteps((prev) => [
            ...prev,
            { ...EMPTY_STEP, order: prev.length + 1 },
        ])
        setActiveStepIndex(steps.length)
    }

    const handleRemoveStep = (index: number) => {
        if (steps.length <= 1) return
        const newSteps = steps.filter((_, i) => i !== index)
        // Reorder
        newSteps.forEach((step, i) => (step.order = i + 1))
        setSteps(newSteps)
        setActiveStepIndex(Math.min(activeStepIndex, newSteps.length - 1))
    }

    const updateStep = (index: number, field: keyof LabGuideStepCreateRequest, value: any) => {
        setSteps((prev) =>
            prev.map((step, i) => (i === index ? { ...step, [field]: value } : step))
        )
    }

    const handleSubmit = async () => {
        if (!guide) return
        const validSteps = steps.filter((s) => s.title.trim() !== "")
        if (validSteps.length === 0) {
            return
        }
        await onCreateVersion(guide.id, { steps: validSteps, is_published: isPublished })
        // Reset
        setSteps([{ ...EMPTY_STEP, order: 1 }])
        setIsPublished(false)
        setActiveStepIndex(0)
        onOpenChange(false)
    }

    if (!guide) return null

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col p-0">
                <DialogHeader className="px-6 py-4 border-b border-[#e8e8e8] shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-[#e6f7f8] flex items-center justify-center text-[#1ca9b1]">
                            <GitBranch className="h-4 w-4" />
                        </div>
                        <div>
                            <DialogTitle className="text-base font-semibold text-[#3a3a3a]">
                                New Version — {guide.title}
                            </DialogTitle>
                            <p className="text-xs text-[#727373] mt-0.5">
                                Create an immutable snapshot of guide content
                            </p>
                        </div>
                    </div>
                </DialogHeader>

                <div className="flex-1 overflow-hidden flex flex-col">
                    {/* Step Tabs */}
                    <div className="flex items-center gap-1 px-6 py-3 border-b border-[#e8e8e8] bg-[#f9f9f9] overflow-x-auto">
                        {steps.map((step, idx) => (
                            <button
                                key={idx}
                                onClick={() => setActiveStepIndex(idx)}
                                className={cn(
                                    "px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-150 shrink-0",
                                    activeStepIndex === idx
                                        ? "bg-white text-[#1ca9b1] shadow-sm border border-[#e8e8e8]"
                                        : "text-[#727373] hover:bg-[#f0f0f0]"
                                )}
                            >
                                Step {step.order}
                            </button>
                        ))}
                        <button
                            onClick={handleAddStep}
                            className="px-2 py-1.5 rounded-md text-xs font-medium text-[#1ca9b1] hover:bg-[#e6f7f8] transition-colors shrink-0"
                        >
                            <Plus className="h-3.5 w-3.5" />
                        </button>
                    </div>

                    {/* Step Editor */}
                    <div className="flex-1 overflow-y-auto px-6 py-4">
                        {steps.map((step, idx) => (
                            <div
                                key={idx}
                                className={cn(
                                    "space-y-4",
                                    activeStepIndex !== idx && "hidden"
                                )}
                            >
                                <div className="flex items-center justify-between">
                                    <h4 className="text-sm font-semibold text-[#3a3a3a]">
                                        Step {step.order}
                                    </h4>
                                    {steps.length > 1 && (
                                        <button
                                            onClick={() => handleRemoveStep(idx)}
                                            className="text-red-500 hover:text-red-600 text-xs flex items-center gap-1"
                                        >
                                            <Trash2 className="h-3 w-3" />
                                            Remove
                                        </button>
                                    )}
                                </div>

                                <div className="space-y-3">
                                    <div>
                                        <Label className="text-xs text-[#727373]">Title *</Label>
                                        <Input
                                            value={step.title}
                                            onChange={(e) => updateStep(idx, "title", e.target.value)}
                                            placeholder="Step title"
                                            className="mt-1 h-9 text-sm border-[#e8e8e8] focus-visible:ring-[#1ca9b1]"
                                        />
                                    </div>

                                    <div>
                                        <Label className="text-xs text-[#727373]">Description</Label>
                                        <textarea
                                            value={step.description || ""}
                                            onChange={(e) => updateStep(idx, "description", e.target.value)}
                                            placeholder="Describe what the learner should do..."
                                            className="mt-1 w-full min-h-[60px] px-3 py-2 text-sm rounded-md border border-[#e8e8e8] focus:outline-none focus:ring-1 focus:ring-[#1ca9b1] resize-y"
                                        />
                                    </div>

                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <Label className="text-xs text-[#727373]">Points</Label>
                                            <Input
                                                type="number"
                                                value={step.points}
                                                onChange={(e) => updateStep(idx, "points", parseInt(e.target.value) || 0)}
                                                className="mt-1 h-9 text-sm border-[#e8e8e8] focus-visible:ring-[#1ca9b1]"
                                            />
                                        </div>
                                        <div>
                                            <Label className="text-xs text-[#727373]">Order</Label>
                                            <Input
                                                type="number"
                                                value={step.order}
                                                onChange={(e) => updateStep(idx, "order", parseInt(e.target.value) || 0)}
                                                className="mt-1 h-9 text-sm border-[#e8e8e8] focus-visible:ring-[#1ca9b1]"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Footer */}
                    <div className="px-6 py-4 border-t border-[#e8e8e8] bg-[#f9f9f9] shrink-0">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <Switch
                                    id="publish"
                                    checked={isPublished}
                                    onCheckedChange={setIsPublished}
                                />
                                <Label htmlFor="publish" className="text-sm text-[#3a3a3a] cursor-pointer">
                                    Publish immediately
                                </Label>
                            </div>

                            <div className="flex items-center gap-2">
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => onOpenChange(false)}
                                    className="text-xs h-8"
                                >
                                    Cancel
                                </Button>
                                <Button
                                    size="sm"
                                    onClick={handleSubmit}
                                    disabled={isSubmitting || steps.every((s) => !s.title.trim())}
                                    className="bg-[#1ca9b1] hover:bg-[#17959c] text-white text-xs h-8"
                                >
                                    {isSubmitting ? (
                                        <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
                                    ) : (
                                        <GitBranch className="h-3.5 w-3.5 mr-1" />
                                    )}
                                    Create Version
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    )
}