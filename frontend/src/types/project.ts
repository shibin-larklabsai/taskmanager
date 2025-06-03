export type ProjectMember = {
  id: number;
  name: string;
  email: string;
  role: string;
};

export type Project = {
  id: number;
  name: string;
  description?: string;
  status: string;
  startDate?: string;
  endDate?: string;
  role: string;
  createdAt: string;
  updatedAt: string;
  members?: ProjectMember[];
};
