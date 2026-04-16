import { StatsCard } from "@/components/dashboard/StatsCard"
import { LabCard } from "@/components/dashboard/LabCard"
import { ActivityFeed } from "@/components/dashboard/ActivityFeed"
import { QuickActions } from "@/components/dashboard/QuickActions"
import { LearningPathCard } from "@/components/dashboard/LearningPathCard"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import {
  FlaskConical,
  Clock,
  Trophy,
  Activity,
  ChevronRight,
  TrendingUp
} from "lucide-react"

// Mock data - replace with actual API calls
const mockUser = {
  name: "Test Admin",
  email: "testadmin@local.test",
  role: "admin",
}

const mockStats = [
  {
    title: "Active Labs",
    value: "3",
    description: "Currently running",
    trend: "up" as const,
    trendValue: "+1 from yesterday",
    icon: FlaskConical,
  },
  {
    title: "Hours This Week",
    value: "12.5",
    description: "Total lab time",
    trend: "up" as const,
    trendValue: "+2.5 hrs",
    icon: Clock,
  },
  {
    title: "Completed Labs",
    value: "24",
    description: "All time total",
    trend: "up" as const,
    trendValue: "+3 this week",
    icon: Trophy,
  },
  {
    title: "Success Rate",
    value: "87%",
    description: "First attempt completion",
    trend: "neutral" as const,
    trendValue: "Stable",
    icon: Activity,
  },
]

const mockLabs = [
  {
    id: "1",
    name: "PostgreSQL Installation Lab",
    description: "Learn to install and configure PostgreSQL on Ubuntu 22.04 with best practices for production environments.",
    status: "running" as const,
    progress: 65,
    duration: "45 min",
    vmCount: 2,
    type: "Database",
    lastAccessed: "2 hours ago",
  },
  {
    id: "2",
    name: "VMware vSphere Cluster Setup",
    description: "Configure a 3-node vSphere cluster with shared storage and vMotion capabilities.",
    status: "stopped" as const,
    progress: 30,
    duration: "2 hours",
    vmCount: 4,
    type: "Virtualization",
  },
  {
    id: "3",
    name: "Docker Container Orchestration",
    description: "Deploy and manage microservices using Docker Swarm and compose files.",
    status: "error" as const,
    progress: 80,
    duration: "1.5 hours",
    vmCount: 3,
    type: "Containerization",
  },
]

const mockLearningPaths = [
  {
    id: "1",
    title: "Database Administration Fundamentals",
    description: "Master PostgreSQL, MySQL, and MongoDB administration with hands on labs.",
    category: "Database",
    difficulty: "intermediate" as const,
    totalLabs: 12,
    completedLabs: 5,
    estimatedHours: 24,
    isEnrolled: true,
  },
  {
    id: "2",
    title: "VMware vSphere Professional",
    description: "Complete certification path for VMware vSphere implementation and management.",
    category: "Virtualization",
    difficulty: "advanced" as const,
    totalLabs: 20,
    completedLabs: 0,
    estimatedHours: 40,
    isEnrolled: false,
  },
  {
    id: "3",
    title: "Docker & Kubernetes Mastery",
    description: "Container orchestration from basics to production-grade deployments.",
    category: "DevOps",
    difficulty: "beginner" as const,
    totalLabs: 15,
    completedLabs: 3,
    estimatedHours: 30,
    isEnrolled: true,
  },
]

const mockActivities = [
  {
    id: "1",
    type: "lab_started" as const,
    labName: "PostgreSQL Installation Lab",
    timestamp: "10 min ago",
    description: "Started new lab session",
    user: { name: "You", initials: "YA" },
  },
  {
    id: "2",
    type: "lab_completed" as const,
    labName: "Docker Basics",
    timestamp: "2 hours ago",
    description: "Completed all objectives with 95% score",
    user: { name: "You", initials: "YA" },
  },
  {
    id: "3",
    type: "achievement" as const,
    achievementName: "First Steps",
    timestamp: "5 hours ago",
    description: "Completed your first 5 labs",
    user: { name: "You", initials: "YA" },
  },
  {
    id: "4",
    type: "lab_error" as const,
    labName: "Kubernetes Cluster",
    timestamp: "1 day ago",
    description: "VM provisioning failed - insufficient resources",
    user: { name: "System", initials: "SY" },
  },
  {
    id: "5",
    type: "course_enrolled" as const,
    courseName: "Database Administration",
    timestamp: "2 days ago",
    description: "Enrolled in new learning path",
    user: { name: "You", initials: "YA" },
  },
]

export default function DashboardPage() {
  const handleStartLab = (id: string) => {
    console.log("Starting lab:", id)
  }

  const handleStopLab = (id: string) => {
    console.log("Stopping lab:", id)
  }

  return (
    <div className="p-6 lg:p-8">
      {/* Welcome Section */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">
          Welcome back, {mockUser.name.split(" ")[0]}! 👋
        </h1>
        <p className="text-muted-foreground mt-1">
          Here's what's happening with your labs and learning progress.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
        {mockStats.map((stat, index) => (
          <StatsCard key={index} {...stat} />
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          <Tabs defaultValue="labs" className="w-full">
            <TabsList className="grid w-full grid-cols-2 lg:w-[400px]">
              <TabsTrigger value="labs">My Labs</TabsTrigger>
              <TabsTrigger value="learning">Learning Paths</TabsTrigger>
            </TabsList>

            <TabsContent value="labs" className="mt-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold">Active Labs</h2>
                <Button variant="ghost" size="sm">
                  View All
                  <ChevronRight className="ml-1 h-4 w-4" />
                </Button>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                {mockLabs.map((lab) => (
                  <LabCard
                    key={lab.id}
                    lab={lab}
                    onStart={handleStartLab}
                    onStop={handleStopLab}
                  />
                ))}
              </div>
            </TabsContent>

            <TabsContent value="learning" className="mt-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold">Your Learning Paths</h2>
                <Button variant="ghost" size="sm">
                  Browse Catalog
                  <ChevronRight className="ml-1 h-4 w-4" />
                </Button>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                {mockLearningPaths.map((path) => (
                  <LearningPathCard key={path.id} path={path} />
                ))}
              </div>
            </TabsContent>
          </Tabs>
        </div>

        {/* Sidebar Content */}
        <div className="space-y-6">
          <QuickActions userRole={mockUser.role} />
          <ActivityFeed activities={mockActivities} />
        </div>
      </div>

      {/* Recommended Section */}
      <div className="mt-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold">Recommended for You</h2>
            <p className="text-sm text-muted-foreground">
              Based on your interests and career goals
            </p>
          </div>
          <Button variant="outline" size="sm">
            <TrendingUp className="mr-2 h-4 w-4" />
            View All
          </Button>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {mockLearningPaths.slice(0, 3).map((path) => (
            <LearningPathCard key={path.id} path={path} />
          ))}
        </div>
      </div>
    </div>
  )
}