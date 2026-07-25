import { getUserDepositsData } from "@/lib/data/dashboard";
import { DepositsPageClient } from "@/components/dashboard/deposits-page-client";

export const dynamic = "force-dynamic";

export default async function UserDepositsPage() {
  const initialDeposits = await getUserDepositsData();
  return <DepositsPageClient initialDeposits={initialDeposits} />;
}
