import { NextResponse } from "next/server";
import { isAuthError, requireStaffApi } from "@/lib/api/admin-auth";
import { getGameWorkerStatus, toggleGameWorker, processPendingGameWorkerQueue } from "@/lib/game-automation/game-worker-engine";

export async function GET() {
  const auth = await requireStaffApi("requests.manage");
  if (isAuthError(auth)) return auth;
  const status = getGameWorkerStatus();
  return NextResponse.json(status);
}

export async function POST(req: Request) {
  const auth = await requireStaffApi("requests.manage");
  if (isAuthError(auth)) return auth;

  try {
    const { action, enable } = await req.json();

    if (action === "toggle") {
      const status = toggleGameWorker(enable);
      return NextResponse.json({ ok: true, status });
    }

    if (action === "process") {
      const result = await processPendingGameWorkerQueue();
      return NextResponse.json(result);
    }

    return NextResponse.json({ ok: true, status: getGameWorkerStatus() });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}
