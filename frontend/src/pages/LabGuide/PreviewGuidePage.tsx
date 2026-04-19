// src/pages/LabGuide/PreviewGuidePage.tsx

import { useState, useEffect, useCallback } from "react"
import { useParams } from "react-router-dom"
import { cn } from "@/lib/utils"
import { Loader2, AlertCircle } from "lucide-react"
import { useLabGuides } from "@/hooks/LabGuide/useLabGuides"
import { ResizableSplit } from "@/components/LabGuide/PreviewGuideLab/ResizableSplit"
import { GuidePanel } from "@/components/LabGuide/PreviewGuideLab/GuidePanel"
import { VMConsole } from "@/components/LabGuide/PreviewGuideLab/VMConsole"
import type { LabGuide } from "@/types/LabGuide"

export default function PreviewGuidePage() {
    const { guideId } = useParams<{ guideId: string }>()
    const { fetchGuide, isLoading } = useLabGuides()
    const [guide, setGuide] = useState<LabGuide | null>(null)
    const [currentStepIndex, setCurrentStepIndex] = useState(0)
    const [terminalLines, setTerminalLines] = useState<string[]>([
        "Welcome to the lab environment.",
        "Select a step and click 'Run' to execute commands here.",
        "",
    ])

    const loadGuide = useCallback(async () => {
        if (!guideId) return
        try {
            const data = await fetchGuide(guideId)
            if (data) setGuide(data)
        } catch {
            // Error handled by hook
        }
    }, [guideId, fetchGuide])

    useEffect(() => {
        loadGuide()
    }, [loadGuide])

    const handleRunCommand = (command: string, label?: string) => {
        const timestamp = new Date().toLocaleTimeString()
        setTerminalLines((prev) => [
            ...prev,
            `[${timestamp}] $ ${label || command}`,
            `> Executing: ${command}...`,
            `> Command completed successfully.`,
            "",
        ])
    }

    const handleStepChange = (index: number) => {
        setCurrentStepIndex(index)
    }

    if (isLoading) {
        return (
            <div className="flex h-full items-center justify-center bg-[#f9f9f9]">
                <Loader2 className="h-8 w-8 animate-spin text-[#1ca9b1]" />
            </div>
        )
    }

    if (!guide) {
        return (
            <div className="flex h-full items-center justify-center bg-[#f9f9f9]">
                <div className="text-center">
                    <AlertCircle className="h-12 w-12 text-[#c4c4c4] mx-auto mb-3" />
                    <h2 className="text-lg font-semibold text-[#3a3a3a]">Guide not found</h2>
                    <p className="text-sm text-[#727373] mt-1">The requested guide could not be loaded.</p>
                </div>
            </div>
        )
    }

    const currentStep = guide.steps[currentStepIndex]
    const targetVm = currentStep?.target_vm_name || "lab-vm"

    return (
        <div className="flex flex-col h-full bg-[#f9f9f9]">
            {/* Header */}
            <div className="bg-white border-b border-[#e8e8e8] px-6 py-4 shrink-0">
                <div className="flex items-center justify-between w-full px-4">
                    <div>
                        <h1 className="text-lg font-semibold text-[#3a3a3a] truncate max-w-md">
                            {guide.title}
                        </h1>
                        <p className="text-xs text-[#727373] mt-0.5">
                            Preview Mode • {guide.steps.length} steps • {guide.estimated_duration_minutes} min
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className={cn(
                            "text-[10px] px-2 py-1 rounded-md font-medium uppercase tracking-wider",
                            guide.is_published
                                ? "bg-green-50 text-green-600"
                                : "bg-amber-50 text-amber-600"
                        )}>
                            {guide.is_published ? "Published" : "Draft"}
                        </span>
                    </div>
                </div>
            </div>

            {/* Resizable Split */}
            <div className="flex-1 overflow-hidden">
                <ResizableSplit
                    left={
                        <GuidePanel
                            guide={guide}
                            currentStepIndex={currentStepIndex}
                            onStepChange={handleStepChange}
                            onRunCommand={handleRunCommand}
                        />
                    }
                    right={
                        <VMConsole
                            vmName={targetVm}
                            lines={terminalLines}
                        />
                    }
                    defaultLeftWidth={50}
                />
            </div>
        </div>
    )
}