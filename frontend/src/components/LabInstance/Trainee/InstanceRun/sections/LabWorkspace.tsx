// src/components/LabInstance/Trainee/InstanceRun/sections/LabWorkspace.tsx
import { ResizableLabWorkspace } from "@/components/LabInstance/Trainee/InstanceRun/ResizableLabWorkspace"
import { LabGuidePanel } from "@/components/LabInstance/Trainee/InstanceRun/LabGuidePanel/index"
import GuacamoleClient from "@/components/LabInstance/Trainee/InstanceRun/GuacamoleClient"
import type { ProvisioningStage } from "@/components/LabInstance/Trainee/InstanceRun/GuacamoleClient"
import type { GuideVersion } from "@/types/LabGuide"

interface LabWorkspaceProps {
    guide: GuideVersion | null
    guideError: string | null
    currentStepIndex: number
    connectionId: string | null
    connectionTitle: string
    isProvisioning: boolean
    provisioningMessage?: string
    provisioningStage?: ProvisioningStage
    onStepChange: (index: number) => void
    onRunCommand: (stepId: string, commandIndex: number) => void
}

export function LabWorkspace({
    guide,
    guideError,
    currentStepIndex,
    connectionId,
    connectionTitle,
    isProvisioning,
    provisioningMessage,
    provisioningStage,
    onStepChange,
    onRunCommand,
}: LabWorkspaceProps) {
    return (
        <div className="flex-1 overflow-hidden">
            <ResizableLabWorkspace
                defaultLeftWidth={42}
                leftPanel={
                    <LabGuidePanel
                        steps={guide?.steps ?? []}
                        stepStates={{}}
                        currentStepIndex={currentStepIndex}
                        onStepChange={onStepChange}
                        onRunCommand={onRunCommand}
                        isLoading={!guide && !guideError}
                        error={guideError}
                    />
                }
                rightPanel={
                    <GuacamoleClient
                        connectionId={connectionId}
                        title={connectionTitle}
                        isProvisioning={isProvisioning}
                        provisioningMessage={provisioningMessage}
                        provisioningStage={provisioningStage}
                        errorMessage={guideError}
                    />
                }
            />
        </div>
    )
}