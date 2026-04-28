// src/components/LabInstance/Trainee/InstanceDetail/InstanceNotFound.tsx
import { useNavigate } from "react-router-dom"
import { cn } from "@/lib/utils"

export function InstanceNotFound() {
    const navigate = useNavigate()

    return (
        <div className="min-h-screen bg-[#fafafa]">
            <div className="mx-auto max-w-7xl px-6 py-16 lg:px-14">
                <div className="flex flex-col items-center gap-4 rounded-xl border border-[#e8e8e8] bg-white py-16 text-center">
                    <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#1ca9b1]">
                        404
                    </p>
                    <h2 className="font-serif font-light text-2xl text-[#1a1a1a]">
                        Instance Not Found
                    </h2>
                    <p className="max-w-md text-[13px] text-[#727373]">
                        The lab instance you&apos;re looking for doesn&apos;t exist or you don&apos;t have permission to view it.
                    </p>
                    <button
                        onClick={() => navigate("/my-labs")}
                        className={cn(
                            "mt-2 flex h-10 items-center gap-2 rounded-lg bg-[#1ca9b1] px-6",
                            "text-[13px] font-medium text-white",
                            "hover:bg-[#17959c]",
                            "transition-colors duration-200"
                        )}
                    >
                        Back to My Labs
                    </button>
                </div>
            </div>
        </div>
    )
}