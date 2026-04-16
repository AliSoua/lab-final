// src/pages/LabDefinition/CreateFullLabDefinitionsPage.tsx
import { CreateFullLabWizard } from "@/components/LabDefinition/CreateFullLabDefinitions"

export default function CreateFullLabDefinitionsPage() {
    return (
        // h-screen ensures the page takes exactly the viewport height
        // overflow-hidden prevents double scrollbars
        <div className="h-screen flex flex-col bg-[#fafafa] overflow-hidden">
            <CreateFullLabWizard />
        </div>
    )
}