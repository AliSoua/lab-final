// src/pages/LabDefinition/CreateSimpleLabDefinitionsPage.tsx
import { useRef } from "react"
import { useNavigate } from "react-router-dom"
import { cn } from "@/lib/utils"
import { CreateSimpleLabForm } from "@/components/LabDefinition/CreateSimpleLabDefinitions"
import { ArrowLeft, Save } from "lucide-react"

export default function CreateSimpleLabDefinitionsPage() {
    const navigate = useNavigate()
    const formRef = useRef<HTMLFormElement>(null)

    const handleCancel = () => {
        navigate("/admin/lab-definitions")
    }

    const handleSubmit = () => {
        formRef.current?.requestSubmit()
    }

    return (
        <div className="flex flex-col h-screen bg-slate-50/50">
            {/* Header Section */}
            <div className="bg-white border-b border-slate-200 px-6 py-5 shrink-0 z-10">
                <div className="px-4">
                    <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-semibold uppercase tracking-wider text-sky-600">
                            Lab Management
                        </span>
                        <span className="text-slate-400">/</span>
                        <span className="text-xs text-slate-500">Create</span>
                    </div>
                    <h1 className="text-xl font-semibold text-slate-900">
                        Create Lab Definition
                    </h1>
                    <p className="text-sm text-slate-500 mt-1">
                        Define a new lab environment with basic information and learning objectives
                    </p>
                </div>
            </div>

            {/* Scrollable Form Content - Added scroll-padding-bottom for button visibility */}
            <div
                className="flex-1 overflow-y-auto px-6 py-6 min-h-0"
                style={{ scrollPaddingBottom: '120px' }} // Ensures buttons are visible when scrolled to bottom
            >
                <div className="px-4 w-full">
                    <CreateSimpleLabForm
                        formRef={formRef}
                        onCancel={handleCancel}
                    />

                    {/* Action Bar - Now with proper spacing below */}
                    <div className="mt-8 pt-6 border-t border-slate-200">
                        <div className="flex items-center justify-between">
                            <button
                                type="button"
                                onClick={handleCancel}
                                className={cn(
                                    "flex items-center gap-2 rounded-lg px-4 py-2",
                                    "text-sm font-medium text-slate-600",
                                    "hover:text-slate-900 hover:bg-slate-100",
                                    "transition-colors duration-200"
                                )}
                            >
                                <ArrowLeft className="h-4 w-4" />
                                Cancel
                            </button>

                            <button
                                type="button"
                                onClick={handleSubmit}
                                className={cn(
                                    "flex items-center gap-2 rounded-lg px-6 py-2",
                                    "bg-[#1ca9b1] text-white text-sm font-medium",
                                    "hover:bg-[#17959c] hover:shadow-md",
                                    "transition-all duration-200",
                                    "disabled:opacity-60 disabled:cursor-not-allowed"
                                )}
                            >
                                <Save className="h-4 w-4" />
                                Create Lab Definition
                            </button>
                        </div>
                    </div>

                    {/* Spacer element - ensures content can scroll past the buttons */}
                    <div className="h-24" />
                </div>
            </div>
        </div>
    )
}