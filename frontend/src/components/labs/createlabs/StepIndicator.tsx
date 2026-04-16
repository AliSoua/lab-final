// src/components/labs/createlabs/StepIndicator.tsx
import { Check } from 'lucide-react';
import { CreateLabStepConfig } from '@/types/labs';

interface StepIndicatorProps {
    steps: CreateLabStepConfig[];
    currentStep: number;
    completedSteps: string[];
}

export function StepIndicator({ steps, currentStep, completedSteps }: StepIndicatorProps) {
    return (
        <div className="flex items-center justify-between w-full mb-8">
            {steps.map((step, index) => {
                const isCompleted = completedSteps.includes(step.id);
                const isCurrent = index === currentStep;
                const isUpcoming = index > currentStep;

                return (
                    <div key={step.id} className="flex items-center flex-1 last:flex-none">
                        <div className="flex flex-col items-center">
                            {/* Step circle */}
                            <div
                                className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-colors ${isCompleted
                                    ? 'bg-emerald-500 border-emerald-500 text-white'
                                    : isCurrent
                                        ? 'bg-indigo-600 border-indigo-600 text-white'
                                        : 'bg-white border-slate-300 text-slate-400'
                                    }`}
                            >
                                {isCompleted ? (
                                    <Check className="w-5 h-5" />
                                ) : (
                                    <span className="text-sm font-semibold">{index + 1}</span>
                                )}
                            </div>

                            {/* Step label */}
                            <div className="mt-2 text-center">
                                <div
                                    className={`text-sm font-medium ${isCurrent ? 'text-indigo-700' : isCompleted ? 'text-slate-700' : 'text-slate-400'
                                        }`}
                                >
                                    {step.title}
                                </div>
                                <div className="text-xs text-slate-400 hidden sm:block max-w-[120px]">
                                    {step.description}
                                </div>
                            </div>
                        </div>

                        {/* Connector line */}
                        {index < steps.length - 1 && (
                            <div
                                className={`flex-1 h-0.5 mx-4 transition-colors ${isCompleted ? 'bg-emerald-500' : 'bg-slate-200'
                                    }`}
                            />
                        )}
                    </div>
                );
            })}
        </div>
    );
}