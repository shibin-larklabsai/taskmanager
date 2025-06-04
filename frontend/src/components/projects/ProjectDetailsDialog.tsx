import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import type { Project } from '@/types/project';

type ProjectDetailsDialogProps = {
  project: Project | null;
  onOpenChange: (open: boolean) => void;
};

export function ProjectDetailsDialog({ project, onOpenChange }: ProjectDetailsDialogProps) {
  if (!project) return null;

  const getStatusBadge = (status: string) => {
    const statusMap = {
      'ACTIVE': { variant: 'default' as const, label: 'Active' },
      'IN_PROGRESS': { variant: 'default' as const, label: 'In Progress' },
      'ON_HOLD': { variant: 'secondary' as const, label: 'On Hold' },
      'COMPLETED': { variant: 'outline' as const, label: 'Completed' },
      'CANCELLED': { variant: 'destructive' as const, label: 'Cancelled' }
    };
    
    const statusInfo = statusMap[status as keyof typeof statusMap] || { variant: 'outline' as const, label: status || 'Unknown' };
    return <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>;
  };

  const getRoleBadge = (role: string) => {
    const roleMap: Record<string, string> = {
      'OWNER': 'Owner',
      'MANAGER': 'Manager',
      'DESIGNER': 'Designer',
      'VIEWER': 'Viewer',
      // Return empty string for DEVELOPER role to hide the badge
      'DEVELOPER': ''
    };
    return roleMap[role] || role;
  };

  return (
    <Dialog open={!!project} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <div className="flex justify-between items-start">
            <DialogTitle className="text-2xl">{project.name}</DialogTitle>
            <div className="flex space-x-2">
              {getStatusBadge(project.status)}
              {project.role && project.role !== 'DEVELOPER' && getRoleBadge(project.role) && (
                <Badge variant="outline">{getRoleBadge(project.role)}</Badge>
              )}
            </div>
          </div>
        </DialogHeader>
        
        <div className="space-y-6 py-4">
          {project.description && (
            <div>
              <h3 className="font-medium mb-2">Description</h3>
              <p className="text-gray-700 bg-gray-50 p-3 rounded-md">
                {project.description}
              </p>
            </div>
          )}

          <div className="space-y-4">
            <div>
              <h3 className="font-medium mb-2">Project Timeline</h3>
              <div className="space-y-2 text-sm text-gray-700">
                <div className="flex justify-between">
                  <span className="text-gray-500">Start Date:</span>
                  <span>{project.startDate ? format(new Date(project.startDate), 'MMM d, yyyy') : 'Not set'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">End Date:</span>
                  <span>{project.endDate ? format(new Date(project.endDate), 'MMM d, yyyy') : 'Not set'}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
