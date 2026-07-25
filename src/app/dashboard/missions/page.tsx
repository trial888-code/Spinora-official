import { redirect } from "next/navigation";

/** Missions live in the lobby — keep old URLs working. */
export default function DashboardMissionsRedirect() {
  redirect("/#missions");
}
