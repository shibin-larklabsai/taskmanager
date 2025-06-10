import { Link, useNavigate, NavLink } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useEffect, useState } from 'react';
import { Bell, MessageSquare, Clock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { formatDistanceToNow } from 'date-fns';
import { getProjectComments } from '@/services/comment.service';
import { getProjects } from '@/services/project.service';
import { Skeleton } from '@/components/ui/skeleton'; // Assuming you have a Skeleton component

export function MainNav() {
  const { user, logout } = useAuth();
  const [userRoles, setUserRoles] = useState({
    isAdmin: false,
    isProjectManager: false,
    isDeveloper: false,
    isTester: false
  });
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const [latestComment, setLatestComment] = useState<{
    content: string;
    createdAt: string;
    userName: string;
  } | null>(null);
  const [isLoadingComment, setIsLoadingComment] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (user?.roles) {
      setUserRoles({
        isAdmin: user.roles.some((role: string | { name: string }) => 
          typeof role === 'string' ? role === 'admin' : role.name === 'admin'
        ),
        isProjectManager: user.roles.some((role: string | { name: string }) => 
          typeof role === 'string' ? role === 'project_manager' : role.name === 'project_manager'
        ),
        isDeveloper: user.roles.some((role: string | { name: string }) => 
          typeof role === 'string' ? role === 'developer' : role.name === 'developer'
        ),
        isTester: user.roles.some((role: string | { name: string }) => 
          typeof role === 'string' ? role === 'tester' : role.name === 'tester'
        )
      });
    }
  }, [user]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // Fetch the latest comment from the user's projects
  const fetchLatestComment = async () => {
    if (!user?.id) return;
    
    setIsLoadingComment(true);
    try {
      // First, get the user's projects
      const projects = await getProjects(false); // Only get active projects
      
      if (projects && projects.length > 0) {
        // Get comments for all projects
        const allComments = [];
        
        // Get comments for each project
        for (const project of projects) {
          try {
            const comments = await getProjectComments(project.id);
            if (comments && comments.length > 0) {
              allComments.push(...comments);
            }
          } catch (error) {
            console.error(`Failed to fetch comments for project ${project.id}:`, error);
            // Continue with other projects if one fails
            continue;
          }
        }
        
        // If we have comments, find the latest one
        if (allComments.length > 0) {
          const sorted = [...allComments].sort((a, b) => 
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          );
          const latest = sorted[0];
          setLatestComment({
            content: latest.content,
            createdAt: latest.createdAt,
            userName: latest.user?.name || 'Unknown User'
          });
        } else {
          // No comments found in any project
          setLatestComment(null);
        }
      } else {
        // No projects found for user
        setLatestComment(null);
      }
    } catch (error) {
      console.error('Failed to fetch latest comment:', error);
      setLatestComment(null);
    } finally {
      setIsLoadingComment(false);
    }
  };

  useEffect(() => {
    if (isPopoverOpen) {
      fetchLatestComment();
    }
  }, [isPopoverOpen]);

  // Only show the notification badge if there are unread comments
  const hasUnreadComments = Boolean(latestComment);

  if (!user) return null;

  return (
    <header className="border-b">
      <div className="container mx-auto px-4 py-3 flex justify-between items-center">
        <div className="flex items-center space-x-6">
          <span className="text-lg font-semibold cursor-default">
            Task Manager
          </span>
          <nav className="hidden md:flex items-center space-x-4">
            {(userRoles.isAdmin || userRoles.isProjectManager || userRoles.isDeveloper || userRoles.isTester) && (
              <NavLink
                to={userRoles.isTester ? "/tester" : (userRoles.isDeveloper ? "/developer" : "/dashboard")}
                className={({ isActive }) => 
                  `text-sm font-medium ${isActive ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'} transition-colors`
                }
                onClick={(e) => {
                  // Prevent navigation if already on the target page
                  const targetPath = userRoles.isTester ? '/tester' : 
                                    (userRoles.isDeveloper ? '/developer' : '/dashboard');
                  if (window.location.pathname === targetPath) {
                    e.preventDefault();
                  }
                }}
              >
                Dashboard
              </NavLink>
            )}
            {userRoles.isAdmin && (
              <Link
                to="/admin"
                className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                Admin
              </Link>
            )}
            {userRoles.isProjectManager && (
              <Link
                to="/project-manager/projects"
                className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                Project Manager
              </Link>
            )}
          </nav>
        </div>
        <div className="flex items-center space-x-4">
          {(userRoles.isDeveloper || userRoles.isTester) && (
            <Popover open={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
              <PopoverTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="relative"
                  onClick={() => setIsPopoverOpen(!isPopoverOpen)}
                >
                  <Bell className="h-5 w-5" />
                  {hasUnreadComments && (
                    <Badge variant="secondary" className="absolute -top-1 -right-1 h-4 w-4 flex items-center justify-center p-0 text-xs">
                      !
                    </Badge>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80 p-4" align="end">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium leading-none">Latest Comment</h4>
                    <MessageSquare className="h-4 w-4 text-muted-foreground" />
                  </div>
                  {isLoadingComment ? (
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-4 w-3/4" />
                    </div>
                  ) : latestComment ? (
                    <>
                      <p className="text-sm text-muted-foreground">
                        {latestComment.content}
                      </p>
                      <div className="flex items-center pt-2 text-xs text-muted-foreground">
                        <Clock className="mr-1 h-3 w-3" />
                        <span>
                          {formatDistanceToNow(new Date(latestComment.createdAt), { addSuffix: true })}
                        </span>
                        <span className="mx-1">•</span>
                        <span>{latestComment.userName}</span>
                      </div>
                    </>
                  ) : (
                    <p className="text-sm text-muted-foreground">No comments found</p>
                  )}
                </div>
              </PopoverContent>
            </Popover>
          )}
          <span className="text-sm text-muted-foreground">
            {user.name} ({user.email})
          </span>
          <Button variant="outline" size="sm" onClick={handleLogout}>
            Logout
          </Button>
        </div>
      </div>
    </header>
  );
}
