// src/pages/LabInstance/Trainee/LabInstanceRunPage.tsx
import { useParams } from "react-router-dom"
import { LabRunPage } from "@/components/LabInstance/Trainee/InstanceRun/LabRunPage"

export default function LabInstanceRunPage() {
    const { instanceId } = useParams<{ instanceId: string }>()

    if (!instanceId) {
        return (
            <div className="flex h-full items-center justify-center">
                <p className="text-[#727373]">No instance ID provided</p>
            </div>
        )
    }

    return <LabRunPage instanceId={instanceId} />
}