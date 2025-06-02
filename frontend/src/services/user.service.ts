export interface User {
  id: number;
  name: string;
  email: string;
  avatar?: string;
  role?: string;
  createdAt?: string;
  updatedAt?: string;
}

export const getUserById = async (id: number): Promise<User> => {
  // Since the users endpoint is not available, return a default user
  // In a real app, you would make an actual API call here
  return {
    id,
    name: 'Project Owner',
    email: `user-${id}@example.com`,
    role: 'Project Manager',
  };
};

// Mock current user for development
export const getCurrentUser = (): User | null => {
  return {
    id: 1,
    name: 'John Doe',
    email: 'john.doe@example.com',
    role: 'Project Manager'
  };
};
