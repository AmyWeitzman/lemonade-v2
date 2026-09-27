import { PrismaClient } from '@prisma/client';
import { seedVehicles }          from './seeds/vehicles';
import { seedHousing }           from './seeds/housing';
import { seedJobs }              from './seeds/jobs';
import { seedEducationPrograms } from './seeds/education';
import { seedActions }           from './seeds/actions';
import { seedCards }             from './seeds/cards';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding static game data...');
  await seedVehicles(prisma);
  await seedHousing(prisma);
  await seedEducationPrograms(prisma);
  await seedJobs(prisma);
  await seedActions(prisma);
  await seedCards(prisma);
  console.log('✅ Seeding complete.');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
