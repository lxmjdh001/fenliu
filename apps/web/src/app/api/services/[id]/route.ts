import { NextResponse } from "next/server";

import { getService } from "@/lib/services/store";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const service = getService(id);

  if (!service) {
    return NextResponse.json({ message: "服务不存在" }, { status: 404 });
  }

  return NextResponse.json({ data: service });
}
