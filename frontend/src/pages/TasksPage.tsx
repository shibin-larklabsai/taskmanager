import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, Trash2, Check, Edit2 } from 'lucide-react';

interface Task {
  id: string;
  title: string;
  completed: boolean;
}

const TasksPage: React.FC = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editTaskTitle, setEditTaskTitle] = useState('');
  const navigate = useNavigate();

  const addTask = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;
    
    const newTask: Task = {
      id: Date.now().toString(),
      title: newTaskTitle.trim(),
      completed: false,
    };
    
    setTasks([...tasks, newTask]);
    setNewTaskTitle('');
  };

  const toggleTask = (taskId: string) => {
    setTasks(tasks.map(task => 
      task.id === taskId ? { ...task, completed: !task.completed } : task
    ));
  };

  const deleteTask = (taskId: string) => {
    setTasks(tasks.filter(task => task.id !== taskId));
  };

  const startEditing = (task: Task) => {
    setEditingTaskId(task.id);
    setEditTaskTitle(task.title);
  };

  const saveEdit = (taskId: string) => {
    if (!editTaskTitle.trim()) return;
    
    setTasks(tasks.map(task => 
      task.id === taskId 
        ? { ...task, title: editTaskTitle.trim() } 
        : task
    ));
    
    setEditingTaskId(null);
    setEditTaskTitle('');
  };

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">My Tasks</h1>
        <Button 
          variant="outline" 
          onClick={() => navigate('/')}
          className="text-sm"
        >
          Back to Home
        </Button>
      </div>
      
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Add New Task</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={(e: React.FormEvent<HTMLFormElement>) => addTask(e)} className="flex gap-2">
            <Input
              type="text"
              value={newTaskTitle}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => 
                setNewTaskTitle((e.target as HTMLInputElement).value)
              }
              placeholder="Enter task title..."
              className="flex-1"
            />
            <Button type="submit" size="icon">
              <Plus className="h-4 w-4" />
            </Button>
          </form>
        </CardContent>
      </Card>

      <div className="space-y-4">
        {tasks.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No tasks yet. Add one above!
          </div>
        ) : (
          tasks.map((task) => (
            <Card key={task.id} className="group">
              <CardContent className="p-4 flex items-center">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className={`mr-2 ${task.completed ? 'text-green-500' : 'text-muted-foreground'}`}
                  onClick={() => toggleTask(task.id)}
                >
                  <Check className="h-5 w-5" />
                </Button>
                
                {editingTaskId === task.id ? (
                  <div className="flex-1 flex gap-2">
                    <Input
                      value={editTaskTitle}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => 
                        setEditTaskTitle(e.currentTarget.value)
                      }
                      className="flex-1"
                      autoFocus
                    />
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => saveEdit(task.id)}
                    >
                      Save
                    </Button>
                  </div>
                ) : (
                  <div 
                    className={`flex-1 ${task.completed ? 'line-through text-muted-foreground' : ''}`}
                    onClick={() => startEditing(task)}
                  >
                    {task.title}
                  </div>
                )}
                
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-8 w-8"
                    onClick={() => startEditing(task)}
                  >
                    <Edit2 className="h-4 w-4" />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-8 w-8 text-destructive hover:text-destructive"
                    onClick={() => deleteTask(task.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};

export default TasksPage;
