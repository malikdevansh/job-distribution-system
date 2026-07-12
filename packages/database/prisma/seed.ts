import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const org = await prisma.organization.create({
    data: {
      name: 'Test Organization',
    },
  });

  const project = await prisma.project.create({
    data: {
      id: '11111111-1111-4111-8111-111111111111',
      orgId: org.id,
      name: 'Test Project',
    },
  });

  console.log('Seeded organization and project:', { org, project });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
