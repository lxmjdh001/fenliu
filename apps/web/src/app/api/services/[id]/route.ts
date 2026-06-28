import { NextResponse } from "next/server";

import { requireUser } from "@/lib/auth/current-user";
import { getService } from "@/lib/services/store";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const user = await requireUser();
  const service = await getService(id, user);

  if (!service) {
    return NextResponse.json({ message: "服务不存在" }, { status: 404 });
  }

  return NextResponse.json({ data: service });
}
