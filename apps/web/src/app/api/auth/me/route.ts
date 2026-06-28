import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth/current-user";

export async function GET() {
  return NextResponse.json({
    data: {
      user: await getCurrentUser(),
    },
  });
}
