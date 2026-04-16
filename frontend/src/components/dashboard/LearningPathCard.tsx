import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { cn } from "@/lib/utils"
import {
    BookOpen,
    Clock,
    ChevronRight,
    GraduationCap,
    Layers
} from "lucide-react"

export interface LearningPath {
    id: string
    title: string
    description: string
    category: string
    difficulty: "beginner" | "intermediate" | "advanced"
    totalLabs: number
    completedLabs: number
    estimatedHours: number
    thumbnail?: string
    isEnrolled?: boolean
}

export interface LearningPathCardProps {
    path: LearningPath
    onContinue?: (id: string) => void
    onEnroll?: (id: string) => void
    onViewDetails?: (id: string) => void
    className?: string
}

const difficultyConfig = {
    beginner: { label: "Beginner", color: "bg-emerald-500/10 text-emerald-600" },
    intermediate: { label: "Intermediate", color: "bg-amber-500/10 text-amber-600" },
    advanced: { label: "Advanced", color: "bg-red-500/10 text-red-600" },
}

export function LearningPathCard({
    path,
    onContinue,
    onEnroll,
    onViewDetails,
    className,
}: LearningPathCardProps) {
    const progress = Math.round((path.completedLabs / path.totalLabs) * 100)
    const difficulty = difficultyConfig[path.difficulty]

    return (
        <Card className={cn("overflow-hidden transition-all hover:shadow-md", className)}>
            <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                    <div className="flex-1 pr-2">
                        <div className="flex items-center gap-2 mb-2">
                            <Badge variant="outline" className={cn("text-xs", difficulty.color)}>
                                {difficulty.label}
                            </Badge>
                            <Badge variant="secondary" className="text-xs">
                                {path.category}
                            </Badge>
                        </div>
                        <CardTitle className="line-clamp-1 text-base">{path.title}</CardTitle>
                        <CardDescription className="line-clamp-2 mt-1">
                            {path.description}
                        </CardDescription>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="pb-3">
                <div className="flex items-center gap-4 text-xs text-muted-foreground mb-3">
                    <div className="flex items-center gap-1">
                        <Layers className="h-3 w-3" />
                        {path.totalLabs} labs
                    </div>
                    <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {path.estimatedHours}h estimated
                    </div>
                </div>

                {path.isEnrolled ? (
                    <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">Progress</span>
                            <span className="font-medium">{progress}%</span>
                        </div>
                        <Progress value={progress} className="h-2" />
                        <p className="text-xs text-muted-foreground">
                            {path.completedLabs} of {path.totalLabs} labs completed
                        </p>
                    </div>
                ) : null}
            </CardContent>
            <div className="p-6 pt-0">
                {path.isEnrolled ? (
                    <Button
                        className="w-full"
                        onClick={() => onContinue?.(path.id)}
                    >
                        <GraduationCap className="mr-2 h-4 w-4" />
                        Continue Learning
                        <ChevronRight className="ml-2 h-4 w-4" />
                    </Button>
                ) : (
                    <div className="flex gap-2">
                        <Button
                            variant="outline"
                            className="flex-1"
                            onClick={() => onViewDetails?.(path.id)}
                        >
                            <BookOpen className="mr-2 h-4 w-4" />
                            Details
                        </Button>
                        <Button
                            className="flex-1"
                            onClick={() => onEnroll?.(path.id)}
                        >
                            Enroll Now
                        </Button>
                    </div>
                )}
            </div>
        </Card>
    )
}