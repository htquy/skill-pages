import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const client = await prisma.oAuthClient.findUnique({ where: { clientId: "video-tool-desktop" } });
  console.log("OAuth client video-tool-desktop:", client ? { id: client.id, name: client.name, isPublic: client.isPublic, isActive: client.isActive, redirectUris: client.redirectUris, scopes: client.scopes } : "NOT FOUND");

  const app = await prisma.app.findUnique({ where: { slug: "video-tool" } });
  console.log("App video-tool:", app ? { id: app.id, slug: app.slug, name: app.name, type: app.type } : "NOT FOUND");

  if (app) {
    const menus = await prisma.appMenuItem.count({ where: { appId: app.id } });
    const plans = await prisma.subscriptionPlan.count({ where: { appId: app.id } });
    const subs = await prisma.userSubscription.count({ where: { appId: app.id } });
    const features = await prisma.planFeature.count({ where: { plan: { appId: app.id } } });
    console.log(`App stats -> menus: ${menus}, plans: ${plans}, subscriptions: ${subs}, planFeatures: ${features}`);
  }
}

main().finally(() => prisma.$disconnect());