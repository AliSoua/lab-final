// src/components/LabInstance/Trainee/InstanceRun/LabGuidePanel/StepContent.tsx

import type { LabGuideStep, StepExecutionState } from "@/types/LabGuide"
import { TheorySection } from "./sections/TheorySection"
import { TasksSection } from "./sections/TasksSection"
import { CommandsSection } from "./sections/CommandsSection"
import { HintsSection } from "./sections/HintsSection"
import { ValidationsSection } from "./sections/ValidationsSection"
import { QuizSection } from "./sections/QuizSection"

interface StepContentProps {
    step: LabGuideStep
    stepState?: StepExecutionState
    onRunCommand?: (stepId: string, commandIndex: number) => void
}

export function StepContent({ step, stepState, onRunCommand }: StepContentProps) {
    return (
        <div className="space-y-5">
            <div>
                <h3 className="text-[16px] font-semibold text-[#3a3a3a]">{step.title}</h3>
                {step.description && (
                    <p className="mt-1 text-[13px] text-[#727373] leading-relaxed">
                        {step.description}
                    </p>
                )}
            </div>

            <TheorySection content={step.theory_content} />

            <TasksSection
                tasks={step.tasks}
                completedIndices={stepState?.tasks_completed ?? []}
            />

            <CommandsSection
                stepId={step.id}
                commands={step.commands}
                onRunCommand={onRunCommand}
                commandResults={stepState?.command_results ?? []}
            />

            <HintsSection
                hints={step.hints}
                revealedIndices={stepState?.hints_revealed ?? []}
            />

            <ValidationsSection
                validations={step.validations}
                validationResults={stepState?.validation_results ?? []}
            />

            <QuizSection quiz={step.quiz} />
        </div>
    )
}