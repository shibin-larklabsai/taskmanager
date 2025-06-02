import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Task, TaskStatus } from '@/services/task.service';
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { format } from 'date-fns';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, Clock, AlertCircle, Circle, TrendingUp, Users, Calendar } from 'lucide-react';

interface TaskStatsProps {
  tasks: Task[];
  className?: string;
}

const statusColors: Record<TaskStatus, string> = {
  TODO: 'bg-gray-400',
  IN_PROGRESS: 'bg-blue-500',
  IN_REVIEW: 'bg-yellow-500',
  DONE: 'bg-green-500',
  BLOCKED: 'bg-red-500',
};

const statusIcons: Record<TaskStatus, JSX.Element> = {
  TODO: <Circle className="h-4 w-4" />,
  IN_PROGRESS: <Clock className="h-4 w-4" />,
  IN_REVIEW: <AlertCircle className="h-4 w-4" />,
  DONE: <CheckCircle className="h-4 w-4" />,
  BLOCKED: <AlertCircle className="h-4 w-4" />,
};

const statusLabels: Record<TaskStatus, string> = {
  TODO: 'To Do',
  IN_PROGRESS: 'In Progress',
  IN_REVIEW: 'In Review',
  DONE: 'Done',
  BLOCKED: 'Blocked',
};

