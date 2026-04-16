import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { TrendingUp, TrendingDown, Minus } from "lucide-react"

export interface StatsCardProps {
    title: string
    value: string | number
    description?: string
    trend?: "up" | "down" | "neutral"
    trendValue?: string
    icon: React.ElementType
    className?: string
}

export function StatsCard({
    title,
    value,
    description,
    trend,
    trendValue,
    icon: Icon,
    className,
}: StatsCardProps) {
    const trendConfig = {
        up: { icon: TrendingUp, color: "text-emerald-600", bg: "bg-emerald-50" },
        down: { icon: TrendingDown, color: "text-red-600", bg: "bg-red-50" },
        neutral: { icon: Minus, color: "text-gray-600", bg: "bg-gray-50" },
    }

    const trendStyle = trend ? trendConfig[trend] : null

    return (
        <Card className={cn("overflow-hidden", className)}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                    {title}
                </CardTitle>
                <div className="rounded-md bg-primary/10 p-2">
                    <Icon className="h-4 w-4 text-primary" />
                </div>
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">{value}</div>
                {(description || trend) && (
                    <div className="flex items-center gap-2 mt-1">
                        {trend && trendStyle && (
                            <div className={cn("flex items-center gap-1 text-xs", trendStyle.color)}>
                                <trendStyle.icon className="h-3 w-3" />
                                <span>{trendValue}</span>
                            </div>
                        )}
                        {description && (
                            <p className="text-xs text-muted-foreground">{description}</p>
                        )}
                    </div>
                )}
            </CardContent>
        </Card>
    )
}