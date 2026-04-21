// src/components/LabGuide/PreviewGuideLab/CommandBlock.tsx
import { cn } from "@/lib/utils"
import { Terminal, Play, Copy } from "lucide-react"
import type { GuideCommand } from "@/types/LabGuide"

interface CommandBlockProps {
    command: GuideCommand
    onRun: () => void
    onCopy: () => void
}

export function CommandBlock({ command, onRun, onCopy }: CommandBlockProps) {
    return (
        <div className="bg-white border border-[#e8e8e8] rounded-lg overflow-hidden">
            <div className="flex items-center justify-between px-3 py-2 border-b border-[#e8e8e8] bg-[#fafafa]">
                <div className="flex items-center gap-2 min-w-0">
                    <Terminal className="h-3.5 w-3.5 text-[#1ca9b1] shrink-0" />
                    {command.label ? (
                        <span className="text-[11px] font-medium text-[#3a3a3a] truncate">
                            {command.label}
                        </span>
                    ) : (
                        <span className="text-[11px] text-[#c4c4c4] italic">Unnamed command</span>
                    )}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                    <button
                        onClick={onCopy}
                        className="p-1.5 rounded-md hover:bg-[#e8e8e8] text-[#727373] transition-colors"
                        title="Copy command"
                    >
                        <Copy className="h-3.5 w-3.5" />
                    </button>
                    <button
                        onClick={onRun}
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-md bg-[#1ca9b1] text-white text-[11px] font-medium hover:bg-[#158a91] transition-colors"
                    >
                        <Play className="h-3 w-3" />
                        Run
                    </button>
                </div>
            </div>
            <div className="px-3 py-2.5 bg-[#1a1a1a] overflow-x-auto">
                <code className="text-[12px] font-mono text-green-400 whitespace-pre-wrap break-all">
                    {command.command}
                </code>
            </div>
            {command.description && (
                <div className="px-3 py-2 border-t border-[#e8e8e8]">
                    <p className="text-[11px] text-[#727373]">{command.description}</p>
                </div>
            )}
            {(command.sudo || command.working_directory || command.timeout) && (
                <div className="px-3 py-1.5 border-t border-[#e8e8e8] flex items-center gap-3 flex-wrap">
                    {command.sudo && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-50 text-amber-600 font-medium">
                            sudo
                        </span>
                    )}
                    {command.working_directory && (
                        <span className="text-[10px] text-[#727373] font-mono truncate">
                            cd {command.working_directory}
                        </span>
                    )}
                    {command.timeout && (
                        <span className="text-[10px] text-[#727373]">
                            timeout: {command.timeout}s
                        </span>
                    )}
                </div>
            )}
        </div>
    )
}