export function TaskStats({ tasks, className = '' }: TaskStatsProps) {
  // Calculate task counts by status
  const statusCounts = tasks.reduce<Record<TaskStatus, number>>(
    (acc, task) => {
      acc[task.status] = (acc[task.status] || 0) + 1;
      return acc;
    },
    {
      TODO: 0,
      IN_PROGRESS: 0,
      IN_REVIEW: 0,
      DONE: 0,
      BLOCKED: 0,
    }
  );

  // Calculate completion percentage
  const totalTasks = tasks.length;
  const completedTasks = statusCounts.DONE;
  const completionPercentage = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  // Calculate overdue tasks
  const today = new Date();
  const overdueTasks = tasks.filter(
    (task) => task.dueDate && new Date(task.dueDate) < today && task.status !== 'DONE'
  ).length;

  // Calculate tasks due this week
  const nextWeek = new Date();
  nextWeek.setDate(today.getDate() + 7);
  const dueThisWeek = tasks.filter(
    (task) =>
      task.dueDate &&
      new Date(task.dueDate) >= today &&
      new Date(task.dueDate) <= nextWeek &&
      task.status !== 'DONE'
  ).length;

  // Calculate tasks by assignee
  const tasksByAssignee = tasks.reduce<Record<string, number>>((acc, task) => {
    if (task.assignee) {
      const assigneeId = typeof task.assignee === 'string' ? task.assignee : task.assignee.id;
      acc[assigneeId] = (acc[assigneeId] || 0) + 1;
    }
    return acc;
  }, {});

  // Prepare data for the bar chart (tasks by status)
  const statusData = Object.entries(statusCounts).map(([status, count]) => ({
    name: statusLabels[status as TaskStatus],
    value: count,
    color: statusColors[status as TaskStatus].replace('bg-', ''),
  }));

  // Prepare data for the timeline chart (tasks by due date)
  const tasksByDueDate = tasks
    .filter((task) => task.dueDate)
    .reduce<Record<string, number>>((acc, task) => {
      if (task.dueDate) {
        const date = format(new Date(task.dueDate), 'MMM d');
        acc[date] = (acc[date] || 0) + 1;
      }
      return acc;
    }, {});

  const timelineData = Object.entries(tasksByDueDate).map(([date, count]) => ({
    date,
    count,
  }));

  return (
    <div className={cn('grid gap-4 md:grid-cols-2 lg:grid-cols-4', className)}>
      {/* Completion Rate */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Completion Rate</CardTitle>
          <CheckCircle className="h-4 w-4 text-green-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{completionPercentage}%</div>
          <p className="text-xs text-muted-foreground">
            {completedTasks} of {totalTasks} tasks completed
          </p>
          <Progress value={completionPercentage} className="h-2 mt-2" />
        </CardContent>
      </Card>

      {/* Tasks by Status */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Tasks by Status</CardTitle>
          <TrendingUp className="h-4 w-4 text-blue-500" />
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {Object.entries(statusCounts).map(([status, count]) => (
              <div key={status} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={cn('h-3 w-3 rounded-full', statusColors[status as TaskStatus])} />
                  <span className="text-sm">{statusLabels[status as TaskStatus]}</span>
                </div>
                <span className="font-medium">{count}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Overdue & Due Soon */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Tasks Timeline</CardTitle>
          <Calendar className="h-4 w-4 text-yellow-500" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-muted-foreground">Overdue</span>
                <Badge variant={overdueTasks > 0 ? 'destructive' : 'outline'}>
                  {overdueTasks}
                </Badge>
              </div>
              <Progress
                value={Math.min((overdueTasks / totalTasks) * 100, 100)}
                className="h-2 bg-red-100 dark:bg-red-900/20"
                indicatorClassName="bg-red-500"
              />
            </div>
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-muted-foreground">Due This Week</span>
                <Badge variant={dueThisWeek > 0 ? 'warning' : 'outline'}>
                  {dueThisWeek}
                </Badge>
              </div>
              <Progress
                value={Math.min((dueThisWeek / totalTasks) * 100, 100)}
                className="h-2 bg-yellow-100 dark:bg-yellow-900/20"
                indicatorClassName="bg-yellow-500"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tasks by Assignee */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Tasks by Assignee</CardTitle>
          <Users className="h-4 w-4 text-purple-500" />
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {Object.entries(tasksByAssignee).map(([assigneeId, count]) => {
              // In a real app, you would fetch the assignee details
              const assigneeName = `User ${assigneeId.substring(0, 4)}`;
              return (
                <div key={assigneeId} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="h-8 w-8 rounded-full bg-purple-100 dark:bg-purple-900/50 flex items-center justify-center">
                      <span className="text-xs font-medium text-purple-600 dark:text-purple-300">
                        {assigneeName.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <span className="text-sm">{assigneeName}</span>
                  </div>
                  <span className="font-medium">{count}</span>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Status Distribution Chart */}
      <Card className="md:col-span-2">
        <CardHeader>
          <CardTitle>Status Distribution</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={statusData}>
                <XAxis
                  dataKey="name"
                  stroke="#888888"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  stroke="#888888"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(value) => `${value}`}
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      return (
                        <div className="rounded-lg border bg-background p-2 shadow-sm">
                          <div className="grid grid-cols-2 gap-2">
                            <div className="flex flex-col">
                              <span className="text-[0.70rem] uppercase text-muted-foreground">
                                Status
                              </span>
                              <span className="font-bold text-muted-foreground">
                                {payload[0].payload.name}
                              </span>
                            </div>
                            <div className="flex flex-col">
                              <span className="text-[0.70rem] uppercase text-muted-foreground">
                                Tasks
                              </span>
                              <span className="font-bold">{payload[0].value}</span>
                            </div>
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar
                  dataKey="value"
                  radius={[4, 4, 0, 0]}
                  className="fill-primary"
                >
                  {statusData.map((entry, index) => (
                    <rect
                      key={`bar-${index}`}
                      fill={`var(--color-${entry.color})`}
                      x={0}
                      y={0}
                      width="100%"
                      height="100%"
                      rx={4}
                      ry={4}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Timeline Chart */}
      <Card className="md:col-span-2">
        <CardHeader>
          <CardTitle>Tasks Timeline</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={timelineData}>
                <XAxis
                  dataKey="date"
                  stroke="#888888"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  stroke="#888888"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      return (
                        <div className="rounded-lg border bg-background p-2 shadow-sm">
                          <div className="grid grid-cols-2 gap-2">
                            <div className="flex flex-col">
                              <span className="text-[0.70rem] uppercase text-muted-foreground">
                                Date
                              </span>
                              <span className="font-bold text-muted-foreground">
                                {payload[0].payload.date}
                              </span>
                            </div>
                            <div className="flex flex-col">
                              <span className="text-[0.70rem] uppercase text-muted-foreground">
                                Tasks
                              </span>
                              <span className="font-bold">{payload[0].value}</span>
                            </div>
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar
                  dataKey="count"
                  radius={[4, 4, 0, 0]}
                  className="fill-primary"
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function cn(...classes: (string | undefined)[]) {
  return classes.filter(Boolean).join(' ');
}
