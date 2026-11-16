import { PrismaClient } from "@prisma/client";

const supabaseUrl = (process.env.DATABASE_URL ?? "");

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: supabaseUrl,
    },
  },
});

async function main() {
  try {
    const migrations: any = await prisma.$queryRawUnsafe(`
      SELECT id, migration_name, finished_at 
      FROM public._prisma_migrations 
      ORDER BY finished_at;
    `);
    console.log("Applied migrations:", migrations);
  } catch (error) {
    console.error("Error querying _prisma_migrations:", error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
