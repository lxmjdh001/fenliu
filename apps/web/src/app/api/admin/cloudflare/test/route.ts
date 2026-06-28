import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/auth/current-user";
import { testCloudflareConnection } from "@/lib/cloudflare/settings";

export async function POST(request: Request) {
  try {
    requireAdmin();
    const body = await request.json().catch(() => ({}));
    const accounts = await testCloudflareConnection(body.apiToken);

    return NextResponse.json({
      data: {
        accounts,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        message: error instanceof Error ? error.message : "Cloudflare 测试失败",
      },
      { status: 400 },
    );
  }
}
