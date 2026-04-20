// src/pages/LabDefinition/CreateFullLabDefinitionsPage.tsx
import { CreateFullLabWizard } from "@/components/LabDefinition/CreateFullLabDefinitions"

export default function CreateFullLabDefinitionsPage() {
    return (
        <div className="flex flex-col bg-[#f9f9f9] min-h-[calc(100vh-4rem)]">
            <CreateFullLabWizard />
        </div>
    )
}