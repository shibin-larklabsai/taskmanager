import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Project } from '@/services/admin/admin.service';
import { Textarea } from '@/components/ui/textarea';

// Simple date formatting function
const formatDate = (date: Date | string | null): string => {
  if (!date) return '';
  const d = new Date(date);
  return d.toISOString().split('T')[0];
};

// Define a type for project creation (without id)
type CreateProjectData = Omit<Project, 'id' | 'createdAt' | 'updatedAt' | 'deletedAt'>;

// Define a type for project update (with id)
type UpdateProjectData = CreateProjectData & {
  id: number;
};

// Union type for form data
export type ProjectFormData = CreateProjectData | UpdateProjectData;

interface ProjectFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: ProjectFormData) => Promise<void>;
  initialData?: Project | null;
  isSubmitting: boolean;
}

export function ProjectForm({
  open,
  onOpenChange,
  onSubmit,
  initialData,
  isSubmitting,
}: ProjectFormProps) {
  const [formData, setFormData] = useState<ProjectFormData>({
    name: '',
    description: '',
    status: 'PLANNING',
    startDate: new Date(),
    endDate: null,
    createdById: 1, // TODO: Get from auth context
  });

  useEffect(() => {
    if (initialData) {
      setFormData({
        ...initialData,
        description: initialData.description || '',
        startDate: initialData.startDate ? new Date(initialData.startDate) : new Date(),
        endDate: initialData.endDate ? new Date(initialData.endDate) : null,
      });
    } else {
setFormData({
        name: '',
        description: '',
        status: 'PLANNING',
        startDate: new Date(),
        endDate: null,
        createdById: 1, // TODO: Get from auth context
      });
    }
  }, [initialData, open]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    try {
      // Create a new object with the form data
      const dataToSubmit = {
        ...formData,
        createdById: 1, // TODO: Get from auth context
        startDate: formData.startDate ? new Date(formData.startDate).toISOString() : new Date().toISOString(),
        endDate: formData.endDate ? new Date(formData.endDate).toISOString() : null,
      };
      
      // If we have an initialData with ID, include it in the submission
      if (initialData?.id) {
        (dataToSubmit as UpdateProjectData).id = initialData.id;
      }
      
      await onSubmit(dataToSubmit);
      onOpenChange(false);
    } catch (error) {
      console.error('Error submitting form:', error);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg w-full max-w-md">
        <h2 className="text-xl font-bold mb-4">
          {initialData ? 'Edit Project' : 'Create New Project'}
        </h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="name">Project Name</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
              minLength={3}
              className="mt-1"
              placeholder="Enter project name (min 3 characters)"
            />
          </div>
          
          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description || ''}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="mt-1"
              rows={3}
            />
          </div>

          <div>
            <Label htmlFor="startDate">Start Date</Label>
            <Input
              id="startDate"
              type="date"
              value={formData.startDate ? formatDate(formData.startDate) : ''}
              onChange={(e) => {
                const date = e.target.value ? new Date(e.target.value) : null;
                if (date) {
                  setFormData(prev => ({
                    ...prev,
                    startDate: date
                  }));
                }
              }}
              required
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="endDate">End Date (Optional)</Label>
            <Input
              id="endDate"
              type="date"
              value={formData.endDate ? formatDate(formData.endDate) : ''}
              onChange={(e) => {
                const date = e.target.value ? new Date(e.target.value) : null;
                setFormData(prev => ({
                  ...prev,
                  endDate: date
                }));
              }}
              className="mt-1"
            />
          </div>
          
          <div>
            <Label htmlFor="status">Status</Label>
            <Select
              value={formData.status}
              onValueChange={(value: Project['status']) => 
                setFormData({ ...formData, status: value })
              }
            >
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="PLANNING">Planning</SelectItem>
                <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                <SelectItem value="COMPLETED">Completed</SelectItem>
                <SelectItem value="CANCELLED">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : 'Save'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
