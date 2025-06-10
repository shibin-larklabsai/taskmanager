import { Project } from '@/services/admin/admin.service';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Edit, Trash2 } from 'lucide-react';
import { Link } from 'react-router-dom';

interface ProjectsListProps {
  projects: Project[];
  onEdit?: (project: Project) => void;
  onDelete?: (project: Project) => void;
  showActions?: boolean;
  className?: string;
}

export function ProjectsList({
  projects,
  onEdit,
  onDelete,
  showActions = true,
  className = '',
}: ProjectsListProps) {
  if (projects.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">No projects found</p>
      </div>
    );
  }

  return (
    <div className={`overflow-hidden ${className}`}>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Start Date</TableHead>
            <TableHead>End Date</TableHead>
            {showActions && <TableHead className="text-right">Actions</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {projects.map((project) => (
            <TableRow key={project.id}>
              <TableCell className="font-medium">
                <Link to={`/projects/${project.id}`} className="hover:underline">
                  {project.name}
                </Link>
              </TableCell>
              <TableCell>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                  {project.status}
                </span>
              </TableCell>
              <TableCell>
                {project.startDate ? new Date(project.startDate).toLocaleDateString() : '-'}
              </TableCell>
              <TableCell>
                {project.endDate ? new Date(project.endDate).toLocaleDateString() : '-'}
              </TableCell>
              {showActions && onEdit && onDelete && (
                <TableCell className="text-right">
                  <div className="flex justify-end space-x-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onEdit(project)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onDelete(project)}
                      className="text-red-600 hover:text-red-800"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
