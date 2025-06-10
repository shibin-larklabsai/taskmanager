import api from '@/lib/api';

export interface Comment {
  id: number | string; // Allow string for temporary IDs
  content: string;
  projectId: number;
  userId: number;
  user: {
    id: number;
    name: string;
    email: string;
  };
  createdAt: string;
  updatedAt: string;
  isOptimistic?: boolean; // Flag for optimistic updates
}

export const createComment = async (projectId: number, content: string): Promise<Comment> => {
  const response = await api.post('/comments', { content, projectId });
  return response.data.data;
};

export const getProjectComments = async (projectId: number): Promise<Comment[]> => {
  const response = await api.get(`/comments/project/${projectId}`);
  return response.data.data;
};

export const getProjectsComments = async (projectIds: number[]): Promise<Record<number, Comment[]>> => {
  if (!projectIds.length) return {};
  
  // Convert to comma-separated string of IDs
  const ids = projectIds.join(',');
  const response = await api.get(`/comments/projects?ids=${ids}`);
  
  // Transform the array into a record with projectId as key
  const commentsByProject: Record<number, Comment[]> = {};
  response.data.data.forEach((comment: Comment) => {
    if (!commentsByProject[comment.projectId]) {
      commentsByProject[comment.projectId] = [];
    }
    commentsByProject[comment.projectId].push(comment);
  });
  
  return commentsByProject;
};

export const deleteComment = async (commentId: number): Promise<void> => {
  await api.delete(`/comments/${commentId}`);
};

export const updateComment = async (commentId: number, content: string): Promise<Comment> => {
  const response = await api.put(`/comments/${commentId}`, { content });
  return response.data.data;
};
