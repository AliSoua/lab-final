// src/components/labs/createlabs/CreateLabWizard.tsx
import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { ChevronLeft, ChevronRight, Check, BookOpen } from 'lucide-react';
import { StepIndicator } from './StepIndicator';
import { BasicInfoStep } from './BasicInfoStep';
import { VMConfigStep } from './VMConfigStep';
import { GuideContentStep } from './GuideContentStep';
import { AssessmentStep } from './AssessmentStep';
import { ReviewStep } from './ReviewStep';
import {
    CreateLabFormData,
    DEFAULT_CREATE_LAB_FORM_DATA,
    DEFAULT_CREATE_LAB_ASSESSMENT,
    CREATE_LAB_STEPS,
    CreateLabValidationErrors,
} from '@/types/labs';

interface CreateLabWizardProps {
    onSubmit: (data: CreateLabFormData) => void;  // Raw form data
    isSubmitting: boolean;
}

// Helper to ensure all array fields are present
const ensureArrayFields = (data: Partial<CreateLabFormData>): CreateLabFormData => ({
    ...DEFAULT_CREATE_LAB_FORM_DATA,
    ...data,
    basic_info: {
        ...DEFAULT_CREATE_LAB_FORM_DATA.basic_info,
        ...data.basic_info,
    },
    vm_templates: Array.isArray(data.vm_templates) ? data.vm_templates : [],
    guide: {
        ...DEFAULT_CREATE_LAB_FORM_DATA.guide,
        ...data.guide,
        prerequisites: Array.isArray(data.guide?.prerequisites) ? data.guide.prerequisites : [],
        steps: Array.isArray(data.guide?.steps) ? data.guide.steps : [],
        external_links: Array.isArray(data.guide?.external_links) ? data.guide.external_links : [],
        downloadables: Array.isArray(data.guide?.downloadables) ? data.guide.downloadables : [],
    },
    assessment: {
        ...DEFAULT_CREATE_LAB_ASSESSMENT,
        ...data.assessment,
        required_labs: Array.isArray(data.assessment?.required_labs) ? data.assessment.required_labs : [],
        required_roles: Array.isArray(data.assessment?.required_roles) ? data.assessment.required_roles : [],
    },
});

