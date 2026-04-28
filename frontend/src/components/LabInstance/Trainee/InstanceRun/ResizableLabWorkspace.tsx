// src/components/LabInstance/Trainee/InstanceRun/ResizableLabWorkspace.tsx
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
    const isDraggingRef = useRef(false)

    /* ── Drag lifecycle (ref for logic, state for UI) ─────────────────── */
    const startDrag = useCallback(() => {
        isDraggingRef.current = true
        setIsDragging(true)
    }, [])

    const stopDrag = useCallback(() => {
        isDraggingRef.current = false
        setIsDragging(false)
    }, [])

    /* ── Global move / end listeners (registered once, not per drag) ──── */
    useEffect(() => {
        const handleMove = (clientX: number) => {
            if (!isDraggingRef.current || !containerRef.current) return
            const rect = containerRef.current.getBoundingClientRect()
            const x = clientX - rect.left
            const pct = (x / rect.width) * 100
            setLeftWidth(Math.max(minLeftWidth, Math.min(maxLeftWidth, pct)))
        }

        const onMouseMove = (e: MouseEvent) => handleMove(e.clientX)
        const onTouchMove = (e: TouchEvent) => {
            if (e.touches.length > 0) handleMove(e.touches[0].clientX)
        }
        const onEnd = () => {
            if (isDraggingRef.current) stopDrag()
        }

        window.addEventListener("mousemove", onMouseMove)
        window.addEventListener("touchmove", onTouchMove)
        window.addEventListener("mouseup", onEnd)
        window.addEventListener("touchend", onEnd)

        return () => {
            window.removeEventListener("mousemove", onMouseMove)
            window.removeEventListener("touchmove", onTouchMove)
            window.removeEventListener("mouseup", onEnd)
            window.removeEventListener("touchend", onEnd)
        }
    }, [minLeftWidth, maxLeftWidth, stopDrag])

    /* ── Cursor / selection guards ────────────────────────────────────── */
    useEffect(() => {
        if (isDragging) {
            document.body.style.cursor = "col-resize"
            document.body.style.userSelect = "none"
        } else {
            document.body.style.cursor = ""
            document.body.style.userSelect = ""
        }
    }, [isDragging])

    /* ── Keyboard resize (a11y) ───────────────────────────────────────── */
    const handleKeyDown = useCallback(
        (e: React.KeyboardEvent) => {
            const step = 5
            if (e.key === "ArrowLeft") {
                e.preventDefault()
                setLeftWidth(w => Math.max(minLeftWidth, w - step))
            } else if (e.key === "ArrowRight") {
                e.preventDefault()
                setLeftWidth(w => Math.min(maxLeftWidth, w + step))
            }
        },
        [minLeftWidth, maxLeftWidth]
    )

    return (
        <div ref={containerRef} className="flex h-full w-full overflow-hidden">
            {/* Left Panel */}
            <div
                className="h-full overflow-hidden flex flex-col shrink-0"
                style={{ width: `${leftWidth}%` }}
            >
                {leftPanel}
            </div>

            {/* Resizer */}
            <div
                role="separator"
                aria-label="Resize panels"
                aria-valuenow={Math.round(leftWidth)}
                aria-valuemin={minLeftWidth}
                aria-valuemax={maxLeftWidth}
                tabIndex={0}
                onMouseDown={startDrag}
                onTouchStart={startDrag}
                onKeyDown={handleKeyDown}
                className={cn(
                    "w-1.5 shrink-0 bg-[#e8e8e8] hover:bg-[#1ca9b1] cursor-col-resize transition-colors relative z-10",
                    "focus:outline-none focus:bg-[#1ca9b1] focus:ring-1 focus:ring-[#1ca9b1]",
                    isDragging && "bg-[#1ca9b1]"
                )}
            />

            {/* Right Panel */}
            <div className="h-full overflow-hidden flex-1 flex flex-col">
                {rightPanel}
            </div>
        </div>
    )
}