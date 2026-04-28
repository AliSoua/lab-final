// src/components/LabGuide/ListGuideLab/CreateVersionModal.tsx
import { useState, useEffect } from "react"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { GitBranch, Loader2 } from "lucide-react"
import { StepsBuilder } from "@/components/LabGuide/CreateGuideLab/StepsBuilder"
import { useGuideVersions } from "@/hooks/LabGuide/useGuideVersions"
import type { LabGuideListItem, LabGuideStepCreateRequest } from "@/types/LabGuide"

interface CreateVersionModalProps {
    guide: LabGuideListItem | null
    open: boolean
    onOpenChange: (open: boolean) => void
    onCreateVersion: (guideId: string, data: { steps: LabGuideStepCreateRequest[]; is_published: boolean }) => Promise<void>
    isSubmitting: boolean
}

export function CreateVersionModal({
    guide,
    open,
    onOpenChange,
    onCreateVersion,
    isSubmitting,
}: CreateVersionModalProps) {
    const { fetchVersion, isLoading: isFetchingVersion } = useGuideVersions()
    const [steps, setSteps] = useState<LabGuideStepCreateRequest[]>([])
    const [isPublished, setIsPublished] = useState(false)
    const [hasLoaded, setHasLoaded] = useState(false)

    useEffect(() => {
        if (!open || !guide) {
            setSteps([])
            setIsPublished(false)
            setHasLoaded(false)
            return
        }

        let cancelled = false

        const loadCurrentVersion = async () => {
            if (!guide.current_version_id) {
                if (!cancelled) {
                    setSteps([])
                    setHasLoaded(true)
                }
                return
            }

            try {
                const version = await fetchVersion(guide.id, guide.current_version_id)
                if (cancelled) return

                const mappedSteps: LabGuideStepCreateRequest[] = (version.steps || []).map((step) => ({
                    title: step.title,
                    description: step.description,
                    theory_content: step.theory_content,
                    commands: step.commands,
                    tasks: step.tasks,
                    hints: step.hints,
                    validations: step.validations,
                    quiz: step.quiz,
                    points: step.points,
                    order: step.order,
                }))

                if (!cancelled) setSteps(mappedSteps)
            } catch {
                if (!cancelled) setSteps([])
            } finally {
                if (!cancelled) setHasLoaded(true)
            }
        }

        loadCurrentVersion()

        return () => {
            cancelled = true
        }
    }, [open, guide?.id, guide?.current_version_id, fetchVersion])

    const handleSubmit = async () => {
        if (!guide) return
        const validSteps = steps.filter((s) => s.title.trim() !== "")
        if (validSteps.length === 0) return

        await onCreateVersion(guide.id, { steps: validSteps, is_published: isPublished })

        setSteps([])
        setIsPublished(false)
        setHasLoaded(false)
        onOpenChange(false)
    }

    if (!guide) return null

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent
                aria-describedby={undefined}
                className="max-w-6xl w-[95vw] h-[95vh] p-0 flex flex-col overflow-hidden gap-0"
            >
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
                                {guide.current_version_id
                                    ? "Pre-loaded from current version. Edit, reorder, or add steps."
                                    : "Start building steps for this new version."}
                            </p>
                        </div>
                    </div>
                </DialogHeader>

                <div className="flex-1 overflow-y-auto px-6 py-4 bg-[#f9f9f9]">
                    {isFetchingVersion && !hasLoaded ? (
                        <div className="flex items-center justify-center py-12">
                            <Loader2 className="h-6 w-6 animate-spin text-[#1ca9b1]" />
                            <span className="ml-2 text-sm text-[#727373]">Loading current version...</span>
                        </div>
                    ) : (
                        <StepsBuilder
                            steps={steps}
                            onChange={setSteps}
                            title="Build New Version"
                        />
                    )}
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-[#e8e8e8] bg-white shrink-0">
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
            </DialogContent>
        </Dialog>
    )
}