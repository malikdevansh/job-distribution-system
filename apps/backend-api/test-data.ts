import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const user = await prisma.user.findFirst();
  if (!user) throw new Error("No user found");
  
  const org = await prisma.organization.findFirst({ where: { ownerId: user.id } });
  if (!org) throw new Error("No org found");

  const project = await prisma.project.findFirst({ where: { orgId: org.id } });
  if (!project) throw new Error("No project found");

  const queue = await prisma.queue.findFirst({ where: { projectId: project.id } });
  if (!queue) {
    console.log("No queue found. Creating one...");
    const newQueue = await prisma.queue.create({
      data: {
        name: 'default',
        projectId: project.id
      }
    });
    console.log("Created queue:", newQueue.id);
  } else {
    console.log("Found queue:", queue.id);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
