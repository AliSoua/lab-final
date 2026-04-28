// src/components/LabDefinition/detail/LabInfoCard.tsx
import { Clock, Users, Calendar } from "lucide-react"
import { cn } from "@/lib/utils"
import type { LabDetail } from "@/types/LabDefinition/LabDetail"

interface LabInfoCardProps {
    lab: LabDetail
}

export function LabInfoCard({ lab }: LabInfoCardProps) {
    return (
        <div className="rounded-xl border border-[#e8e8e8] bg-white p-6">
            <p className="mb-1 font-mono text-[10px] uppercase tracking-[0.2em] text-[#1ca9b1]">
                Details
            </p>
            <h3 className="mb-6 font-serif font-light text-lg tracking-tight text-[#1a1a1a]">
                Lab Information
            </h3>

            <div className="space-y-4">
                <InfoRow label="Difficulty" value={lab.difficulty} />
                <InfoRow label="Duration" value={`${lab.duration_minutes} min`} />
                <InfoRow label="Max Users" value={`${lab.max_concurrent_users} per session`} />
                <InfoRow label="Category" value={lab.category.replace("_", " ")} />
                {lab.track && <InfoRow label="Track" value={lab.track} />}
            </div>

            {lab.tags && lab.tags.length > 0 && (
                <div className="mt-6 border-t border-[#f0f0f0] pt-5">
                    <p className="mb-3 font-mono text-[10px] uppercase tracking-[0.15em] text-[#a0a0a0]">
                        Tags
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                        {lab.tags.map((tag) => (
                            <span
                                key={tag}
                                className="rounded-sm bg-[#f5f5f5] px-2 py-0.5 text-[10px] font-medium text-[#a0a0a0]"
                            >
                                {tag}
                            </span>
                        ))}
                    </div>
                </div>
            )}
        </div>
    )
}

function InfoRow({ label, value }: { label: string; value: string }) {
    return (
        <div className="flex items-center justify-between">
            <span className="text-[13px] text-[#a0a0a0]">{label}</span>
            <span className="text-[13px] font-medium text-[#1a1a1a]">{value}</span>
        </div>
    )
}