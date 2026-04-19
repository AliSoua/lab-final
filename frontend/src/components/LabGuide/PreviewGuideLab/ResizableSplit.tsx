// src/components/LabGuide/PreviewGuideLab/ResizableSplit.tsx
import { useState, useEffect, useRef, useCallback } from "react"
import { cn } from "@/lib/utils"

interface ResizableSplitProps {
    left: React.ReactNode
    right: React.ReactNode
    defaultLeftWidth?: number
}

export function ResizableSplit({ left, right, defaultLeftWidth = 50 }: ResizableSplitProps) {
    const [leftWidth, setLeftWidth] = useState(defaultLeftWidth)
    const [isDragging, setIsDragging] = useState(false)
    const containerRef = useRef<HTMLDivElement>(null)

    const handleMouseMove = useCallback((e: MouseEvent) => {
        if (!isDragging || !containerRef.current) return
        const rect = containerRef.current.getBoundingClientRect()
        const x = e.clientX - rect.left
        const percentage = (x / rect.width) * 100
        setLeftWidth(Math.min(Math.max(percentage, 30), 70))
    }, [isDragging])

    const handleMouseUp = useCallback(() => {
        setIsDragging(false)
    }, [])

    useEffect(() => {
        if (isDragging) {
            document.addEventListener("mousemove", handleMouseMove)
            document.addEventListener("mouseup", handleMouseUp)
            document.body.style.cursor = "col-resize"
            document.body.style.userSelect = "none"
        }
        return () => {
            document.removeEventListener("mousemove", handleMouseMove)
            document.removeEventListener("mouseup", handleMouseUp)
            document.body.style.cursor = ""
            document.body.style.userSelect = ""
        }
    }, [isDragging, handleMouseMove, handleMouseUp])

    return (
        <div ref={containerRef} className="flex h-full w-full">
            {/* Left Panel */}
            <div
                style={{ width: `${leftWidth}%` }}
                className="h-full overflow-hidden bg-[#f9f9f9]"
            >
                {left}
            </div>

            {/* Drag Handle */}
            <div
                className={cn(
                    "relative w-1.5 shrink-0 z-10 transition-colors",
                    isDragging ? "bg-[#1ca9b1]" : "bg-[#e8e8e8] hover:bg-[#1ca9b1]"
                )}
                onMouseDown={() => setIsDragging(true)}
            >
                <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-1 h-8 rounded-full bg-current opacity-30" />
            </div>

            {/* Right Panel */}
            <div
                style={{ width: `${100 - leftWidth}%` }}
                className="h-full overflow-hidden bg-[#1a1a1a]"
            >
                {right}
            </div>
        </div>
    )
}