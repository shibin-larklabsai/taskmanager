import api from '@/lib/api';

export interface Comment {
  id: number;
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
}

export const createComment = async (projectId: number, content: string): Promise<Comment> => {
  const response = await api.post('/comments', { content, projectId });
  return response.data.data;
};

export const getProjectComments = async (projectId: number): Promise<Comment[]> => {
  const response = await api.get(`/comments/project/${projectId}`);
  return response.data.data;
};

export const deleteComment = async (commentId: number): Promise<void> => {
  await api.delete(`/comments/${commentId}`);
};