export function CreateLabWizard({ onSubmit, isSubmitting }: CreateLabWizardProps) {
    const [currentStep, setCurrentStep] = useState(0);
    const [completedSteps, setCompletedSteps] = useState<string[]>([]);
    const [errors, setErrors] = useState<CreateLabValidationErrors>({});

    const [formData, setFormData] = useState<CreateLabFormData>(() =>
        ensureArrayFields(DEFAULT_CREATE_LAB_FORM_DATA)
    );

    const steps = CREATE_LAB_STEPS;

    const updateField = useCallback(<K extends keyof CreateLabFormData>(
        field: K,
        value: CreateLabFormData[K]
    ) => {
        setFormData(prev => {
            const arrayFields: (keyof CreateLabFormData)[] = ['vm_templates'];
            const safeValue = arrayFields.includes(field) && !Array.isArray(value)
                ? [] as CreateLabFormData[K]
                : value;

            return { ...prev, [field]: safeValue };
        });

        if (errors[field as string]) {
            setErrors(prev => {
                const newErrors = { ...prev };
                delete newErrors[field as string];
                return newErrors;
            });
        }
    }, [errors]);

    const updateGuideField = useCallback(<K extends keyof CreateLabFormData['guide']>(
        field: K,
        value: CreateLabFormData['guide'][K]
    ) => {
        setFormData(prev => ({
            ...prev,
            guide: {
                ...prev.guide,
                [field]: value,
            },
        }));
    }, []);

    const updateAssessmentField = useCallback(<K extends keyof CreateLabFormData['assessment']>(
        field: K,
        value: CreateLabFormData['assessment'][K]
    ) => {
        setFormData(prev => ({
            ...prev,
            assessment: {
                ...prev.assessment,
                [field]: value,
            },
        }));
    }, []);

    const validateStep = (stepIndex: number): boolean => {
        const newErrors: CreateLabValidationErrors = {};
        const stepId = steps[stepIndex].id;
        const safeData = ensureArrayFields(formData);

        switch (stepId) {
            case 'basic_info':
                if (!safeData.basic_info.name?.trim()) {
                    newErrors.basic_info = { ...newErrors.basic_info, name: 'Lab name is required' };
                }
                if (!safeData.basic_info.slug?.trim()) {
                    newErrors.basic_info = { ...newErrors.basic_info, slug: 'Slug is required' };
                } else if (!/^[a-z0-9-]+$/.test(safeData.basic_info.slug)) {
                    newErrors.basic_info = { ...newErrors.basic_info, slug: 'Slug must be lowercase alphanumeric with hyphens only' };
                }
                if (!safeData.basic_info.description?.trim()) {
                    newErrors.basic_info = { ...newErrors.basic_info, description: 'Description is required' };
                }
                if (safeData.basic_info.duration_minutes < 1) {
                    newErrors.basic_info = { ...newErrors.basic_info, duration_minutes: 'Duration must be at least 1 minute' };
                }
                if (safeData.basic_info.max_concurrent_users < 1) {
                    newErrors.basic_info = { ...newErrors.basic_info, max_concurrent_users: 'Must allow at least 1 concurrent user' };
                }
                break;

            case 'vm_configuration':
                if (safeData.vm_templates.length === 0) {
                    newErrors.vm_templates = [{ id: 'general', name: 'At least one VM template is required' }];
                } else {
                    const vmErrors = safeData.vm_templates.map((vm, index) => {
                        const vmError: Record<string, string> = {};
                        if (!vm.name?.trim()) vmError.name = `VM ${index + 1}: Name is required`;
                        if (!vm.id?.trim()) vmError.id = `VM ${index + 1}: Proxmox VM ID is required`;
                        if (vm.cpu_cores < 1) vmError.cpu_cores = `VM ${index + 1}: CPU cores must be at least 1`;
                        if (vm.memory_mb < 512) vmError.memory_mb = `VM ${index + 1}: Memory must be at least 512 MB`;
                        return Object.keys(vmError).length > 0 ? vmError : null;
                    }).filter(Boolean);

                    if (vmErrors.length > 0) {
                        newErrors.vm_templates = vmErrors as any;
                    }
                }
                break;

            case 'guide_content':
                if (!safeData.guide.introduction?.trim()) {
                    newErrors.guide = { ...newErrors.guide, introduction: 'Lab introduction is required' };
                }
                if (safeData.guide.steps.length === 0) {
                    newErrors.guide = { ...newErrors.guide, steps: [{ id: 'general', title: 'At least one lab step is required', content_blocks: [] }] };
                } else {
                    const stepErrors = safeData.guide.steps.map((step, index) => {
                        const errors: any = {};
                        if (!step.title?.trim()) errors.title = `Step ${index + 1}: Title is required`;
                        if (step.content_blocks.length === 0) {
                            errors.content_blocks = [{ id: 'general', type: 'At least one content block is required' }];
                        }
                        return Object.keys(errors).length > 0 ? errors : null;
                    }).filter(Boolean);

                    if (stepErrors.length > 0) {
                        newErrors.guide = { ...newErrors.guide, steps: stepErrors as any };
                    }
                }
                break;

            case 'assessment':
                if (safeData.assessment.is_graded) {
                    if (!safeData.assessment.passing_score || safeData.assessment.passing_score < 0 || safeData.assessment.passing_score > 100) {
                        newErrors.assessment = { ...newErrors.assessment, passing_score: 'Passing score must be between 0 and 100' };
                    }
                }
                break;
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleNext = () => {
        if (validateStep(currentStep)) {
            const stepId = steps[currentStep].id;
            setCompletedSteps(prev => prev.includes(stepId) ? prev : [...prev, stepId]);
            setCurrentStep(prev => Math.min(prev + 1, steps.length - 1));
        }
    };

    const handleBack = () => {
        setCurrentStep(prev => Math.max(prev - 1, 0));
    };

    const handleSubmit = () => {
        if (validateStep(currentStep)) {
            onSubmit(formData);  // Pass raw formData
        }
    };

    const renderStep = () => {
        const stepId = steps[currentStep].id;
        const safeData = ensureArrayFields(formData);

        switch (stepId) {
            case 'basic_info':
                return (
                    <BasicInfoStep
                        data={safeData.basic_info}
                        onChange={(field, value) => updateField('basic_info', { ...safeData.basic_info, [field]: value })}
                        errors={errors.basic_info}
                    />
                );
            case 'vm_configuration':
                return (
                    <VMConfigStep
                        vms={safeData.vm_templates}
                        onChange={(vms) => updateField('vm_templates', vms)}
                        errors={errors.vm_templates}
                    />
                );
            case 'guide_content':
                return (
                    <GuideContentStep
                        guide={safeData.guide}
                        onChange={updateGuideField}
                        errors={errors.guide}
                    />
                );
            case 'assessment':
                return (
                    <AssessmentStep
                        data={safeData.assessment}
                        onChange={updateAssessmentField}
                        errors={errors.assessment}
                    />
                );
            case 'review':
                return <ReviewStep data={safeData} />;
            default:
                return null;
        }
    };

    const isFirstStep = currentStep === 0;
    const isLastStep = currentStep === steps.length - 1;

    return (
        <Card className="border-slate-200 shadow-sm">
            <CardHeader className="border-b border-slate-100">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center">
                        <BookOpen className="w-4 h-4 text-indigo-600" />
                    </div>
                    <CardTitle className="text-lg font-semibold text-slate-800">
                        Create New Lab
                    </CardTitle>
                </div>
            </CardHeader>

            <CardContent className="p-6">
                <StepIndicator steps={steps} currentStep={currentStep} completedSteps={completedSteps} />
                <div className="mt-6 min-h-[500px]">{renderStep()}</div>
            </CardContent>

            <CardFooter className="border-t border-slate-100 p-6 flex justify-between">
                <Button
                    variant="outline"
                    onClick={handleBack}
                    disabled={isFirstStep || isSubmitting}
                    className="border-slate-200 hover:bg-slate-50"
                >
                    <ChevronLeft className="w-4 h-4 mr-2" />
                    Back
                </Button>

                {isLastStep ? (
                    <Button
                        onClick={handleSubmit}
                        disabled={isSubmitting}
                        className="bg-indigo-600 hover:bg-indigo-700"
                    >
                        {isSubmitting ? 'Creating...' : (
                            <>
                                <Check className="w-4 h-4 mr-2" />
                                Create Lab
                            </>
                        )}
                    </Button>
                ) : (
                    <Button
                        onClick={handleNext}
                        className="bg-indigo-600 hover:bg-indigo-700"
                    >
                        Next
                        <ChevronRight className="w-4 h-4 ml-2" />
                    </Button>
                )}
            </CardFooter>
        </Card>
    );
}