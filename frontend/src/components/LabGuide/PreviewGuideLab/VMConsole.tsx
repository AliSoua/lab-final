// src/components/LabGuide/PreviewGuideLab/VMConsole.tsx
import { useRef, useEffect } from "react"
import { cn } from "@/lib/utils"
import { Terminal, Activity } from "lucide-react"

interface VMConsoleProps {
    vmName: string
    lines: string[]
}

export function VMConsole({ vmName, lines }: VMConsoleProps) {
    const scrollRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight
        }
    }, [lines])

    const getLineColor = (line: string) => {
        if (line.startsWith("[") && line.includes("]$"))
            return "text-[#1ca9b1]" // timestamped prompt
        if (line.startsWith("> Executing:"))
            return "text-amber-400"
        if (line.startsWith("> Command completed"))
            return "text-green-400"
        if (line.startsWith("Error") || line.startsWith("> Error"))
            return "text-red-400"
        return "text-[#e8e8e8]" // default
    }

    return (
        <div className="flex flex-col h-full bg-[#1a1a1a]">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-[#333] bg-[#252525] shrink-0">
                <div className="flex items-center gap-2 min-w-0">
                    <Terminal className="h-4 w-4 text-[#1ca9b1] shrink-0" />
                    <span className="text-[13px] font-medium text-[#e8e8e8] font-mono truncate">
                        {vmName}
                    </span>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                    <Activity className="h-3 w-3 text-green-500" />
                    <span className="text-[10px] text-[#727373] uppercase tracking-wider font-medium">
                        Connected
                    </span>
                </div>
            </div>

            {/* Terminal Output */}
            <div
                ref={scrollRef}
                className="flex-1 overflow-y-auto p-4 font-mono text-[13px] leading-relaxed space-y-0.5"
            >
                {lines.length === 0 ? (
                    <span className="text-[#555] italic">Waiting for commands...</span>
                ) : (
                    lines.map((line, i) => (
                        <div key={i} className={cn("break-all", getLineColor(line))}>
                            {line || " "}
                        </div>
                    ))
                )}
            </div>

            {/* Prompt */}
            <div className="px-4 py-2.5 border-t border-[#333] bg-[#1a1a1a] shrink-0 flex items-center gap-2">
                <span className="text-green-500 font-mono text-[13px]">$</span>
                <span className="text-[#555] font-mono text-[13px] italic">
                    Ready for next command
                </span>
                <span className="inline-block w-2 h-4 bg-[#1ca9b1] ml-1 animate-pulse" />
            </div>
        </div>
    )
}