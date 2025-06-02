import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, X, Filter as FilterIcon } from 'lucide-react';
import { TaskPriority, TaskStatus } from '@/services/task.service';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';

export interface TaskFiltersProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  statusFilter: TaskStatus[];
  onStatusChange: (status: TaskStatus[]) => void;
  priorityFilter: TaskPriority[];
  onPriorityChange: (priorities: TaskPriority[]) => void;
  assigneeFilter: string[];
  onAssigneeChange: (assignees: string[]) => void;
  sortBy: string;
  onSortByChange: (value: string) => void;
  sortOrder: 'asc' | 'desc';
  onSortOrderChange: (value: 'asc' | 'desc') => void;
  assignees: Array<{ id: string; name: string }>;
  className?: string;
}

const statusOptions: { value: TaskStatus; label: string }[] = [
  { value: 'TODO', label: 'To Do' },
  { value: 'IN_PROGRESS', label: 'In Progress' },
  { value: 'IN_REVIEW', label: 'In Review' },
  { value: 'DONE', label: 'Done' },
  { value: 'BLOCKED', label: 'Blocked' },
];

const priorityOptions: { value: TaskPriority; label: string }[] = [
  { value: 'LOW', label: 'Low' },
  { value: 'MEDIUM', label: 'Medium' },
  { value: 'HIGH', label: 'High' },
  { value: 'URGENT', label: 'Urgent' },
];

export function TaskFilters({
  searchQuery,
  onSearchChange,
  statusFilter,
  onStatusChange,
  priorityFilter,
  onPriorityChange,
  assigneeFilter,
  onAssigneeChange,
  sortBy,
  onSortByChange,
  sortOrder,
  onSortOrderChange,
  assignees,
  className = '',
}: TaskFiltersProps) {
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  const handleStatusToggle = (status: TaskStatus) => {
    if (statusFilter.includes(status)) {
      onStatusChange(statusFilter.filter((s) => s !== status));
    } else {
      onStatusChange([...statusFilter, status]);
    }
  };

  const handlePriorityToggle = (priority: TaskPriority) => {
    if (priorityFilter.includes(priority)) {
      onPriorityChange(priorityFilter.filter((p) => p !== priority));
    } else {
      onPriorityChange([...priorityFilter, priority]);
    }
  };

  const handleAssigneeToggle = (assigneeId: string) => {
    if (assigneeFilter.includes(assigneeId)) {
      onAssigneeChange(assigneeFilter.filter((id) => id !== assigneeId));
    } else {
      onAssigneeChange([...assigneeFilter, assigneeId]);
    }
  };

  const hasActiveFilters = 
    statusFilter.length > 0 || 
    priorityFilter.length > 0 || 
    assigneeFilter.length > 0;

  const clearAllFilters = () => {
    onStatusChange([]);
    onPriorityChange([]);
    onAssigneeChange([]);
    onSearchChange('');
  };

  return (
    <div className={cn('flex flex-col sm:flex-row gap-4 mb-6', className)}>
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search tasks..."
          className="pl-10"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
        />
        {searchQuery && (
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-2 top-1/2 h-6 w-6 -translate-y-1/2"
            onClick={() => onSearchChange('')}
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      <div className="flex gap-2">
        <Popover open={isFilterOpen} onOpenChange={setIsFilterOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" className="relative">
              <FilterIcon className="mr-2 h-4 w-4" />
              Filters
              {hasActiveFilters && (
                <span className="ml-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-xs text-primary-foreground">
                  {statusFilter.length + priorityFilter.length + assigneeFilter.length}
                </span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80 p-4" align="end">
            <div className="space-y-6">
              <div className="space-y-2">
                <h4 className="font-medium">Status</h4>
                <div className="grid grid-cols-2 gap-2">
                  {statusOptions.map((status) => (
                    <div key={status.value} className="flex items-center space-x-2">
                      <Checkbox
                        id={`status-${status.value}`}
                        checked={statusFilter.includes(status.value)}
                        onCheckedChange={() => handleStatusToggle(status.value)}
                      />
                      <Label htmlFor={`status-${status.value}`} className="text-sm font-normal">
                        {status.label}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="font-medium">Priority</h4>
                <div className="grid grid-cols-2 gap-2">
                  {priorityOptions.map((priority) => (
                    <div key={priority.value} className="flex items-center space-x-2">
                      <Checkbox
                        id={`priority-${priority.value}`}
                        checked={priorityFilter.includes(priority.value)}
                        onCheckedChange={() => handlePriorityToggle(priority.value)}
                      />
                      <Label htmlFor={`priority-${priority.value}`} className="text-sm font-normal">
                        {priority.label}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>

              {assignees.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-medium">Assignees</h4>
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {assignees.map((assignee) => (
                      <div key={assignee.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={`assignee-${assignee.id}`}
                          checked={assigneeFilter.includes(assignee.id)}
                          onCheckedChange={() => handleAssigneeToggle(assignee.id)}
                        />
                        <Label htmlFor={`assignee-${assignee.id}`} className="text-sm font-normal">
                          {assignee.name}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {hasActiveFilters && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start text-sm text-muted-foreground"
                  onClick={clearAllFilters}
                >
                  <X className="mr-2 h-4 w-4" />
                  Clear all filters
                </Button>
              )}
            </div>
          </PopoverContent>
        </Popover>

        <Select
          value={sortBy}
          onValueChange={onSortByChange}
        >
          <SelectTrigger className="w-[180px]">
            <span className="text-muted-foreground">Sort by:</span>
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="title">Title</SelectItem>
            <SelectItem value="dueDate">Due Date</SelectItem>
            <SelectItem value="priority">Priority</SelectItem>
            <SelectItem value="status">Status</SelectItem>
            <SelectItem value="createdAt">Created At</SelectItem>
          </SelectContent>
        </Select>

        <Button
          variant="outline"
          size="icon"
          onClick={() => onSortOrderChange(sortOrder === 'asc' ? 'desc' : 'asc')}
          title={sortOrder === 'asc' ? 'Sort ascending' : 'Sort descending'}
        >
          {sortOrder === 'asc' ? 'A-Z' : 'Z-A'}
        </Button>
      </div>
    </div>
  );
}

function cn(...classes: (string | undefined)[]) {
  return classes.filter(Boolean).join(' ');
}
