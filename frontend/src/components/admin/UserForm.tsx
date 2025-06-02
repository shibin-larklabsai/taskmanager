import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

// Role definitions in specified order: Admin, Manager, Developer, Tester, User
const ROLES = [
  { id: 1, name: 'ADMIN', displayName: 'Admin' },
  { id: 3, name: 'PROJECT_MANAGER', displayName: 'Project Manager' },
  { id: 4, name: 'DEVELOPER', displayName: 'Developer' },
  { id: 5, name: 'TESTER', displayName: 'Tester' },
  { id: 2, name: 'USER', displayName: 'Standard User' }
];

// Default role ID for USER (USER role ID)
const DEFAULT_ROLE_ID = 2;

interface UserFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: { name: string; email: string; password?: string; roleIds: number[] }) => Promise<void>;
  initialData?: {
    id?: number;
    name: string;
    email: string;
    roles: string[];
  };
  isSubmitting: boolean;
  isLoading?: boolean;
}

export function UserForm({ 
  open, 
  onOpenChange, 
  onSubmit, 
  initialData, 
  isSubmitting 
}: UserFormProps) {
  const [name, setName] = useState(initialData?.name || '');
  const [email, setEmail] = useState(initialData?.email || '');
  const [password, setPassword] = useState('');
  const [selectedRoleId, setSelectedRoleId] = useState<number>(DEFAULT_ROLE_ID);

  // Initialize form with initial data when it changes
  useEffect(() => {
    if (initialData) {
      setName(initialData.name);
      setEmail(initialData.email);
      
      // Set the role for existing users
      if (initialData.roles && initialData.roles.length > 0) {
        const roleName = Array.isArray(initialData.roles) 
          ? initialData.roles[0] 
          : initialData.roles;
        const role = ROLES.find(r => 
          r.name === roleName || r.name.toLowerCase() === String(roleName).toLowerCase()
        );
        if (role) {
          setSelectedRoleId(role.id);
        }
      }
    } else {
      // Reset form for new user
      setName('');
      setEmail('');
      setPassword('');
      setSelectedRoleId(DEFAULT_ROLE_ID);
    }
  }, [initialData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name || !email || (!initialData && !password)) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      await onSubmit({
        name,
        email,
        ...(password ? { password } : {}),
        roleIds: [selectedRoleId],
      });
    } catch (error) {
      console.error('Error submitting form:', error);
      toast.error('Failed to save user. Please try again.');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{initialData ? 'Edit User' : 'Add New User'}</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="name" className="text-right">
                Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="col-span-3"
                disabled={isSubmitting}
              />
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="email" className="text-right">
                Email <span className="text-red-500">*</span>
              </Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="col-span-3"
                disabled={isSubmitting || !!initialData}
              />
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="password" className="text-right">
                {initialData ? 'New Password' : 'Password'} {!initialData && <span className="text-red-500">*</span>}
              </Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="col-span-3"
                disabled={isSubmitting}
                placeholder={initialData ? 'Leave blank to keep current password' : ''}
              />
            </div>
            
            {initialData && (
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="role" className="text-right">
                  Role <span className="text-red-500">*</span>
                </Label>
                <div className="col-span-3">
                  <select
                    id="role"
                    value={selectedRoleId}
                    onChange={(e) => setSelectedRoleId(Number(e.target.value))}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    disabled={isSubmitting}
                  >
                    {ROLES.map((role) => (
                      <option key={role.id} value={role.id}>
                        {role.displayName}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}
            {!initialData && (
              <input type="hidden" value={selectedRoleId} name="roleIds" />
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save User'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
