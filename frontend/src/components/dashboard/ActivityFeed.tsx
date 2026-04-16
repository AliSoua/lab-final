import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { cn } from "@/lib/utils"
import {
    Play,
    Square,
    CheckCircle,
    AlertCircle,
    RotateCcw,
    GraduationCap,
    Trophy,
    Clock
} from "lucide-react"

export interface Activity {
    id: string
    type: "lab_started" | "lab_completed" | "lab_stopped" | "lab_error" | "achievement" | "course_enrolled"
    user?: {
        name: string
        initials: string
    }
    labName?: string
    courseName?: string
    achievementName?: string
    timestamp: string
    description: string
}

export interface ActivityFeedProps {
    activities: Activity[]
    className?: string
}

const activityConfig = {
    lab_started: {
        icon: Play,
        color: "bg-emerald-500",
        textColor: "text-emerald-600",
        label: "Lab Started",
    },
    lab_completed: {
        icon: CheckCircle,
        color: "bg-blue-500",
        textColor: "text-blue-600",
        label: "Lab Completed",
    },
    lab_stopped: {
        icon: Square,
        color: "bg-amber-500",
        textColor: "text-amber-600",
        label: "Lab Stopped",
    },
    lab_error: {
        icon: AlertCircle,
        color: "bg-red-500",
        textColor: "text-red-600",
        label: "Error",
    },
    achievement: {
        icon: Trophy,
        color: "bg-purple-500",
        textColor: "text-purple-600",
        label: "Achievement",
    },
    course_enrolled: {
        icon: GraduationCap,
        color: "bg-indigo-500",
        textColor: "text-indigo-600",
        label: "Enrolled",
    },
}

export function ActivityFeed({ activities, className }: ActivityFeedProps) {
    return (
        <Card className={cn("overflow-hidden", className)}>
            <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold">Recent Activity</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
                <ScrollArea className="h-[400px] px-6 pb-6">
                    <div className="space-y-4">
                        {activities.map((activity) => {
                            const config = activityConfig[activity.type]
                            const Icon = config.icon

                            return (
                                <div key={activity.id} className="flex items-start gap-3">
                                    <div className={cn("mt-0.5 flex h-8 w-8 items-center justify-center rounded-full", config.color)}>
                                        <Icon className="h-4 w-4 text-white" />
                                    </div>
                                    <div className="flex-1 space-y-1">
                                        <div className="flex items-center justify-between">
                                            <p className="text-sm font-medium">
                                                {activity.type === "achievement" && activity.achievementName}
                                                {activity.type === "course_enrolled" && activity.courseName}
                                                {(activity.type.startsWith("lab_")) && activity.labName}
                                            </p>
                                            <span className="text-xs text-muted-foreground">
                                                {activity.timestamp}
                                            </span>
                                        </div>
                                        <p className="text-xs text-muted-foreground">
                                            {activity.description}
                                        </p>
                                        {activity.user && (
                                            <div className="flex items-center gap-2 pt-1">
                                                <Avatar className="h-5 w-5">
                                                    <AvatarFallback className="text-[10px] bg-primary/10 text-primary">
                                                        {activity.user.initials}
                                                    </AvatarFallback>
                                                </Avatar>
                                                <span className="text-xs text-muted-foreground">
                                                    {activity.user.name}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </ScrollArea>
            </CardContent>
        </Card>
    )
}