// src/components/LabDefinition/CreateSimpleLabDefinitions/ThumbnailSection.tsx
import { cn } from "@/lib/utils"
import { useFormContext } from "react-hook-form"
import type { CreateSimpleLabDefinitionFormData } from "@/types/LabDefinition/CreateSimpleLabDefinition"
import { ImageIcon, Link2, Upload, X, FileImage } from "lucide-react"
import { useRef, useState, useEffect } from "react"

export function ThumbnailSection() {
    const {
        register,
        watch,
        setValue,
        formState: { errors },
    } = useFormContext<CreateSimpleLabDefinitionFormData>()

    const fileInputRef = useRef<HTMLInputElement>(null)
    const [previewUrl, setPreviewUrl] = useState<string | null>(null)
    const [fileName, setFileName] = useState<string | null>(null)

    const thumbnailUrl = watch("thumbnail_url")
    const thumbnailFile = watch("thumbnail_file")

    // Show preview from either URL or uploaded file
    const displayUrl = previewUrl || thumbnailUrl

    // Cleanup object URL on unmount
    useEffect(() => {
        return () => {
            if (previewUrl) {
                URL.revokeObjectURL(previewUrl)
            }
        }
    }, [previewUrl])

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

    const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const url = e.target.value
        setValue("thumbnail_url", url, { shouldDirty: true, shouldValidate: true })

        // Clear file if URL is entered
        if (url) {
            if (previewUrl) {
                URL.revokeObjectURL(previewUrl)
            }
            setPreviewUrl(null)
            setFileName(null)
            setValue("thumbnail_file", null, { shouldDirty: true })
            if (fileInputRef.current) {
                fileInputRef.current.value = ""
            }
        }
    }

    return (
        <div className="space-y-4">
            <div className="flex items-start gap-6">
                {/* Preview Area */}
                <div className="shrink-0">
                    <div className={cn(
                        "w-40 h-28 rounded-lg border-2 border-dashed flex flex-col items-center justify-center gap-2 transition-colors overflow-hidden relative",
                        displayUrl
                            ? "border-sky-200 bg-sky-50/50"
                            : "border-slate-300 bg-slate-50 hover:border-slate-400"
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

            {errors.thumbnail_url && (
                <p className="text-xs text-red-500">{errors.thumbnail_url.message}</p>
            )}
        </div>
    )
}