// src/components/LabInstance/Trainee/InstanceRun/LabGuidePanel/sections/CommandsSection.tsx

import { useState } from "react"
import { Play, Loader2, Terminal } from "lucide-react"
import { cn } from "@/lib/utils"
import type { GuideCommand, StepExecutionState } from "@/types/LabGuide"

interface CommandsSectionProps {
    stepId: string
    commands: GuideCommand[]
    onRunCommand?: (stepId: string, commandIndex: number) => void
    commandResults: StepExecutionState["command_results"]
}

export function CommandsSection({ stepId, commands, onRunCommand, commandResults }: CommandsSectionProps) {
    if (commands.length === 0) return null

    return (
        <div className="space-y-2">
            <h4 className="text-[12px] font-semibold uppercase tracking-wide text-[#727373]">
                Commands
            </h4>
            {commands.map((cmd, i) => (
                <CommandItem
                    key={i}
                    cmd={cmd}
                    index={i}
                    stepId={stepId}
                    result={commandResults[i]}
                    onRunCommand={onRunCommand}
                />
            ))}
        </div>
    )
}

function CommandItem({
    cmd,
    index,
    stepId,
    result,
    onRunCommand,
}: {
    cmd: GuideCommand
    index: number
    stepId: string
    result?: StepExecutionState["command_results"][number]
    onRunCommand?: (stepId: string, commandIndex: number) => void
}) {
    const [copied, setCopied] = useState(false)
    const isRunning = result?.status === "running"

    const handleCopy = () => {
        navigator.clipboard.writeText(cmd.command)
        setCopied(true)
        setTimeout(() => setCopied(false), 1500)
    }

    return (
        <div className="rounded-lg border border-[#e8e8e8] bg-[#1a1a1a] p-3">
            <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 min-w-0">
                    <Terminal className="h-3 w-3 shrink-0 text-[#1ca9b1]" />
                    <span className="text-[12px] font-medium text-[#1ca9b1] truncate">
                        {cmd.label}
                    </span>
                </div>
                <div className="flex items-center gap-1.5">
                    <button
                        onClick={handleCopy}
                        className="text-[10px] text-[#727373] hover:text-white transition-colors px-1.5 py-0.5 rounded hover:bg-white/10"
                    >
                        {copied ? "Copied!" : "Copy"}
                    </button>
                    {onRunCommand && (
                        <button
                            onClick={() => onRunCommand(stepId, index)}
                            disabled={isRunning}
                            className={cn(
                                "flex items-center gap-1 rounded px-2.5 py-1 text-[11px] font-medium text-white transition",
                                isRunning
                                    ? "bg-[#727373] cursor-not-allowed"
                                    : "bg-[#1ca9b1] hover:bg-[#17959c]",
                            )}
                        >
                            {isRunning ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                                <Play className="h-3 w-3" />
                            )}
                            {isRunning ? "Running…" : "Run"}
                        </button>
                    )}
                </div>
            </div>
            <code className="mt-2 block text-[12px] font-mono text-[#a0a0a0] break-all">
                {cmd.command}
            </code>
            {result?.status === "failed" && result.stderr && (
                <p className="mt-2 text-[11px] text-red-400 font-mono">
                    {result.stderr}
                </p>
            )}
            {result?.status === "success" && result.stdout && (
                <p className="mt-2 text-[11px] text-emerald-400 font-mono whitespace-pre-wrap">
                    {result.stdout}
                </p>
            )}
        </div>
    )
}