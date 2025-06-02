import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { KanbanBoard } from '@/components/projects/KanbanBoard';
import { ProjectDetails } from '@/components/projects/ProjectDetails';
import { getProjects as getAdminProjects } from '@/services/admin/admin.service';
import type { ProjectStatus } from '@/services/project.service';

// Unified project type for the dashboard
type DashboardProject = {
  id: number;
  name: string;
  description?: string | null;
  status: ProjectStatus;
  startDate: string | Date | null;
  endDate: string | Date | null;
  [key: string]: any; // Allow additional properties for flexibility
};
import { Loader2, Search, X } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useToast } from '@/components/ui/use-toast';
import { Navigate } from 'react-router-dom';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

// Status options for the filter
const statusOptions: { value: ProjectStatus | 'all'; label: string }[] = [
  { value: 'all', label: 'All Statuses' },
  { value: 'PLANNING', label: 'Planned' },
  { value: 'IN_PROGRESS', label: 'In Progress' },
  { value: 'COMPLETED', label: 'Completed' },
];

export function DashboardPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedProject, setSelectedProject] = useState<DashboardProject | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<ProjectStatus | 'all'>('all');
  const [dateRange, setDateRange] = useState<{ from?: string; to?: string }>({});
  
  // Check user roles
  const roles = user?.roles || [];
  const isAdmin = roles.includes('admin') || roles.includes('superadmin');
  const isProjectManager = roles.some((role: string | { name: string }) => {
    if (typeof role === 'object' && role !== null) {
      return role.name === 'project_manager' || role.name === 'admin' || role.name === 'superadmin';
    }
    return role === 'project_manager' || role === 'admin' || role === 'superadmin';
  });

  // Redirect project managers to their dashboard
  if (isProjectManager && !isAdmin) {
    return <Navigate to="/project-manager" replace />;
  }

  // Fetch projects if user is admin
  const { data: projects = [], isLoading, error } = useQuery({
    queryKey: ['projects'],
    queryFn: async () => {
      try {
        const data = await getAdminProjects();
        // Transform the data to match our DashboardProject type
        return data.map(project => ({
          ...project,
          // Ensure required fields exist and have the correct types
          id: project.id,
          name: project.name || 'Unnamed Project',
          description: project.description ?? null,
          status: project.status || 'PLANNING',
          startDate: project.startDate || null,
          endDate: project.endDate || null
        } as DashboardProject));
      } catch (err) {
        console.error('Error in queryFn:', err);
        throw err;
      }
    },
    enabled: isAdmin,
    retry: 1,
  });

  // Handle query errors
  useEffect(() => {
    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to load projects',
        variant: 'destructive',
      });
    }
  }, [error, toast]);

  const handleProjectClick = useCallback((project: DashboardProject) => {
    setSelectedProject(project);
  }, []);

  const handleCloseDetails = useCallback(() => {
    setSelectedProject(null);
  }, []);

  // Filter projects based on search term, status, and date range
  const filteredProjects = useMemo(() => {
    return (projects || []).filter(project => {
      // Filter by search term (starts with title only)
      if (searchTerm && !project.name.toLowerCase().startsWith(searchTerm.toLowerCase())) {
        return false;
      }
      
      // Filter by status
      if (statusFilter !== 'all' && project.status !== statusFilter) {
        return false;
      }
      
      // Filter by date range
      if (dateRange.from && project.startDate) {
        const startDate = new Date(project.startDate);
        const fromDate = new Date(dateRange.from);
        if (startDate < fromDate) return false;
      }
      
      if (dateRange.to && project.endDate) {
        const endDate = new Date(project.endDate);
        const toDate = new Date(dateRange.to);
        if (endDate > toDate) return false;
      }
      
      return true;
    });
  }, [projects, searchTerm, statusFilter, dateRange]);

  // Reset all filters
  const resetFilters = () => {
    setSearchTerm('');
    setStatusFilter('all');
    setDateRange({});
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="space-y-6">
          {/* User Info Card */}
          

          {/* Projects Section */}
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-2">
              <div className="space-y-4">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <CardTitle className="text-2xl font-semibold">Projects</CardTitle>
                    <CardDescription>
                      {isAdmin 
                        ? 'Manage and track all projects in the system' 
                        : 'Your active projects'}
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    {(searchTerm || statusFilter !== 'all' || dateRange.from || dateRange.to) && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={resetFilters}
                        className="flex items-center gap-1"
                      >
                        <X className="h-4 w-4" />
                        Clear filters
                      </Button>
                    )}
                  </div>
                </div>
                
                {/* Filters */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      placeholder="Search projects..."
                      className="pl-9"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                  
                  <Select
                    value={statusFilter}
                    onValueChange={(value: ProjectStatus | 'all') => setStatusFilter(value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Filter by status" />
                    </SelectTrigger>
                    <SelectContent>
                      {statusOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  
                  <Input
                    type="date"
                    placeholder="From date"
                    value={dateRange.from || ''}
                    onChange={(e) => setDateRange(prev => ({ ...prev, from: e.target.value }))}
                    className="w-full"
                  />
                  
                  <Input
                    type="date"
                    placeholder="To date"
                    value={dateRange.to || ''}
                    onChange={(e) => setDateRange(prev => ({ ...prev, to: e.target.value }))}
                    className="w-full"
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              {isLoading ? (
                <div className="flex justify-center py-16">
                  <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
                </div>
              ) : (
                <>
                  <KanbanBoard 
                    projects={filteredProjects} 
                    onProjectClick={handleProjectClick} 
                  />
                  {filteredProjects.length === 0 && (
                    <div className="text-center py-12 text-muted-foreground">
                      No projects found matching your filters
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
          
          {/* Project Details Modal */}
          {selectedProject && (
            <ProjectDetails 
              project={selectedProject} 
              onClose={handleCloseDetails} 
            />
          )}
        </div>
      </main>
    </div>
  );
}
