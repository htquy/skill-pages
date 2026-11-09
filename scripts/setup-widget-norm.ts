import { prisma } from "../src/infrastructure/database/prisma";
import { createOAuthService } from "../src/application/identity/oauth-service";
import { createAppsService } from "../src/application/apps/apps-service";
import { prismaOAuthRepository } from "../src/infrastructure/repositories/prisma-oauth-repository";
import { prismaUserRepository } from "../src/infrastructure/repositories/prisma-user-repository";
import { prismaAppRepository } from "../src/infrastructure/repositories/prisma-app-repository";

async function main() {
  const origin = new URL(
    process.env.WIDGET_NORM_BASE_URL || "http://localhost:3001",
  ).origin;
  if (!process.argv.includes("--apply")) {
    console.log(
      "Dry run: register widget-norm PKCE client and AVI apps. Callback: " +
        origin +
        "/api/auth/hub/callback. Add --apply to write.",
    );
    return;
  }
  const oauth = createOAuthService({
    oauth: prismaOAuthRepository,
    users: prismaUserRepository,
  });
  const scopes = ["openid", "profile", "email", "orders:read", "orders:write"];
  const callback = origin + "/api/auth/hub/callback";
  const current = await oauth.findClient("widget-norm");
  if (!current)
    await oauth.registerClient({
      clientId: "widget-norm",
      name: "Widget Norm",
      redirectUris: [callback],
      scopes,
      isPublic: true,
    });
  else {
    if (!current.isPublic || !current.isActive)
      throw new Error(
        "Existing widget-norm client requires admin review; it was not changed.",
      );
    await prisma.oAuthClient.update({
      where: { clientId: "widget-norm" },
      data: {
        redirectUris: [...new Set([...current.redirectUris, callback])],
        scopes: [...new Set([...current.scopes, ...scopes])],
      },
    });
  }
  const apps = createAppsService({
    apps: prismaAppRepository,
    users: prismaUserRepository,
  });
  for (const spec of [
    { slug: "avi", name: "AVI", amount: 199000 },
    { slug: "avi-tile", name: "AVI Gạch", amount: 499000 },
  ]) {
    let app = await prismaAppRepository.findAppBySlug(spec.slug);
    if (!app)
      app = await apps.adminCreateApp({
        slug: spec.slug,
        name: spec.name,
        type: "EMBED_WIDGET",
        description: "Chatbot Widget Norm",
      });
    const { plans } = await apps.getApp(spec.slug);
    if (
      !plans.some((plan) =>
        plan.prices.some(
          (price) =>
            price.isActive && price.months === 1 && price.currency === "VND",
        ),
      )
    )
      await apps.adminCreatePlan({
        appId: app.id,
        name: "Cơ bản",
        description: "Đầy đủ tiện ích, một chatbot",
        prices: [{ months: 1, amount: spec.amount, currency: "VND" }],
      });
    console.log("Ready: " + spec.slug);
  }
  console.log(
    "Ready: shared authentication.User SSO, widget-norm OAuth client; no separate user/password table created.",
  );
}
main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : "Setup failed");
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
