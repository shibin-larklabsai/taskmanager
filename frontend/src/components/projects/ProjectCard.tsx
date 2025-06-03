import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Project } from '@/services/project.service';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface ProjectCardProps {
  project: Project;
  className?: string;
}

export function ProjectCard({ project, className }: ProjectCardProps) {
  const statusVariant = {
    PLANNING: 'bg-blue-100 text-blue-800',
    IN_PROGRESS: 'bg-yellow-100 text-yellow-800',
    COMPLETED: 'bg-green-100 text-green-800',
    CANCELLED: 'bg-red-100 text-red-800',
  }[project.status] || 'bg-gray-100 text-gray-800';

  return (
    <Card className={cn('h-full flex flex-col hover:shadow-md transition-shadow', className)}>
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <CardTitle className="text-lg">{project.name}</CardTitle>
          <Badge variant="outline" className={cn('text-xs', statusVariant)}>
            {project.status.replace('_', ' ')}
          </Badge>
        </div>
        {project.description && (
          <CardDescription className="line-clamp-2">
            {project.description}
          </CardDescription>
        )}
      </CardHeader>
      <CardContent className="mt-auto pt-2">
        <div className="flex flex-col space-y-2 text-sm text-muted-foreground">
          {project.startDate && (
            <div className="flex justify-between">
              <span>Start Date:</span>
              <span>{format(new Date(project.startDate), 'MMM d, yyyy')}</span>
            </div>
          )}
          {project.endDate && (
            <div className="flex justify-between">
              <span>End Date:</span>
              <span>{format(new Date(project.endDate), 'MMM d, yyyy')}</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
