// src/components/LabGuide/PreviewGuideLab/GuidePanel.tsx
import { useState } from "react"
import type { LabGuideStep } from "@/types/LabGuide"
import { StepHeader } from "./StepHeader"
import { StepContent } from "./StepContent"
import { StepNavigation } from "./StepNavigation"

interface GuidePanelProps {
    steps: LabGuideStep[]
    currentStepIndex: number
    onStepChange: (index: number) => void
    onRunCommand: (command: string, label?: string) => void
}

export function GuidePanel({ steps, currentStepIndex, onStepChange, onRunCommand }: GuidePanelProps) {
    const [revealedHints, setRevealedHints] = useState<Set<number>>(new Set())
    const [completedTasks, setCompletedTasks] = useState<Set<string>>(new Set())
    const [quizAnswer, setQuizAnswer] = useState("")
    const [quizSubmitted, setQuizSubmitted] = useState(false)
    const [quizCorrect, setQuizCorrect] = useState(false)

    const step = steps[currentStepIndex]
    const isFirst = currentStepIndex === 0
    const isLast = currentStepIndex === steps.length - 1
    const progress = steps.length > 0 ? ((currentStepIndex + 1) / steps.length) * 100 : 0

    const toggleHint = (level: number) => {
        setRevealedHints((prev) => {
            const next = new Set(prev)
            if (next.has(level)) next.delete(level)
            else next.add(level)
            return next
        })
    }

    const toggleTask = (taskIndex: number) => {
        const key = `${currentStepIndex}-${taskIndex}`
        setCompletedTasks((prev) => {
            const next = new Set(prev)
            if (next.has(key)) next.delete(key)
            else next.add(key)
            return next
        })
    }

    const resetQuiz = () => {
        setQuizAnswer("")
        setQuizSubmitted(false)
        setQuizCorrect(false)
    }

    const nextStep = () => {
        if (!isLast) {
            resetQuiz()
            onStepChange(currentStepIndex + 1)
        }
    }

    const prevStep = () => {
        if (!isFirst) {
            resetQuiz()
            onStepChange(currentStepIndex - 1)
        }
    }

    if (!step) {
        return (
            <div className="flex h-full items-center justify-center">
                <p className="text-sm text-[#c4c4c4]">No steps available</p>
            </div>
        )
    }

    return (
        <div className="flex flex-col h-full">
            <StepHeader
                step={step}
                currentStepIndex={currentStepIndex}
                totalSteps={steps.length}
                progress={progress}
            />

            <StepContent
                step={step}
                currentStepIndex={currentStepIndex}
                revealedHints={revealedHints}
                completedTasks={completedTasks}
                quizAnswer={quizAnswer}
                quizSubmitted={quizSubmitted}
                quizCorrect={quizCorrect}
                onToggleHint={toggleHint}
                onToggleTask={toggleTask}
                onQuizAnswerChange={setQuizAnswer}
                onQuizSubmit={(correct) => {
                    setQuizCorrect(correct)
                    setQuizSubmitted(true)
                }}
                onQuizReset={resetQuiz}
                onRunCommand={onRunCommand}
            />

            <StepNavigation
                currentStepIndex={currentStepIndex}
                totalSteps={steps.length}
                isFirst={isFirst}
                isLast={isLast}
                onStepChange={onStepChange}
                onNext={nextStep}
                onPrev={prevStep}
            />
        </div>
    )
}