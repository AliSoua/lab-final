import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import {
    Plus,
    BookOpen,
    Terminal,
    Users,
    Settings,
    FileText,
    ArrowRight
} from "lucide-react"

interface QuickAction {
    label: string
    icon: React.ElementType
    description: string
    href?: string
    onClick?: () => void
    variant?: "default" | "secondary" | "outline"
}

export interface QuickActionsProps {
    userRole?: string
    className?: string
}

export function QuickActions({ userRole = "trainee", className }: QuickActionsProps) {
    const traineeActions: QuickAction[] = [
        {
            label: "Start New Lab",
            icon: Plus,
            description: "Launch a new training environment",
            variant: "default",
        },
        {
            label: "Browse Catalog",
            icon: BookOpen,
            description: "Explore available lab scenarios",
            variant: "outline",
        },
        {
            label: "View Progress",
            icon: FileText,
            description: "Check your learning statistics",
            variant: "outline",
        },
    ]

    const instructorActions: QuickAction[] = [
        ...traineeActions,
        {
            label: "Manage Users",
            icon: Users,
            description: "View and manage trainees",
            variant: "outline",
        },
        {
            label: "Lab Reports",
            icon: Terminal,
            description: "View completion analytics",
            variant: "outline",
        },
    ]

    const adminActions: QuickAction[] = [
        ...instructorActions,
        {
            label: "Platform Settings",
            icon: Settings,
            description: "Configure system parameters",
            variant: "secondary",
        },
    ]

    const actions = userRole === "admin"
        ? adminActions
        : userRole === "moderator"
            ? instructorActions
            : traineeActions

    return (
        <Card className={cn("overflow-hidden", className)}>
            <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="grid gap-3">
                    {actions.map((action, index) => {
                        const Icon = action.icon
                        return (
                            <Button
                                key={index}
                                variant={action.variant}
                                className="h-auto justify-start gap-3 p-3 text-left"
                                onClick={action.onClick}
                            >
                                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-primary/10">
                                    <Icon className="h-5 w-5 text-primary" />
                                </div>
                                <div className="flex-1">
                                    <p className="text-sm font-medium">{action.label}</p>
                                    <p className="text-xs text-muted-foreground">
                                        {action.description}
                                    </p>
                                </div>
                                <ArrowRight className="h-4 w-4 text-muted-foreground" />
                            </Button>
                        )
                    })}
                </div>
            </CardContent>
        </Card>
    )
}