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
  console.log("Connecting to Supabase...");
  try {
    const schemas: any = await prisma.$queryRawUnsafe(`
      SELECT schema_name 
      FROM information_schema.schemata 
      WHERE schema_name NOT IN ('pg_catalog', 'information_schema', 'pg_toast')
      ORDER BY schema_name;
    `);
    console.log("Existing Schemas:", JSON.stringify(schemas, null, 2));

    const tables: any = await prisma.$queryRawUnsafe(`
      SELECT table_schema, table_name 
      FROM information_schema.tables 
      WHERE table_schema NOT IN ('pg_catalog', 'information_schema', 'pg_toast')
      ORDER BY table_schema, table_name;
    `);
    console.log("Existing Tables count:", tables.length);
    console.log("Existing Tables:", JSON.stringify(tables, null, 2));

    const enums: any = await prisma.$queryRawUnsafe(`
      SELECT n.nspname as enum_schema, t.typname as enum_name
      FROM pg_type t 
      JOIN pg_enum e ON t.oid = e.enumtypid 
      JOIN pg_namespace n ON n.oid = t.typnamespace
      GROUP BY n.nspname, t.typname
      ORDER BY n.nspname, t.typname;
    `);
    console.log("Existing Enums:", JSON.stringify(enums, null, 2));

  } catch (error) {
    console.error("Error connecting to Supabase:", error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
