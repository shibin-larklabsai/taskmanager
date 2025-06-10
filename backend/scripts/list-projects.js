import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function listProjects() {
  try {
    const projects = await prisma.project.findMany({
      select: {
        id: true,
        name: true,
        description: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: {
        id: 'asc',
      },
    });

    console.log('Projects in database:');
    console.table(projects);
    
    return projects;
  } catch (error) {
    console.error('Error listing projects:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

listProjects();
