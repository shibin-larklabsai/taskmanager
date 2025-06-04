import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { ProjectStatus } from '@/services/project.service';

// Define the project type that KanbanBoard expects
export type KanbanProject = {
  id: number;
  name: string;
  description?: string | null;
  status: ProjectStatus;
  startDate: string | Date | null;
  endDate: string | Date | null;
  [key: string]: any; // Allow additional properties
};

// Map statuses to display values
const statusMap = {
  'PLANNING': { title: 'Planned', color: 'bg-blue-100 text-blue-800' },
  'IN_PROGRESS': { title: 'In Progress', color: 'bg-yellow-100 text-yellow-800' },
  'COMPLETED': { title: 'Completed', color: 'bg-green-100 text-green-800' },
} as const;

interface KanbanBoardProps {
  projects: KanbanProject[];
  onProjectClick: (project: KanbanProject) => void;
}

export function KanbanBoard({ projects, onProjectClick }: KanbanBoardProps) {
  // Group projects by status
  const projectsByStatus = projects.reduce<Record<ProjectStatus, KanbanProject[]>>(
    (acc, project) => {
      if (!acc[project.status]) {
        acc[project.status] = [];
      }
      acc[project.status].push(project);
      return acc;
    },
    {} as Record<ProjectStatus, KanbanProject[]>
  );

  // Helper function to parse date
  const parseDate = (date: string | Date | null | undefined): Date | null => {
    if (!date) return null;
    const parsedDate = date instanceof Date ? date : new Date(date);
    return isNaN(parsedDate.getTime()) ? null : parsedDate;
  };

  // Sort projects by end date within each status
  Object.values(projectsByStatus).forEach(projects => {
    projects.sort((a, b) => {
      const dateA = parseDate(a.endDate);
      const dateB = parseDate(b.endDate);
      
      if (!dateA && !dateB) return 0;
      if (!dateA) return 1;
      if (!dateB) return -1;
      
      return dateA.getTime() - dateB.getTime();
    });
  });

  return (
    <div className="w-full overflow-x-auto pb-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 min-w-[900px] px-4">
        {(Object.entries(statusMap) as [ProjectStatus, { title: string; color: string }][]).map(([status, config]) => (
          <div key={status} className="flex flex-col h-full">
            <Card className="h-full flex flex-col">
              <CardHeader className="p-4">
                <CardTitle className="text-sm font-medium flex items-center">
                  <span className={`inline-block w-3 h-3 rounded-full mr-2 ${config.color}`}></span>
                  {config.title}
                  <span className="ml-2 text-xs bg-muted px-2 py-0.5 rounded-full">
                    {projectsByStatus[status]?.length || 0}
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-3 flex-1 overflow-y-auto">
                {projectsByStatus[status]?.map((project) => {
                  const endDate = project.endDate ? new Date(project.endDate) : null;
                  return (
                    <Card 
                      key={project.id}
                      className="p-4 mb-3 cursor-pointer hover:bg-muted/50 transition-colors shadow-sm"
                      onClick={() => onProjectClick(project)}
                    >
                      <div className="flex justify-between items-start gap-2">
                        <h3 className="font-medium text-sm flex-1">{project.name}</h3>
                        {endDate && (
                          <span className="text-xs text-muted-foreground whitespace-nowrap">
                            {endDate.toLocaleDateString()}
                          </span>
                        )}
                      </div>
                      {project.description && (
                        <p className="text-xs text-muted-foreground mt-2 line-clamp-2">
                          {project.description}
                        </p>
                      )}
                    </Card>
                  );
                })}
                {(!projectsByStatus[status] || projectsByStatus[status]?.length === 0) && (
                  <div className="text-center py-6 text-gray-400 text-sm border-2 border-dashed border-gray-200 rounded-lg">
                    No projects in this status
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        ))}
      </div>
    </div>
  );
}
