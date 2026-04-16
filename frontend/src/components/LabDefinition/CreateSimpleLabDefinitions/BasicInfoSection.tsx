// src/components/LabDefinition/CreateSimpleLabDefinitions/BasicInfoSection.tsx
import { cn } from "@/lib/utils"
import { useEffect } from "react"
import { useFormContext } from "react-hook-form"
import type { CreateSimpleLabDefinitionFormData } from "@/types/LabDefinition/CreateSimpleLabDefinition"
import { Clock, Type, AlignLeft } from "lucide-react"

export function BasicInfoSection() {
    const {
        register,
        watch,
        setValue,
        formState: { errors },
    } = useFormContext<CreateSimpleLabDefinitionFormData>()

    const name = watch("name")

    // Real-time slug generation from name
    useEffect(() => {
        if (name) {
            const generated = name
                .toLowerCase()
                .trim()
                .replace(/[^a-z0-9]+/g, "-")
                .replace(/(^-|-$)/g, "")
                .substring(0, 50)
            setValue("slug", generated, { shouldValidate: true, shouldDirty: true })
        }
    }, [name, setValue])

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 w-full">
            {/* Lab Name - Spans full width on large screens */}
            <div className="lg:col-span-3 space-y-2">
                <label className="text-xs font-medium text-slate-600 uppercase tracking-wider">
                    Lab Name
                </label>
                <div className="relative">
                    <Type className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input
                        type="text"
                        {...register("name", { required: "Lab name is required" })}
                        placeholder="e.g., Advanced NGINX Web Server Lab"
                        className={cn(
                            "w-full bg-white border border-slate-200 rounded-lg pl-10 pr-4 py-2.5 text-sm text-slate-700",
                            "placeholder:text-slate-400",
                            "focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 outline-none",
                            "transition-all duration-200",
                            errors.name && "border-red-400 focus:border-red-500 focus:ring-red-500/20"
                        )}
                    />
                </div>
                {errors.name && (
                    <p className="text-xs text-red-500">{errors.name.message}</p>
                )}
            </div>

            {/* Slug - 1 column */}
            <div className="space-y-2">
                <label className="text-xs font-medium text-slate-600 uppercase tracking-wider">
                    URL Slug <span className="text-slate-400 font-normal">(auto-generated)</span>
                </label>
                <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-400">/</span>
                    <input
                        type="text"
                        {...register("slug", { required: "Slug is required" })}
                        readOnly
                        className={cn(
                            "w-full bg-slate-50 border border-slate-200 rounded-lg pl-7 pr-4 py-2.5 text-sm text-slate-600",
                            "cursor-not-allowed",
                            errors.slug && "border-red-400"
                        )}
                    />
                </div>
                <p className="text-xs text-slate-400">
                    Automatically generated from the lab name
                </p>
            </div>

            {/* Duration - 1 column */}
            <div className="space-y-2">
                <label className="text-xs font-medium text-slate-600 uppercase tracking-wider">
                    Duration (minutes)
                </label>
                <div className="relative">
                    <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input
                        type="number"
                        min={5}
                        max={480}
                        {...register("duration_minutes", {
                            required: "Duration is required",
                            min: { value: 5, message: "Minimum 5 minutes" },
                            max: { value: 480, message: "Maximum 8 hours" },
                            valueAsNumber: true,
                        })}
                        className={cn(
                            "w-full bg-white border border-slate-200 rounded-lg pl-10 pr-4 py-2.5 text-sm text-slate-700",
                            "focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 outline-none",
                            "transition-all duration-200",
                            errors.duration_minutes && "border-red-400 focus:border-red-500 focus:ring-red-500/20"
                        )}
                    />
                </div>
                {errors.duration_minutes && (
                    <p className="text-xs text-red-500">{errors.duration_minutes.message}</p>
                )}
            </div>

            {/* Max Concurrent Users - 1 column (NEW) */}
            <div className="space-y-2">
                <label className="text-xs font-medium text-slate-600 uppercase tracking-wider">
                    Max Concurrent Users
                </label>
                <div className="relative">
                    <input
                        type="number"
                        min={1}
                        max={100}
                        {...register("max_concurrent_users", {
                            required: "Required",
                            min: { value: 1, message: "Min 1" },
                            max: { value: 100, message: "Max 100" },
                            valueAsNumber: true,
                        })}
                        className={cn(
                            "w-full bg-white border border-slate-200 rounded-lg px-4 py-2.5 text-sm text-slate-700",
                            "focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 outline-none",
                            "transition-all duration-200",
                            errors.max_concurrent_users && "border-red-400 focus:border-red-500 focus:ring-red-500/20"
                        )}
                    />
                </div>
                {errors.max_concurrent_users && (
                    <p className="text-xs text-red-500">{errors.max_concurrent_users.message}</p>
                )}
            </div>

            {/* Short Description - Full width */}
            <div className="lg:col-span-3 space-y-2">
                <label className="text-xs font-medium text-slate-600 uppercase tracking-wider">
                    Short Description
                </label>
                <div className="relative">
                    <AlignLeft className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                    <input
                        type="text"
                        {...register("short_description", {
                            required: "Short description is required",
                            maxLength: { value: 120, message: "Max 120 characters" },
                        })}
                        placeholder="Brief summary displayed in catalog (max 120 chars)"
                        className={cn(
                            "w-full bg-white border border-slate-200 rounded-lg pl-10 pr-4 py-2.5 text-sm text-slate-700",
                            "placeholder:text-slate-400",
                            "focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 outline-none",
                            "transition-all duration-200",
                            errors.short_description && "border-red-400 focus:border-red-500 focus:ring-red-500/20"
                        )}
                    />
                </div>
                <div className="flex justify-between items-center">
                    {errors.short_description ? (
                        <p className="text-xs text-red-500">{errors.short_description.message}</p>
                    ) : (
                        <span />
                    )}
                    <span className="text-xs text-slate-400">{watch("short_description")?.length || 0}/120</span>
                </div>
            </div>

            {/* Full Description - Full width */}
            <div className="lg:col-span-3 space-y-2">
                <label className="text-xs font-medium text-slate-600 uppercase tracking-wider">
                    Full Description
                </label>
                <textarea
                    {...register("description", { required: "Description is required" })}
                    rows={4}
                    placeholder="Detailed description of the lab objectives and outcomes..."
                    className={cn(
                        "w-full bg-white border border-slate-200 rounded-lg px-4 py-3 text-sm text-slate-700 resize-none",
                        "placeholder:text-slate-400",
                        "focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 outline-none",
                        "transition-all duration-200",
                        errors.description && "border-red-400 focus:border-red-500 focus:ring-red-500/20"
                    )}
                />
                {errors.description && (
                    <p className="text-xs text-red-500">{errors.description.message}</p>
                )}
            </div>

            {/* Category - 1 column */}
            <div className="space-y-2">
                <label className="text-xs font-medium text-slate-600 uppercase tracking-wider">
                    Category
                </label>
                <select
                    {...register("category", { required: "Category is required" })}
                    className={cn(
                        "w-full bg-white border border-slate-200 rounded-lg px-4 py-2.5 text-sm text-slate-700",
                        "focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 outline-none",
                        "transition-all duration-200 cursor-pointer",
                        errors.category && "border-red-400 focus:border-red-500 focus:ring-red-500/20"
                    )}
                >
                    <option value="" disabled>Select category...</option>
                    <option value="database">Database</option>
                    <option value="networking">Networking</option>
                    <option value="security">Security</option>
                    <option value="devops">DevOps</option>
                    <option value="cloud">Cloud</option>
                    <option value="programming">Programming</option>
                    <option value="web_development">Web Development</option>
                    <option value="data_science">Data Science</option>
                </select>
                {errors.category && (
                    <p className="text-xs text-red-500">{errors.category.message}</p>
                )}
            </div>

            {/* Difficulty - 1 column */}
            <div className="space-y-2">
                <label className="text-xs font-medium text-slate-600 uppercase tracking-wider">
                    Difficulty
                </label>
                <select
                    {...register("difficulty", { required: "Difficulty is required" })}
                    className={cn(
                        "w-full bg-white border border-slate-200 rounded-lg px-4 py-2.5 text-sm text-slate-700",
                        "focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 outline-none",
                        "transition-all duration-200 cursor-pointer",
                        errors.difficulty && "border-red-400 focus:border-red-500 focus:ring-red-500/20"
                    )}
                >
                    <option value="" disabled>Select difficulty...</option>
                    <option value="beginner">Beginner</option>
                    <option value="intermediate">Intermediate</option>
                    <option value="advanced">Advanced</option>
                </select>
                {errors.difficulty && (
                    <p className="text-xs text-red-500">{errors.difficulty.message}</p>
                )}
            </div>

            {/* Track - 1 column (optional) */}
            <div className="space-y-2">
                <label className="text-xs font-medium text-slate-600 uppercase tracking-wider">
                    Track <span className="text-slate-400 font-normal">(optional)</span>
                </label>
                <input
                    type="text"
                    {...register("track")}
                    placeholder="e.g., DevOps Fundamentals"
                    className={cn(
                        "w-full bg-white border border-slate-200 rounded-lg px-4 py-2.5 text-sm text-slate-700",
                        "placeholder:text-slate-400",
                        "focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 outline-none",
                        "transition-all duration-200"
                    )}
                />
            </div>
        </div>
    )
}