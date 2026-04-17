// src/components/LabDefinition/CreateFullLabDefinitions/GuideStep.tsx
import { cn } from "@/lib/utils"
import { useFormContext, useFieldArray } from "react-hook-form"
import { GuideBlockType } from "@/types/LabDefinition/CreateFullLabDefinition"
import type { CreateFullLabDefinitionFormData } from "@/types/LabDefinition/CreateFullLabDefinition"
import { BookOpen, Plus, Trash2, Type, Terminal, GripVertical } from "lucide-react"

const BLOCK_TYPES: { value: GuideBlockType; label: string; icon: React.ReactNode }[] = [
    { value: GuideBlockType.TEXT, label: "Text Block", icon: <Type className="h-4 w-4" /> },
    { value: GuideBlockType.CMD, label: "Command Block", icon: <Terminal className="h-4 w-4" /> },
]

export function GuideStep() {
    const { control, register, watch } = useFormContext<CreateFullLabDefinitionFormData>()

    const { fields, append, remove } = useFieldArray({
        control,
        name: "guide_blocks",
    })

    const addBlock = (type: GuideBlockType) => {
        append({
            block_type: type,
            content: "",
            title: "",
            order: fields.length,
            block_metadata: type === GuideBlockType.CMD ? {
                working_directory: "/home/user",
                timeout: 300,
                sudo: false,
                confirmation_required: false
            } : {
                syntax_highlighting: "",
                collapsible: false,
                collapsed_by_default: false
            }
        })
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between pb-2 border-b border-[#e8e8e8]">
                <div className="flex items-center gap-2">
                    <BookOpen className="h-4 w-4 text-[#1ca9b1]" />
                    <h2 className="text-[14px] font-semibold text-[#3a3a3a] uppercase tracking-wider">
                        Lab Guide
                    </h2>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        onClick={() => addBlock(GuideBlockType.TEXT)}
                        className={cn(
                            "flex items-center gap-2 px-3 py-2 rounded-lg border border-[#e8e8e8]",
                            "text-[12px] font-medium text-[#3a3a3a] hover:bg-[#f5f5f5]",
                            "transition-colors duration-200"
                        )}
                    >
                        <Type className="h-4 w-4 text-[#1ca9b1]" />
                        Add Text
                    </button>
                    <button
                        type="button"
                        onClick={() => addBlock(GuideBlockType.CMD)}
                        className={cn(
                            "flex items-center gap-2 px-3 py-2 rounded-lg",
                            "bg-[#1ca9b1] text-white text-[12px] font-medium",
                            "hover:bg-[#17959c] transition-colors duration-200"
                        )}
                    >
                        <Terminal className="h-4 w-4" />
                        Add Command
                    </button>
                </div>
            </div>

            <div className="space-y-4">
                {fields.map((field, index) => {
                    const blockType = watch(`guide_blocks.${index}.block_type`)

                    return (
                        <div key={field.id} className="bg-white rounded-xl border border-[#e8e8e8] p-5 shadow-sm">
                            <div className="flex items-start gap-3 mb-4">
                                <div className="p-2 rounded-lg bg-[#f5f5f5] text-[#727373] cursor-move">
                                    <GripVertical className="h-4 w-4" />
                                </div>

                                <div className="flex-1 space-y-3">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            {blockType === GuideBlockType.TEXT ? (
                                                <Type className="h-4 w-4 text-[#1ca9b1]" />
                                            ) : (
                                                <Terminal className="h-4 w-4 text-[#1ca9b1]" />
                                            )}
                                            <span className="text-[12px] font-medium text-[#727373] uppercase">
                                                {blockType === GuideBlockType.TEXT ? "Text Block" : "Command Block"}
                                            </span>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => remove(index)}
                                            className="p-1.5 text-[#c4c4c4] hover:text-red-500 transition-colors"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </button>
                                    </div>

                                    {/* Title */}
                                    <input
                                        type="text"
                                        {...register(`guide_blocks.${index}.title` as const)}
                                        placeholder="Block title (optional)"
                                        className={cn(
                                            "w-full bg-transparent px-3 py-2 text-[13px] text-[#3a3a3a]",
                                            "border border-[#d4d4d4] rounded-lg outline-none",
                                            "placeholder:text-[#c8c8c8]",
                                            "focus:border-[#1ca9b1] transition-colors duration-200"
                                        )}
                                    />

                                    {/* Content */}
                                    <div className="space-y-2">
                                        <label className="text-[11px] font-medium text-[#727373] uppercase">
                                            {blockType === GuideBlockType.TEXT ? "Content" : "Command"}
                                        </label>
                                        {blockType === GuideBlockType.TEXT ? (
                                            <textarea
                                                {...register(`guide_blocks.${index}.content` as const, { required: true })}
                                                rows={4}
                                                placeholder="Enter instructional text (markdown supported)..."
                                                className={cn(
                                                    "w-full bg-transparent px-3 py-2 text-[13px] text-[#3a3a3a]",
                                                    "border border-[#d4d4d4] rounded-lg outline-none resize-none",
                                                    "placeholder:text-[#c8c8c8]",
                                                    "focus:border-[#1ca9b1] transition-colors duration-200"
                                                )}
                                            />
                                        ) : (
                                            <div className="relative">
                                                <Terminal className="absolute left-3 top-3 h-4 w-4 text-[#c4c4c4]" />
                                                <input
                                                    type="text"
                                                    {...register(`guide_blocks.${index}.content` as const, { required: true })}
                                                    placeholder="Enter command to execute..."
                                                    className={cn(
                                                        "w-full bg-transparent pl-9 pr-3 py-2 text-[13px] font-mono text-[#3a3a3a]",
                                                        "border border-[#d4d4d4] rounded-lg outline-none",
                                                        "placeholder:text-[#c8c8c8]",
                                                        "focus:border-[#1ca9b1] transition-colors duration-200"
                                                    )}
                                                />
                                            </div>
                                        )}
                                    </div>

                                    {/* Block-specific settings */}
                                    {blockType === GuideBlockType.CMD && (
                                        <div className="grid grid-cols-3 gap-3 pt-3 border-t border-[#f0f0f0]">
                                            <label className="flex items-center gap-2 text-[12px] text-[#727373]">
                                                <input
                                                    type="checkbox"
                                                    {...register(`guide_blocks.${index}.block_metadata.sudo` as const)}
                                                    className="rounded border-[#d4d4d4] text-[#1ca9b1] focus:ring-[#1ca9b1]"
                                                />
                                                Run as sudo
                                            </label>
                                            <label className="flex items-center gap-2 text-[12px] text-[#727373]">
                                                <input
                                                    type="checkbox"
                                                    {...register(`guide_blocks.${index}.block_metadata.confirmation_required` as const)}
                                                    className="rounded border-[#d4d4d4] text-[#1ca9b1] focus:ring-[#1ca9b1]"
                                                />
                                                Require confirm
                                            </label>
                                            <div className="flex items-center gap-2">
                                                <span className="text-[12px] text-[#727373]">Timeout:</span>
                                                <input
                                                    type="number"
                                                    {...register(`guide_blocks.${index}.block_metadata.timeout` as const, { valueAsNumber: true })}
                                                    className="w-16 px-2 py-1 text-[12px] border border-[#d4d4d4] rounded outline-none focus:border-[#1ca9b1]"
                                                />
                                                <span className="text-[11px] text-[#c4c4c4]">s</span>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )
                })}

                {fields.length === 0 && (
                    <div className="text-center py-12 bg-[#f9f9f9] rounded-xl border border-dashed border-[#d4d4d4]">
                        <BookOpen className="h-12 w-12 text-[#c4c4c4] mx-auto mb-4" />
                        <p className="text-[13px] text-[#727373] mb-4">No guide blocks added yet</p>
                        <div className="flex items-center justify-center gap-3">
                            <button
                                type="button"
                                onClick={() => addBlock(GuideBlockType.TEXT)}
                                className="text-[13px] text-[#1ca9b1] font-medium hover:text-[#17959c]"
                            >
                                Add text block
                            </button>
                            <span className="text-[#c4c4c4]">or</span>
                            <button
                                type="button"
                                onClick={() => addBlock(GuideBlockType.CMD)}
                                className="text-[13px] text-[#1ca9b1] font-medium hover:text-[#17959c]"
                            >
                                Add command block
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}