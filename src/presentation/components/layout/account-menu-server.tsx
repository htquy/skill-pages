import { getCurrentUser } from "@/src/infrastructure/authentication/authorization";
import { AccountMenu } from "@/src/presentation/components/layout/account-menu";

export async function AccountMenuServer() {
  const user = await getCurrentUser();
  return <AccountMenu user={user} />;
}