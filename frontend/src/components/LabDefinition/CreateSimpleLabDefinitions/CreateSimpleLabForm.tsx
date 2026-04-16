// src/components/LabDefinition/CreateSimpleLabDefinitions/CreateSimpleLabForm.tsx
import { cn } from "@/lib/utils"
import { useNavigate } from "react-router-dom"
import { FormProvider, useForm } from "react-hook-form"
import { BasicInfoSection } from "./BasicInfoSection"
import { DetailsSection } from "./DetailsSection"
import { ThumbnailSection } from "./ThumbnailSection"
import {
    type CreateSimpleLabDefinitionFormData,
    DEFAULT_CREATE_SIMPLE_LAB_FORM_DATA,
} from "@/types/LabDefinition/CreateSimpleLabDefinition"
import { useCreateSimpleLabs } from "@/hooks/LabDefinition/useCreateSimpleLabs"

interface CreateSimpleLabFormProps {
    formRef?: React.RefObject<HTMLFormElement | null>
    onCancel?: () => void
    onSuccess?: () => void
}

export function CreateSimpleLabForm({ formRef, onCancel, onSuccess }: CreateSimpleLabFormProps) {
    const navigate = useNavigate()
    const { createLab, isLoading, error, resetError } = useCreateSimpleLabs()

    const methods = useForm<CreateSimpleLabDefinitionFormData>({
        defaultValues: DEFAULT_CREATE_SIMPLE_LAB_FORM_DATA,
        mode: "onBlur",
    })

    const onSubmit = async (data: CreateSimpleLabDefinitionFormData) => {
        resetError()
        try {
            await createLab(data)
            onSuccess?.()
            navigate("/admin/lab-definitions")
        } catch {
            // Error handled by hook
        }
    }

    return (
        <FormProvider {...methods}>
            <form
                ref={formRef as React.Ref<HTMLFormElement>}
                onSubmit={methods.handleSubmit(onSubmit)}
                className="space-y-6 w-full"
            >
                {/* Error Display */}
                {error && (
                    <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                        <p className="text-sm text-red-700">{error}</p>
                    </div>
                )}

                {/* Basic Info Section - Full width */}
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden w-full">
                    <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50">
                        <h2 className="text-sm font-semibold text-slate-900 uppercase tracking-wider">
                            Basic Information
                        </h2>
                    </div>
                    <div className="p-6">
                        <BasicInfoSection />
                    </div>
                </div>

                {/* Thumbnail Section - Full width */}
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden w-full">
                    <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50">
                        <h2 className="text-sm font-semibold text-slate-900 uppercase tracking-wider">
                            Lab Thumbnail
                        </h2>
                    </div>
                    <div className="p-6">
                        <ThumbnailSection />
                    </div>
                </div>

                {/* Details Section - Full width */}
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden w-full">
                    <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50">
                        <h2 className="text-sm font-semibold text-slate-900 uppercase tracking-wider">
                            Lab Details
                        </h2>
                    </div>
                    <div className="p-6">
                        <DetailsSection />
                    </div>
                </div>
            </form>
        </FormProvider>
    )
}