// src/components/LabDefinition/CreateFullLabDefinitions/DetailsStep.tsx
import { cn } from "@/lib/utils"
import { useFormContext, useFieldArray } from "react-hook-form"
import type { CreateFullLabDefinitionFormData } from "@/types/LabDefinition/CreateFullLabDefinition"
import { ListChecks, GraduationCap, Tags, Plus, X, Sparkles } from "lucide-react"

export function DetailsStep() {
    const { control } = useFormContext<CreateFullLabDefinitionFormData>()

    const {
        fields: objectiveFields,
        append: appendObjective,
        remove: removeObjective,
    } = useFieldArray({
        control,
        name: "objectives",
    })

    const {
        fields: prereqFields,
        append: appendPrereq,
        remove: removePrereq,
    } = useFieldArray({
        control,
        name: "prerequisites",
    })

    const {
        fields: tagFields,
        append: appendTag,
        remove: removeTag,
    } = useFieldArray({
        control,
        name: "tags",
    })

    return (
        <div className="space-y-8">
            <div className="flex items-center gap-2 pb-2 border-b border-[#e8e8e8]">
                <Sparkles className="h-4 w-4 text-[#1ca9b1]" />
                <h2 className="text-[14px] font-semibold text-[#3a3a3a] uppercase tracking-wider">
                    Lab Content <span className="text-[#c4c4c4] normal-case font-normal">(Optional)</span>
                </h2>
            </div>

            <p className="text-[13px] text-[#727373] -mt-4">
                Add learning objectives, prerequisites, and tags to help trainees understand what they'll learn. Skip this step if you want to add these later.
            </p>

            {/* Objectives */}
            <div className="space-y-3">
                <div className="flex items-center justify-between">
                    <label className="text-[12px] font-medium text-[#727373] uppercase tracking-wider flex items-center gap-2">
                        <ListChecks className="h-3.5 w-3.5" />
                        Learning Objectives
                    </label>
                    <button
                        type="button"
                        onClick={() => appendObjective("")}
                        className="text-[11px] text-[#1ca9b1] hover:text-[#17959c] font-medium flex items-center gap-1 transition-colors"
                    >
                        <Plus className="h-3 w-3" />
                        Add Objective
                    </button>
                </div>
                <div className="space-y-2">
                    {objectiveFields.map((field, index) => (
                        <div key={field.id} className="flex gap-2">
                            <input
                                type="text"
                                {...control.register(`objectives.${index}` as const)}
                                placeholder={`Objective ${index + 1}`}
                                className={cn(
                                    "flex-1 bg-transparent px-3 py-2 text-[13px] text-[#3a3a3a]",
                                    "border-0 border-b border-[#d4d4d4] outline-none",
                                    "placeholder:text-[#c8c8c8]",
                                    "focus:border-[#1ca9b1] transition-colors duration-200"
                                )}
                            />
                            <button
                                type="button"
                                onClick={() => removeObjective(index)}
                                className="p-2 text-[#c4c4c4] hover:text-red-500 transition-colors"
                                title="Remove"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </div>
                    ))}
                    {objectiveFields.length === 0 && (
                        <p className="text-[13px] text-[#c4c4c4] italic py-2">
                            No objectives added yet. Examples: "Configure NGINX", "Understand SSL termination"
                        </p>
                    )}
                </div>
            </div>

            {/* Prerequisites */}
            <div className="space-y-3">
                <div className="flex items-center justify-between">
                    <label className="text-[12px] font-medium text-[#727373] uppercase tracking-wider flex items-center gap-2">
                        <GraduationCap className="h-3.5 w-3.5" />
                        Prerequisites
                    </label>
                    <button
                        type="button"
                        onClick={() => appendPrereq("")}
                        className="text-[11px] text-[#1ca9b1] hover:text-[#17959c] font-medium flex items-center gap-1 transition-colors"
                    >
                        <Plus className="h-3 w-3" />
                        Add Prerequisite
                    </button>
                </div>
                <div className="space-y-2">
                    {prereqFields.map((field, index) => (
                        <div key={field.id} className="flex gap-2">
                            <input
                                type="text"
                                {...control.register(`prerequisites.${index}` as const)}
                                placeholder={`Prerequisite ${index + 1}`}
                                className={cn(
                                    "flex-1 bg-transparent px-3 py-2 text-[13px] text-[#3a3a3a]",
                                    "border-0 border-b border-[#d4d4d4] outline-none",
                                    "placeholder:text-[#c8c8c8]",
                                    "focus:border-[#1ca9b1] transition-colors duration-200"
                                )}
                            />
                            <button
                                type="button"
                                onClick={() => removePrereq(index)}
                                className="p-2 text-[#c4c4c4] hover:text-red-500 transition-colors"
                                title="Remove"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </div>
                    ))}
                    {prereqFields.length === 0 && (
                        <p className="text-[13px] text-[#c4c4c4] italic py-2">
                            No prerequisites defined. Examples: "Basic Linux knowledge", "Networking fundamentals"
                        </p>
                    )}
                </div>
            </div>

            {/* Tags */}
            <div className="space-y-3">
                <div className="flex items-center justify-between">
                    <label className="text-[12px] font-medium text-[#727373] uppercase tracking-wider flex items-center gap-2">
                        <Tags className="h-3.5 w-3.5" />
                        Tags
                    </label>
                    <button
                        type="button"
                        onClick={() => appendTag("")}
                        className="text-[11px] text-[#1ca9b1] hover:text-[#17959c] font-medium flex items-center gap-1 transition-colors"
                    >
                        <Plus className="h-3 w-3" />
                        Add Tag
                    </button>
                </div>
                <div className="flex flex-wrap gap-2">
                    {tagFields.map((field, index) => (
                        <div
                            key={field.id}
                            className="flex items-center gap-1 bg-[#f5f5f5] rounded-full pl-3 pr-1 py-1 border border-[#e8e8e8]"
                        >
                            <input
                                type="text"
                                {...control.register(`tags.${index}` as const)}
                                placeholder="tag-name"
                                className={cn(
                                    "bg-transparent text-[12px] text-[#3a3a3a] outline-none w-24",
                                    "placeholder:text-[#c4c4c4]"
                                )}
                            />
                            <button
                                type="button"
                                onClick={() => removeTag(index)}
                                className="p-1 text-[#727373] hover:text-red-500 transition-colors"
                                title="Remove tag"
                            >
                                <X className="h-3 w-3" />
                            </button>
                        </div>
                    ))}
                    {tagFields.length === 0 && (
                        <p className="text-[13px] text-[#c4c4c4] italic py-2">
                            No tags added. Tags improve searchability. Examples: "networking", "security", "hands-on"
                        </p>
                    )}
                </div>
            </div>
        </div>
    )
}