import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { requireAdmin } from "@/lib/auth/current-user";
import {
  getCloudflareSettings,
  publicCloudflareSettings,
  saveCloudflareSettings,
  saveCloudflareSettingsSchema,
} from "@/lib/cloudflare/settings";

export async function GET() {
  try {
    requireAdmin();
    const settings = await getCloudflareSettings();

    return NextResponse.json({
      data: publicCloudflareSettings(settings),
    });
  } catch (error) {
    return adminError(error);
  }
}

export async function PUT(request: Request) {
  try {
    requireAdmin();
    const body = await request.json();
    const input = saveCloudflareSettingsSchema.parse(body);
    const settings = await saveCloudflareSettings(input);

    return NextResponse.json({
      data: publicCloudflareSettings(settings),
    });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        {
          message: "表单校验失败",
          errors: error.flatten().fieldErrors,
        },
        { status: 422 },
      );
    }

    return adminError(error);
  }
}

function adminError(error: unknown) {
  return NextResponse.json(
    {
      message: error instanceof Error ? error.message : "操作失败",
    },
    { status: error instanceof Error && error.message === "仅管理员可操作" ? 403 : 400 },
  );
}
