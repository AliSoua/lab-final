import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Server, Play, Activity, AlertCircle } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  change?: string;
  isLoading?: boolean;
}

const StatCard = ({ title, value, icon, change, isLoading }: StatCardProps) => {
  if (isLoading) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">{title}</CardTitle>
          {icon}
        </CardHeader>
        <CardContent>
          <Skeleton className="h-8 w-24" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {change && <p className="text-xs text-muted-foreground">{change}</p>}
      </CardContent>
    </Card>
  );
};

interface StatsCardsProps {
  stats: {
    totalEnvironments: number;
    totalTasks: number;
    activeDeployments: number;
    recentFailures: number;
  };
  isLoading: boolean;
}

const StatsCards = ({ stats, isLoading }: StatsCardsProps) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <StatCard
        title="Total Environments"
        value={stats.totalEnvironments}
        icon={<Server className="h-4 w-4 text-muted-foreground" />}
        isLoading={isLoading}
      />
      <StatCard
        title="Total Tasks"
        value={stats.totalTasks}
        icon={<Play className="h-4 w-4 text-muted-foreground" />}
        isLoading={isLoading}
      />
      <StatCard
        title="Active Deployments"
        value={stats.activeDeployments}
        icon={<Activity className="h-4 w-4 text-muted-foreground" />}
        isLoading={isLoading}
      />
      <StatCard
        title="Recent Failures"
        value={stats.recentFailures}
        icon={<AlertCircle className="h-4 w-4 text-muted-foreground" />}
        isLoading={isLoading}
      />
    </div>
  );
};

export default StatsCards;