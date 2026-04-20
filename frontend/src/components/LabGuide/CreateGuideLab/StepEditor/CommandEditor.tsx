// src/components/LabGuide/CreateGuideLab/StepEditor/CommandEditor.tsx

import { cn } from "@/lib/utils"
import { Terminal, Trash2, Clock, Shield } from "lucide-react"
import type { GuideCommand } from "@/types/LabGuide"

interface CommandEditorProps {
    index: number
    command: GuideCommand
    onChange: (patch: Partial<GuideCommand>) => void
    onRemove: () => void
}

export function CommandEditor({ index, command, onChange, onRemove }: CommandEditorProps) {
    return (
        <div className="border border-[#e8e8e8] rounded-xl bg-white overflow-hidden hover:border-[#1ca9b1]/30 transition-colors">
            {/* Command Header */}
            <div className="flex items-center gap-3 px-4 py-3 border-b border-[#f5f5f5] bg-[#fafafa]">
                <div className="flex h-6 w-6 items-center justify-center rounded bg-[#1a1a1a] text-[#1ca9b1] text-[10px] font-bold font-mono">
                    {index + 1}
                </div>
                <Terminal className="h-3.5 w-3.5 text-[#727373]" />
                <input
                    type="text"
                    value={command.label}
                    onChange={(e) => onChange({ label: e.target.value })}
                    placeholder="Command label"
                    className={cn(
                        "flex-1 bg-transparent text-[13px] font-medium text-[#3a3a3a] placeholder:text-[#c4c4c4]",
                        "outline-none border-none focus:ring-0"
                    )}
                />
                <button
                    type="button"
                    onClick={onRemove}
                    className="p-1.5 text-[#c4c4c4] hover:text-red-500 hover:bg-red-50 rounded-md transition-colors"
                >
                    <Trash2 className="h-3.5 w-3.5" />
                </button>
            </div>

            {/* Command Body */}
            <div className="p-4 space-y-3">
                <textarea
                    value={command.command}
                    onChange={(e) => onChange({ command: e.target.value })}
                    placeholder="nmap -sV 192.168.1.10"
                    rows={2}
                    className={cn(
                        "w-full rounded-lg border border-[#d4d4d4] bg-[#1a1a1a] px-3 py-2",
                        "text-[12px] font-mono text-green-400 placeholder:text-[#555]",
                        "outline-none focus:border-[#1ca9b1] resize-none"
                    )}
                />

                {/* NEW: Execution Target */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="space-y-1">
                        <label className="text-[10px] font-medium text-[#727373] uppercase tracking-wider">
                            Target VM
                        </label>
                        <input
                            type="text"
                            value={command.target?.vm_name || ""}
                            onChange={(e) =>
                                onChange({
                                    target: e.target.value
                                        ? { vm_name: e.target.value }
                                        : undefined,
                                })
                            }
                            placeholder="e.g., attacker-kali"
                            className={cn(
                                "w-full rounded-md border border-[#d4d4d4] bg-white px-2.5 py-1.5",
                                "text-[12px] text-[#3a3a3a] placeholder:text-[#c4c4c4]",
                                "outline-none focus:border-[#1ca9b1]"
                            )}
                        />
                        <p className="text-[10px] text-[#c4c4c4]">Leave empty to use session default</p>
                    </div>

                    <div className="space-y-1">
                        <label className="text-[10px] font-medium text-[#727373] uppercase tracking-wider">
                            Working Directory
                        </label>
                        <input
                            type="text"
                            value={command.working_directory || "/home/user"}
                            onChange={(e) => onChange({ working_directory: e.target.value })}
                            placeholder="/home/user"
                            className={cn(
                                "w-full rounded-md border border-[#d4d4d4] bg-white px-2.5 py-1.5",
                                "text-[12px] text-[#3a3a3a] placeholder:text-[#c4c4c4]",
                                "outline-none focus:border-[#1ca9b1]"
                            )}
                        />
                    </div>

                    <div className="space-y-1">
                        <label className="text-[10px] font-medium text-[#727373] uppercase tracking-wider">
                            Timeout (seconds)
                        </label>
                        <div className="relative">
                            <Clock className="absolute left-2.5 top-1/2 h-3 w-3 -translate-y-1/2 text-[#c4c4c4]" />
                            <input
                                type="number"
                                value={command.timeout || 300}
                                onChange={(e) => onChange({ timeout: parseInt(e.target.value) || 300 })}
                                className={cn(
                                    "w-full rounded-md border border-[#d4d4d4] bg-white pl-8 pr-2.5 py-1.5",
                                    "text-[12px] text-[#3a3a3a]",
                                    "outline-none focus:border-[#1ca9b1]"
                                )}
                            />
                        </div>
                    </div>
                </div>

                {/* Options */}
                <div className="flex items-center gap-4 pt-1">
                    <label className="flex items-center gap-1.5 text-xs text-[#727373] cursor-pointer">
                        <input
                            type="checkbox"
                            checked={command.sudo || false}
                            onChange={(e) => onChange({ sudo: e.target.checked })}
                            className="rounded border-[#d4d4d4] text-[#1ca9b1] focus:ring-[#1ca9b1] h-3.5 w-3.5"
                        />
                        <Shield className="h-3 w-3" />
                        Run with sudo
                    </label>
                </div>
            </div>
        </div>
    )
}