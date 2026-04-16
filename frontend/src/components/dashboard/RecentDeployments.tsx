import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Clock, Play, CheckCircle, XCircle, AlertCircle, Loader2 } from 'lucide-react';
import type { Deployment } from '@/api/types';

interface RecentDeploymentsProps {
  deployments: Deployment[];
  isLoading: boolean;
}

// Simple relative time formatter (since you don't have date-fns)
const formatRelativeTime = (dateString: string): string => {
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  
  if (diffInSeconds < 60) return 'just now';
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
  if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;
  return date.toLocaleDateString();
};

const getStatusIcon = (status: Deployment['status']) => {
  switch (status) {
    case 'COMPLETED':
      return <CheckCircle className="h-5 w-5 text-green-500" />;
    case 'FAILED':
      return <XCircle className="h-5 w-5 text-red-500" />;
    case 'RUNNING':
      return <Loader2 className="h-5 w-5 text-blue-500 animate-spin" />;
    case 'QUEUED':
    case 'PENDING_APPROVAL':
      return <Clock className="h-5 w-5 text-muted-foreground" />;
    case 'CANCELLED':
    case 'ROLLING_BACK':
    case 'ROLLED_BACK':
    case 'PAUSED':
      return <AlertCircle className="h-5 w-5 text-orange-500" />;
    default:
      return <AlertCircle className="h-5 w-5 text-muted-foreground" />;
  }
};

const getStatusBadgeVariant = (status: Deployment['status']) => {
  switch (status) {
    case 'COMPLETED':
      return 'default';
    case 'FAILED':
      return 'destructive';
    case 'RUNNING':
      return 'secondary';
    case 'QUEUED':
    case 'PENDING_APPROVAL':
      return 'outline';
    case 'CANCELLED':
    case 'ROLLING_BACK':
    case 'ROLLED_BACK':
    case 'PAUSED':
      return 'outline';
    default:
      return 'outline';
  }
};

const RecentDeployments = ({ deployments, isLoading }: RecentDeploymentsProps) => {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Recent Deployments</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center justify-between p-3 border rounded animate-pulse">
                <div className="space-y-2">
                  <div className="h-4 w-32 bg-muted rounded"></div>
                  <div className="h-3 w-48 bg-muted rounded"></div>
                </div>
                <div className="h-6 w-16 bg-muted rounded"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Deployments</CardTitle>
      </CardHeader>
      <CardContent>
        {deployments.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Play className="mx-auto h-10 w-10 mb-2 opacity-50" />
            <p>No deployments yet</p>
            <p className="text-sm">Start a new deployment to see it here</p>
          </div>
        ) : (
          <div className="space-y-3">
            {deployments.slice(0, 5).map((deployment) => (
              <div 
                key={deployment.id} 
                className="flex items-center justify-between p-3 border rounded hover:bg-accent/50 transition-colors"
              >
                <div className="flex items-start gap-3 min-w-0">
                  <div className="mt-0.5 shrink-0">
                    {getStatusIcon(deployment.status)}
                  </div>
                  <div className="min-w-0">
                    <div className="font-medium truncate">
                      {deployment.template_snapshot?.name || 'Unnamed Template'}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      <span className="font-mono text-xs">{deployment.trace_id.substring(0, 8)}</span>
                      {' • '}
                      {formatRelativeTime(deployment.created_at)}
                    </div>
                  </div>
                </div>
                <Badge variant={getStatusBadgeVariant(deployment.status)} className="shrink-0 ml-2">
                  {deployment.status.replace(/_/g, ' ')}
                </Badge>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default RecentDeployments;