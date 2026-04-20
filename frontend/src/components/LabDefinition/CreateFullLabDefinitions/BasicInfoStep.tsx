// src/components/LabDefinition/CreateFullLabDefinitions/BasicInfoStep.tsx
import { cn } from "@/lib/utils"
import { useEffect, useRef, useState } from "react"
import { useFormContext } from "react-hook-form"
import type { CreateFullLabDefinitionFormData } from "@/types/LabDefinition/CreateFullLabDefinition"
import { Clock, Type, AlignLeft, ImageIcon, Upload, X, FileImage, Hash, Users, Tag } from "lucide-react"

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

        if (file.size > 5 * 1024 * 1024) {
            alert("File too large. Maximum size is 5MB.")
            return
        }

        if (!file.type.startsWith("image/")) {
            alert("Please select an image file.")
            return
        }

        if (previewUrl) {
            URL.revokeObjectURL(previewUrl)
        }

        const objectUrl = URL.createObjectURL(file)
        setPreviewUrl(objectUrl)
        setFileName(file.name)

        setValue("thumbnail_file", file, { shouldDirty: true, shouldValidate: true })
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
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between pb-2 border-b border-[#e8e8e8]">
                <div className="flex items-center gap-2">
                    <Type className="h-4 w-4 text-[#1ca9b1]" />
                    <h2 className="text-[14px] font-semibold text-[#3a3a3a] uppercase tracking-wider">
                        Basic Information
                    </h2>
                </div>
            </div>

            {/* Lab Name */}
            <div className="space-y-2">
                <label className="text-[11px] font-medium text-[#727373] uppercase tracking-wider">
                    Lab Name
                </label>
                <div className="relative">
                    <Type className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#c4c4c4]" />
                    <input
                        type="text"
                        {...register("name", { required: "Lab name is required" })}
                        placeholder="e.g., Advanced NGINX Web Server Lab"
                        className={cn(
                            "w-full rounded-lg border bg-white pl-10 pr-4 py-2.5",
                            "text-[13px] text-[#3a3a3a] placeholder:text-[#c4c4c4]",
                            "outline-none focus:border-[#1ca9b1] focus:ring-1 focus:ring-[#1ca9b1]/20 transition-all",
                            errors.name
                                ? "border-red-400 focus:border-red-500 focus:ring-red-500/20"
                                : "border-[#d4d4d4]"
                        )}
                    />
                </div>
                {errors.name && (
                    <p className="text-[12px] text-red-500 flex items-center gap-1">
                        <X className="h-3 w-3" />
                        {errors.name.message}
                    </p>
                )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Slug */}
                <div className="space-y-2">
                    <label className="text-[11px] font-medium text-[#727373] uppercase tracking-wider">
                        URL Slug <span className="text-[#c4c4c4] font-normal">(auto-generated)</span>
                    </label>
                    <div className="relative">
                        <Hash className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#c4c4c4]" />
                        <input
                            type="text"
                            {...register("slug", { required: "Slug is required" })}
                            readOnly
                            className={cn(
                                "w-full rounded-lg border border-[#d4d4d4] bg-[#f5f5f5] pl-10 pr-4 py-2.5",
                                "text-[13px] text-[#727373]",
                                "cursor-not-allowed outline-none"
                            )}
                        />
                    </div>
                    <p className="text-[11px] text-[#c4c4c4]">
                        Automatically generated from the lab name
                    </p>
                </div>

                {/* Duration */}
                <div className="space-y-2">
                    <label className="text-[11px] font-medium text-[#727373] uppercase tracking-wider">
                        Duration (minutes)
                    </label>
                    <div className="relative">
                        <Clock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#c4c4c4]" />
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
                                "w-full rounded-lg border bg-white pl-10 pr-4 py-2.5",
                                "text-[13px] text-[#3a3a3a]",
                                "outline-none focus:border-[#1ca9b1] focus:ring-1 focus:ring-[#1ca9b1]/20 transition-all",
                                errors.duration_minutes
                                    ? "border-red-400 focus:border-red-500 focus:ring-red-500/20"
                                    : "border-[#d4d4d4]"
                            )}
                        />
                    </div>
                    {errors.duration_minutes && (
                        <p className="text-[12px] text-red-500 flex items-center gap-1">
                            <X className="h-3 w-3" />
                            {errors.duration_minutes.message}
                        </p>
                    )}
                </div>

                {/* Max Concurrent Users */}
                <div className="space-y-2">
                    <label className="text-[11px] font-medium text-[#727373] uppercase tracking-wider">
                        Max Concurrent Users
                    </label>
                    <div className="relative">
                        <Users className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#c4c4c4]" />
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
                                "w-full rounded-lg border bg-white pl-10 pr-4 py-2.5",
                                "text-[13px] text-[#3a3a3a]",
                                "outline-none focus:border-[#1ca9b1] focus:ring-1 focus:ring-[#1ca9b1]/20 transition-all",
                                errors.max_concurrent_users
                                    ? "border-red-400 focus:border-red-500 focus:ring-red-500/20"
                                    : "border-[#d4d4d4]"
                            )}
                        />
                    </div>
                    {errors.max_concurrent_users && (
                        <p className="text-[12px] text-red-500 flex items-center gap-1">
                            <X className="h-3 w-3" />
                            {errors.max_concurrent_users.message}
                        </p>
                    )}
                </div>
            </div>

            {/* Short Description */}
            <div className="space-y-2">
                <label className="text-[11px] font-medium text-[#727373] uppercase tracking-wider">
                    Short Description
                </label>
                <div className="relative">
                    <AlignLeft className="absolute left-3 top-3 h-4 w-4 text-[#c4c4c4]" />
                    <input
                        type="text"
                        {...register("short_description", {
                            required: "Short description is required",
                            maxLength: { value: 120, message: "Max 120 characters" },
                        })}
                        placeholder="Brief summary displayed in catalog (max 120 chars)"
                        className={cn(
                            "w-full rounded-lg border bg-white pl-10 pr-4 py-2.5",
                            "text-[13px] text-[#3a3a3a] placeholder:text-[#c4c4c4]",
                            "outline-none focus:border-[#1ca9b1] focus:ring-1 focus:ring-[#1ca9b1]/20 transition-all",
                            errors.short_description
                                ? "border-red-400 focus:border-red-500 focus:ring-red-500/20"
                                : "border-[#d4d4c4]"
                        )}
                    />
                </div>
                <div className="flex justify-between items-center">
                    {errors.short_description ? (
                        <p className="text-[12px] text-red-500 flex items-center gap-1">
                            <X className="h-3 w-3" />
                            {errors.short_description.message}
                        </p>
                    ) : (
                        <span />
                    )}
                    <span className="text-[11px] text-[#c4c4c4]">
                        {watch("short_description")?.length || 0}/120
                    </span>
                </div>
            </div>

            {/* Full Description */}
            <div className="space-y-2">
                <label className="text-[11px] font-medium text-[#727373] uppercase tracking-wider">
                    Full Description
                </label>
                <textarea
                    {...register("description", { required: "Description is required" })}
                    rows={4}
                    placeholder="Detailed description of the lab objectives and outcomes..."
                    className={cn(
                        "w-full rounded-lg border bg-white px-4 py-3 resize-none",
                        "text-[13px] text-[#3a3a3a] placeholder:text-[#c4c4c4]",
                        "outline-none focus:border-[#1ca9b1] focus:ring-1 focus:ring-[#1ca9b1]/20 transition-all",
                        errors.description
                            ? "border-red-400 focus:border-red-500 focus:ring-red-500/20"
                            : "border-[#d4d4d4]"
                    )}
                />
                {errors.description && (
                    <p className="text-[12px] text-red-500 flex items-center gap-1">
                        <X className="h-3 w-3" />
                        {errors.description.message}
                    </p>
                )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Category */}
                <div className="space-y-2">
                    <label className="text-[11px] font-medium text-[#727373] uppercase tracking-wider">
                        Category
                    </label>
                    <div className="relative">
                        <Tag className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#c4c4c4]" />
                        <select
                            {...register("category", { required: "Category is required" })}
                            className={cn(
                                "w-full rounded-lg border bg-white pl-10 pr-4 py-2.5",
                                "text-[13px] text-[#3a3a3a]",
                                "outline-none focus:border-[#1ca9b1] focus:ring-1 focus:ring-[#1ca9b1]/20 transition-all cursor-pointer appearance-none",
                                errors.category
                                    ? "border-red-400 focus:border-red-500 focus:ring-red-500/20"
                                    : "border-[#d4d4d4]"
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
                    </div>
                    {errors.category && (
                        <p className="text-[12px] text-red-500 flex items-center gap-1">
                            <X className="h-3 w-3" />
                            {errors.category.message}
                        </p>
                    )}
                </div>

                {/* Difficulty */}
                <div className="space-y-2">
                    <label className="text-[11px] font-medium text-[#727373] uppercase tracking-wider">
                        Difficulty
                    </label>
                    <select
                        {...register("difficulty", { required: "Difficulty is required" })}
                        className={cn(
                            "w-full rounded-lg border bg-white px-4 py-2.5",
                            "text-[13px] text-[#3a3a3a]",
                            "outline-none focus:border-[#1ca9b1] focus:ring-1 focus:ring-[#1ca9b1]/20 transition-all cursor-pointer appearance-none",
                            errors.difficulty
                                ? "border-red-400 focus:border-red-500 focus:ring-red-500/20"
                                : "border-[#d4d4d4]"
                        )}
                    >
                        <option value="" disabled>Select difficulty...</option>
                        <option value="beginner">Beginner</option>
                        <option value="intermediate">Intermediate</option>
                        <option value="advanced">Advanced</option>
                    </select>
                    {errors.difficulty && (
                        <p className="text-[12px] text-red-500 flex items-center gap-1">
                            <X className="h-3 w-3" />
                            {errors.difficulty.message}
                        </p>
                    )}
                </div>

                {/* Track */}
                <div className="space-y-2">
                    <label className="text-[11px] font-medium text-[#727373] uppercase tracking-wider">
                        Track <span className="text-[#c4c4c4] font-normal">(optional)</span>
                    </label>
                    <input
                        type="text"
                        {...register("track")}
                        placeholder="e.g., DevOps Fundamentals"
                        className={cn(
                            "w-full rounded-lg border border-[#d4d4d4] bg-white px-4 py-2.5",
                            "text-[13px] text-[#3a3a3a] placeholder:text-[#c4c4c4]",
                            "outline-none focus:border-[#1ca9b1] focus:ring-1 focus:ring-[#1ca9b1]/20 transition-all"
                        )}
                    />
                </div>
            </div>

            {/* Thumbnail Upload */}
            <div className="space-y-4 pt-4 border-t border-[#e8e8e8]">
                <div className="flex items-center gap-2">
                    <ImageIcon className="h-4 w-4 text-[#1ca9b1]" />
                    <h2 className="text-[14px] font-semibold text-[#3a3a3a] uppercase tracking-wider">
                        Thumbnail Image
                    </h2>
                </div>

                <div className="bg-white rounded-xl border border-[#e8e8e8] p-6">
                    <div className="flex items-start gap-6">
                        {/* Preview Area */}
                        <div className="shrink-0">
                            <div className={cn(
                                "w-40 h-28 rounded-xl border-2 border-dashed flex flex-col items-center justify-center gap-2 transition-colors overflow-hidden relative bg-[#f9f9f9]",
                                displayUrl
                                    ? "border-[#1ca9b1]/30"
                                    : "border-[#d4d4d4] hover:border-[#1ca9b1]/50"
                            )}>
                                {displayUrl ? (
                                    <>
                                        <img
                                            src={displayUrl}
                                            alt="Thumbnail preview"
                                            className="w-full h-full object-cover rounded-xl"
                                            onError={(e) => {
                                                (e.target as HTMLImageElement).style.display = 'none'
                                            }}
                                        />
                                        <button
                                            type="button"
                                            onClick={handleRemoveFile}
                                            className="absolute top-2 right-2 p-1.5 bg-white/90 rounded-full shadow-sm text-[#727373] hover:text-red-500 transition-colors"
                                            title="Remove image"
                                        >
                                            <X className="h-3.5 w-3.5" />
                                        </button>
                                    </>
                                ) : (
                                    <>
                                        <ImageIcon className="h-10 w-10 text-[#c4c4c4]" />
                                        <span className="text-[11px] text-[#c4c4c4]">No image selected</span>
                                    </>
                                )}
                            </div>
                        </div>

                        {/* Input Area */}
                        <div className="flex-1 space-y-4">
                            <div className="space-y-2">
                                <label className="text-[11px] font-medium text-[#727373] uppercase tracking-wider flex items-center gap-2">
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
                                            "flex items-center gap-2 px-4 py-2 rounded-lg text-[13px] font-medium cursor-pointer transition-all",
                                            fileName
                                                ? "bg-[#e6f7f8] text-[#1ca9b1] border border-[#1ca9b1]/20"
                                                : "bg-[#f5f5f5] text-[#3a3a3a] hover:bg-[#e6f7f8] hover:text-[#1ca9b1] border border-[#e8e8e8]"
                                        )}
                                    >
                                        <Upload className="h-4 w-4" />
                                        {fileName ? "Change Image" : "Choose Image"}
                                    </label>

                                    {fileName && (
                                        <div className="flex items-center gap-2 text-[13px] text-[#3a3a3a]">
                                            <span className="truncate max-w-[200px]">{fileName}</span>
                                            <button
                                                type="button"
                                                onClick={handleRemoveFile}
                                                className="p-1 text-[#c4c4c4] hover:text-red-500 transition-colors"
                                            >
                                                <X className="h-4 w-4" />
                                            </button>
                                        </div>
                                    )}
                                </div>

                                <p className="text-[11px] text-[#727373]">
                                    Supported: JPG, PNG, WebP. Max 5MB. Recommended: 800x600px.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}