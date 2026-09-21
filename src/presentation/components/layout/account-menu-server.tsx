import { getCurrentUser } from "@/src/infrastructure/authentication/authorization";
import { AccountMenu } from "@/src/presentation/components/layout/account-menu";
import { getDictionary } from "@/src/lib/i18n";

export async function AccountMenuServer() {
  const [user, dict] = await Promise.all([getCurrentUser(), getDictionary()]);
  return <AccountMenu user={user} dict={dict} />;
}