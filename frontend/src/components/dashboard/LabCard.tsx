import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { cn } from "@/lib/utils"
import {
    Play,
    Square,
    RotateCcw,
    Terminal,
    Clock,
    Server,
    MoreVertical
} from "lucide-react"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

export interface Lab {
    id: string
    name: string
    description: string
    status: "running" | "stopped" | "error" | "provisioning"
    progress: number
    duration: string
    vmCount: number
    type: string
    lastAccessed?: string
}

export interface LabCardProps {
    lab: Lab
    onStart?: (id: string) => void
    onStop?: (id: string) => void
    onRestart?: (id: string) => void
    onOpen?: (id: string) => void
    className?: string
}

const statusConfig = {
    running: {
        label: "Running",
        variant: "running" as const,
        icon: Play,
        actionIcon: Square,
        actionLabel: "Stop",
    },
    stopped: {
        label: "Stopped",
        variant: "stopped" as const,
        icon: Square,
        actionIcon: Play,
        actionLabel: "Start",
    },
    error: {
        label: "Error",
        variant: "error" as const,
        icon: Server,
        actionIcon: RotateCcw,
        actionLabel: "Restart",
    },
    provisioning: {
        label: "Provisioning",
        variant: "provisioning" as const,
        icon: Server,
        actionIcon: Clock,
        actionLabel: "Wait",
    },
}

export function LabCard({
    lab,
    onStart,
    onStop,
    onRestart,
    onOpen,
    className,
}: LabCardProps) {
    const config = statusConfig[lab.status]
    const StatusIcon = config.icon

    const handleAction = () => {
        if (lab.status === "running" && onStop) {
            onStop(lab.id)
        } else if (lab.status === "stopped" && onStart) {
            onStart(lab.id)
        } else if (lab.status === "error" && onRestart) {
            onRestart(lab.id)
        }
    }

    return (
        <Card className={cn("overflow-hidden transition-all hover:shadow-md", className)}>
            <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                    <div className="flex-1 pr-2">
                        <CardTitle className="line-clamp-1 text-base">{lab.name}</CardTitle>
                        <CardDescription className="line-clamp-2 mt-1">
                            {lab.description}
                        </CardDescription>
                    </div>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 -mr-2">
                                <MoreVertical className="h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => onOpen?.(lab.id)}>
                                <Terminal className="mr-2 h-4 w-4" />
                                Open Lab
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => onRestart?.(lab.id)}>
                                <RotateCcw className="mr-2 h-4 w-4" />
                                Restart
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
                <div className="flex items-center gap-2 mt-2">
                    <Badge variant={config.variant} className="flex items-center gap-1">
                        <StatusIcon className="h-3 w-3" />
                        {config.label}
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                        {lab.type}
                    </Badge>
                </div>
            </CardHeader>
            <CardContent className="pb-3">
                <div className="space-y-3">
                    <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Progress</span>
                        <span className="font-medium">{lab.progress}%</span>
                    </div>
                    <Progress value={lab.progress} className="h-2" />
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {lab.duration}
                        </div>
                        <div className="flex items-center gap-1">
                            <Server className="h-3 w-3" />
                            {lab.vmCount} VMs
                        </div>
                    </div>
                </div>
            </CardContent>
            <CardFooter className="pt-0">
                <Button
                    variant={lab.status === "running" ? "secondary" : "default"}
                    size="sm"
                    className="w-full"
                    onClick={handleAction}
                    disabled={lab.status === "provisioning"}
                >
                    <config.actionIcon className="mr-2 h-4 w-4" />
                    {lab.status === "running" ? "Stop Lab" : lab.status === "stopped" ? "Start Lab" : config.actionLabel}
                </Button>
            </CardFooter>
        </Card>
    )
}