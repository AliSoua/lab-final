// src/components/LabInstance/run/ResizableLabWorkspace.tsx
import { useState, useCallback, useRef, useEffect } from "react"
import { cn } from "@/lib/utils"

interface ResizableLabWorkspaceProps {
    leftPanel: React.ReactNode
    rightPanel: React.ReactNode
    defaultLeftWidth?: number // percentage
    minLeftWidth?: number     // percentage
    maxLeftWidth?: number     // percentage
}

export function ResizableLabWorkspace({
    leftPanel,
    rightPanel,
    defaultLeftWidth = 45,
    minLeftWidth = 25,
    maxLeftWidth = 65,
}: ResizableLabWorkspaceProps) {
    const [leftWidth, setLeftWidth] = useState(defaultLeftWidth)
    const [isDragging, setIsDragging] = useState(false)
    const containerRef = useRef<HTMLDivElement>(null)

    const handleMouseDown = useCallback(() => {
        setIsDragging(true)
    }, [])

    const handleMouseUp = useCallback(() => {
        setIsDragging(false)
    }, [])

    const handleMouseMove = useCallback(
        (e: MouseEvent) => {
            if (!isDragging || !containerRef.current) return
            const rect = containerRef.current.getBoundingClientRect()
            const x = e.clientX - rect.left
            const percentage = (x / rect.width) * 100
            setLeftWidth(Math.max(minLeftWidth, Math.min(maxLeftWidth, percentage)))
        },
        [isDragging, minLeftWidth, maxLeftWidth]
    )

    useEffect(() => {
        if (isDragging) {
            window.addEventListener("mousemove", handleMouseMove)
            window.addEventListener("mouseup", handleMouseUp)
            document.body.style.cursor = "col-resize"
            document.body.style.userSelect = "none"
        }
        return () => {
            window.removeEventListener("mousemove", handleMouseMove)
            window.removeEventListener("mouseup", handleMouseUp)
            document.body.style.cursor = ""
            document.body.style.userSelect = ""
        }
    }, [isDragging, handleMouseMove, handleMouseUp])

    return (
        <div ref={containerRef} className="flex h-full w-full overflow-hidden">
            {/* Left Panel - Guide */}
            <div
                className="h-full overflow-hidden flex flex-col"
                style={{ width: `${leftWidth}%` }}
            >
                {leftPanel}
            </div>

            {/* Resizer */}
            <div
                onMouseDown={handleMouseDown}
                className={cn(
                    "w-1.5 shrink-0 bg-[#e8e8e8] hover:bg-[#1ca9b1] cursor-col-resize transition-colors relative z-10",
                    isDragging && "bg-[#1ca9b1]"
                )}
            />

            {/* Right Panel - Console */}
            <div
                className="h-full overflow-hidden flex-1"
                style={{ width: `${100 - leftWidth}%` }}
            >
                {rightPanel}
            </div>
        </div>
    )
}