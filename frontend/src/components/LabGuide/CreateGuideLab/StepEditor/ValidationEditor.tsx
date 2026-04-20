// src/components/LabGuide/CreateGuideLab/StepEditor/ValidationEditor.tsx
import { cn } from "@/lib/utils"
import { Shield, Trash2, Server } from "lucide-react"
import type { ValidationCheck, ValidationCheckType } from "@/types/LabGuide"

const VALIDATION_TYPES: { value: ValidationCheckType; label: string }[] = [
    { value: "port_open", label: "Port Open" },
    { value: "port_closed", label: "Port Closed" },
    { value: "file_exists", label: "File Exists" },
    { value: "file_content", label: "File Content" },
    { value: "command_output", label: "Command Output" },
    { value: "user_has_root", label: "User Has Root" },
    { value: "service_running", label: "Service Running" },
    { value: "process_running", label: "Process Running" },
    { value: "ping_reachable", label: "Ping Reachable" },
    { value: "custom_script", label: "Custom Script" },
]

interface ValidationEditorProps {
    index: number
    validation: ValidationCheck
    onChange: (patch: Partial<ValidationCheck>) => void
    onRemove: () => void
}

export function ValidationEditor({ index, validation, onChange, onRemove }: ValidationEditorProps) {
    const needsPort = validation.type === "port_open" || validation.type === "port_closed"
    const needsFile = validation.type === "file_exists" || validation.type === "file_content"
    const needsCommand = validation.type === "command_output" || validation.type === "custom_script"

    return (
        <div className={cn(
            "border rounded-xl bg-white overflow-hidden transition-colors",
            validation.is_blocking ? "border-red-200" : "border-[#e8e8e8] hover:border-green-200"
        )}>
            {/* Header */}
            <div className={cn(
                "flex items-center gap-3 px-4 py-3 border-b",
                validation.is_blocking ? "bg-red-50 border-red-100" : "bg-green-50/30 border-[#f5f5f5]"
            )}>
                <div className="flex h-6 w-6 items-center justify-center rounded bg-white border border-[#e8e8e8] text-[10px] font-bold text-[#727373]">
                    {index + 1}
                </div>
                <Shield className={cn("h-3.5 w-3.5", validation.is_blocking ? "text-red-500" : "text-green-600")} />
                <select
                    value={validation.type}
                    onChange={(e) => onChange({ type: e.target.value as ValidationCheckType })}
                    className="bg-transparent text-[12px] font-medium text-[#3a3a3a] outline-none cursor-pointer"
                >
                    {VALIDATION_TYPES.map((t) => (
                        <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                </select>
                <input
                    type="text"
                    value={validation.description}
                    onChange={(e) => onChange({ description: e.target.value })}
                    placeholder="What does this check verify?"
                    className={cn(
                        "flex-1 bg-transparent text-[12px] text-[#3a3a3a] placeholder:text-[#c4c4c4]",
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

            {/* Body */}
            <div className="p-4 space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                    {/* Target VM - NEW */}
                    <div className="space-y-1">
                        <label className="text-[10px] font-medium text-[#727373] uppercase tracking-wider flex items-center gap-1">
                            <Server className="h-3 w-3" />
                            Target VM
                        </label>
                        <input
                            type="text"
                            value={validation.target?.vm_name || ""}
                            onChange={(e) =>
                                onChange({
                                    target: e.target.value
                                        ? { vm_name: e.target.value }
                                        : undefined,
                                })
                            }
                            placeholder="e.g., target-ubuntu"
                            className={cn(
                                "w-full rounded-md border border-[#d4d4d4] bg-white px-2.5 py-1.5",
                                "text-[12px] text-[#3a3a3a] placeholder:text-[#c4c4c4]",
                                "outline-none focus:border-[#1ca9b1]"
                            )}
                        />
                        <p className="text-[10px] text-[#c4c4c4]">Optional — uses session default if empty</p>
                    </div>

                    {/* Dynamic fields */}
                    {needsPort && (
                        <div className="space-y-1">
                            <label className="text-[10px] font-medium text-[#727373] uppercase tracking-wider">Port</label>
                            <input
                                type="number"
                                value={validation.port || ""}
                                onChange={(e) => onChange({ port: parseInt(e.target.value) || undefined })}
                                placeholder="22"
                                className={cn(
                                    "w-full rounded-md border border-[#d4d4d4] bg-white px-2.5 py-1.5",
                                    "text-[12px] text-[#3a3a3a]",
                                    "outline-none focus:border-[#1ca9b1]"
                                )}
                            />
                        </div>
                    )}

                    {needsFile && (
                        <div className="space-y-1">
                            <label className="text-[10px] font-medium text-[#727373] uppercase tracking-wider">File Path</label>
                            <input
                                type="text"
                                value={validation.file_path || ""}
                                onChange={(e) => onChange({ file_path: e.target.value })}
                                placeholder="/etc/passwd"
                                className={cn(
                                    "w-full rounded-md border border-[#d4d4d4] bg-white px-2.5 py-1.5",
                                    "text-[12px] text-[#3a3a3a]",
                                    "outline-none focus:border-[#1ca9b1]"
                                )}
                            />
                        </div>
                    )}

                    {needsCommand && (
                        <div className="space-y-1 md:col-span-2">
                            <label className="text-[10px] font-medium text-[#727373] uppercase tracking-wider">Command</label>
                            <input
                                type="text"
                                value={validation.command || ""}
                                onChange={(e) => onChange({ command: e.target.value })}
                                placeholder="whoami"
                                className={cn(
                                    "w-full rounded-md border border-[#d4d4d4] bg-white px-2.5 py-1.5",
                                    "text-[12px] font-mono text-[#3a3a3a]",
                                    "outline-none focus:border-[#1ca9b1]"
                                )}
                            />
                        </div>
                    )}

                    {validation.type === "file_content" && (
                        <div className="space-y-1 md:col-span-2">
                            <label className="text-[10px] font-medium text-[#727373] uppercase tracking-wider">Expected Content</label>
                            <input
                                type="text"
                                value={validation.expected_content || ""}
                                onChange={(e) => onChange({ expected_content: e.target.value })}
                                placeholder="substring or pattern"
                                className={cn(
                                    "w-full rounded-md border border-[#d4d4d4] bg-white px-2.5 py-1.5",
                                    "text-[12px] text-[#3a3a3a]",
                                    "outline-none focus:border-[#1ca9b1]"
                                )}
                            />
                        </div>
                    )}

                    {validation.type === "command_output" && (
                        <div className="space-y-1 md:col-span-2">
                            <label className="text-[10px] font-medium text-[#727373] uppercase tracking-wider">Expected Output Pattern</label>
                            <input
                                type="text"
                                value={validation.expected_output_pattern || ""}
                                onChange={(e) => onChange({ expected_output_pattern: e.target.value })}
                                placeholder="regex pattern"
                                className={cn(
                                    "w-full rounded-md border border-[#d4d4d4] bg-white px-2.5 py-1.5",
                                    "text-[12px] font-mono text-[#3a3a3a]",
                                    "outline-none focus:border-[#1ca9b1]"
                                )}
                            />
                        </div>
                    )}

                    <div className="space-y-1">
                        <label className="text-[10px] font-medium text-[#727373] uppercase tracking-wider">Points</label>
                        <input
                            type="number"
                            min={0}
                            value={validation.points || 0}
                            onChange={(e) => onChange({ points: parseInt(e.target.value) || 0 })}
                            className={cn(
                                "w-full rounded-md border border-[#d4d4d4] bg-white px-2.5 py-1.5",
                                "text-[12px] text-[#3a3a3a]",
                                "outline-none focus:border-[#1ca9b1]"
                            )}
                        />
                    </div>

                    <div className="space-y-1">
                        <label className="text-[10px] font-medium text-[#727373] uppercase tracking-wider">Timeout (s)</label>
                        <input
                            type="number"
                            min={1}
                            value={validation.timeout || 30}
                            onChange={(e) => onChange({ timeout: parseInt(e.target.value) || 30 })}
                            className={cn(
                                "w-full rounded-md border border-[#d4d4d4] bg-white px-2.5 py-1.5",
                                "text-[12px] text-[#3a3a3a]",
                                "outline-none focus:border-[#1ca9b1]"
                            )}
                        />
                    </div>
                </div>

                <label className="flex items-center gap-2 text-xs text-[#727373] cursor-pointer pt-1">
                    <input
                        type="checkbox"
                        checked={validation.is_blocking || false}
                        onChange={(e) => onChange({ is_blocking: e.target.checked })}
                        className="rounded border-[#d4d4d4] text-red-500 focus:ring-red-500 h-3.5 w-3.5"
                    />
                    <span className={validation.is_blocking ? "text-red-600 font-medium" : ""}>
                        Blocking check (learner cannot proceed until this passes)
                    </span>
                </label>
            </div>
        </div>
    )
}