// src/components/LabDefinition/CreateFullLabDefinitions/BasicInfoStep.tsx
import { cn } from "@/lib/utils"
import { useEffect, useRef, useState } from "react"
import { useFormContext } from "react-hook-form"
import type { CreateFullLabDefinitionFormData } from "@/types/LabDefinition/CreateFullLabDefinition"
import { Clock, Type, AlignLeft, ImageIcon, Upload, X, FileImage } from "lucide-react"

export function BasicInfoStep() {
    const {
        register,
        watch,
        setValue,
        formState: { errors },
    } = useFormContext<CreateFullLabDefinitionFormData>()

    const fileInputRef = useRef<HTMLInputElement>(null)
    const [previewUrl, setPreviewUrl] = useState<string | null>(null)
    const [fileName, setFileName] = useState<string | null>(null)

    const name = watch("name")
    const thumbnailUrl = watch("thumbnail_url")
    const thumbnailFile = watch("thumbnail_file")

    // Show preview from either URL or uploaded file
    const displayUrl = previewUrl || thumbnailUrl

    // Auto-generate slug from name
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

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        // Validate file size (5MB max)
        if (file.size > 5 * 1024 * 1024) {
            alert("File too large. Maximum size is 5MB.")
            return
        }

        // Validate file type
        if (!file.type.startsWith("image/")) {
            alert("Please select an image file.")
            return
        }

        // Revoke old preview URL if exists
        if (previewUrl) {
            URL.revokeObjectURL(previewUrl)
        }

        // Create preview URL
        const objectUrl = URL.createObjectURL(file)
        setPreviewUrl(objectUrl)
        setFileName(file.name)

        // Store file in form data
        setValue("thumbnail_file", file, { shouldDirty: true, shouldValidate: true })
        // Clear URL field since we're using file upload
        setValue("thumbnail_url", "", { shouldDirty: true })
    }

    const handleRemoveFile = () => {
        if (previewUrl) {
            URL.revokeObjectURL(previewUrl)
        }
        setPreviewUrl(null)
        setFileName(null)
        setValue("thumbnail_file", null, { shouldDirty: true, shouldValidate: true })
        setValue("thumbnail_url", "", { shouldDirty: true })
        if (fileInputRef.current) {
            fileInputRef.current.value = ""
        }
    }

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

            {/* Max Concurrent Users - 1 column */}
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
                    <option value="system_admin">System Admin</option>
                    <option value="data_science">Data Science</option>
                    <option value="other">Other</option>
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

            {/* Thumbnail Upload - Full width */}
            <div className="lg:col-span-3 space-y-4 pt-4 border-t border-slate-200">
                <label className="text-xs font-medium text-slate-600 uppercase tracking-wider flex items-center gap-2">
                    <ImageIcon className="h-3.5 w-3.5" />
                    Thumbnail Image
                </label>

                <div className="flex items-start gap-6">
                    {/* Preview Area */}
                    <div className="shrink-0">
                        <div className={cn(
                            "w-40 h-28 rounded-lg border-2 border-dashed flex flex-col items-center justify-center gap-2 transition-colors overflow-hidden relative bg-white",
                            displayUrl
                                ? "border-sky-200 bg-sky-50/50"
                                : "border-slate-300 hover:border-slate-400"
                        )}>
                            {displayUrl ? (
                                <>
                                    <img
                                        src={displayUrl}
                                        alt="Thumbnail preview"
                                        className="w-full h-full object-cover rounded-lg"
                                        onError={(e) => {
                                            (e.target as HTMLImageElement).style.display = 'none'
                                        }}
                                    />
                                    {/* Remove button overlay */}
                                    <button
                                        type="button"
                                        onClick={handleRemoveFile}
                                        className="absolute top-1 right-1 p-1 bg-white/90 rounded-full shadow-sm text-slate-500 hover:text-red-500 transition-colors"
                                        title="Remove image"
                                    >
                                        <X className="h-3.5 w-3.5" />
                                    </button>
                                </>
                            ) : (
                                <>
                                    <ImageIcon className="h-10 w-10 text-slate-400" />
                                    <span className="text-xs text-slate-500">No image selected</span>
                                </>
                            )}
                        </div>
                    </div>

                    {/* Input Area */}
                    <div className="flex-1 space-y-4">
                        {/* File Upload Option */}
                        <div className="space-y-2">
                            <label className="text-xs font-medium text-slate-600 uppercase tracking-wider flex items-center gap-2">
                                <FileImage className="h-3.5 w-3.5" />
                                Upload from Computer
                            </label>

                            <div className="flex items-center gap-3">
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept="image/jpeg,image/png,image/webp"
                                    onChange={handleFileSelect}
                                    className="hidden"
                                    id="thumbnail-upload"
                                />
                                <label
                                    htmlFor="thumbnail-upload"
                                    className={cn(
                                        "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium cursor-pointer transition-colors",
                                        fileName
                                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                            : "bg-sky-50 text-sky-700 hover:bg-sky-100 border border-sky-200"
                                    )}
                                >
                                    <Upload className="h-4 w-4" />
                                    {fileName ? "Change Image" : "Choose Image"}
                                </label>

                                {fileName && (
                                    <div className="flex items-center gap-2 text-sm text-slate-600">
                                        <span className="truncate max-w-[200px]">{fileName}</span>
                                        <button
                                            type="button"
                                            onClick={handleRemoveFile}
                                            className="p-1 text-slate-400 hover:text-red-500 transition-colors"
                                        >
                                            <X className="h-4 w-4" />
                                        </button>
                                    </div>
                                )}
                            </div>

                            <p className="text-xs text-slate-500">
                                Supported: JPG, PNG, WebP. Max 5MB. Recommended: 800x600px.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}