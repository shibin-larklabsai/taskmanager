import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

// Define a minimal project type that includes only the fields we need
type ProjectWithRequiredFields = {
  id: number;
  name: string;
  description?: string | null;
  status: string;
  startDate: string | Date | null;
  endDate: string | Date | null;
  [key: string]: any; // Allow additional properties
};

interface ProjectDetailsProps {
  project: ProjectWithRequiredFields | null;
  onClose: () => void;
}

export function ProjectDetails({ project, onClose }: ProjectDetailsProps) {
  if (!project) return null;

  const formatDate = (date: Date | string | null) => {
    if (!date) return 'Not set';
    return format(new Date(date), 'PPP');
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PLANNING':
        return 'bg-blue-100 text-blue-800';
      case 'IN_PROGRESS':
        return 'bg-yellow-100 text-yellow-800';
      case 'COMPLETED':
        return 'bg-green-100 text-green-800';
      case 'CANCELLED':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const statusText = {
    PLANNING: 'Planned',
    IN_PROGRESS: 'In Progress',
    COMPLETED: 'Completed',
    CANCELLED: 'Cancelled',
  }[project.status];

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div 
        className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto" 
        onClick={e => e.stopPropagation()}
      >
        <div className="p-6">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h2 className="text-2xl font-bold">{project.name}</h2>
              <div className="flex items-center mt-2">
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(project.status)}`}>
                  {statusText}
                </span>
              </div>
            </div>
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>

          <div className="space-y-6">
            {project.creator && (
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-2">Assigned By</h3>
                <div className="flex items-center space-x-3">
                  <Avatar className="h-9 w-9">
                    <AvatarFallback className="bg-blue-100 text-blue-800">
                      {project.creator.name.split(' ').map((n: string) => n[0]).join('').toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{project.creator.name}</p>
                    <p className="text-sm text-gray-500">{project.creator.email}</p>
                  </div>
                </div>
              </div>
            )}

            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-1">Description</h3>
              <p className="text-gray-900">
                {project.description || 'No description provided.'}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-1">Start Date</h3>
                <p className="flex items-center">
                  <span className="inline-block w-5 mr-2">📅</span>
                  {formatDate(project.startDate)}
                </p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-1">
                  {project.dueDate ? 'Due Date' : 'End Date'}
                </h3>
                <p className="flex items-center">
                  <span className="inline-block w-5 mr-2">⏰</span>
                  {formatDate(project.dueDate || project.endDate) || 'No date set'}
                </p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-1">Created</h3>
                <p className="flex items-center">
                  <span className="inline-block w-5 mr-2">📅</span>
                  {formatDate(project.createdAt)}
                </p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-1">Last Updated</h3>
                <p className="flex items-center">
                  <span className="inline-block w-5 mr-2">✏️</span>
                  {formatDate(project.updatedAt)}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
