import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/auth/current-user";
import { listUsers } from "@/lib/auth/store";

export async function GET() {
  try {
    await requireAdmin();

    return NextResponse.json({
      data: await listUsers(),
    });
  } catch (error) {
    return NextResponse.json(
      {
        message: error instanceof Error ? error.message : "操作失败",
      },
      { status: 403 },
    );
  }
}
