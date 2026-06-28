import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { requireUser } from "@/lib/auth/current-user";
import { createService, createServiceSchema, listServiceRows } from "@/lib/services/store";

export async function GET() {
  const user = await requireUser();

  return NextResponse.json({
    data: await listServiceRows(user),
  });
}

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const body = await request.json();
    const input = createServiceSchema.parse(body);
    const service = await createService(input, user);

    return NextResponse.json(
      {
        data: service,
      },
      { status: 201 },
    );
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

    return NextResponse.json(
      {
        message: error instanceof Error ? error.message : "创建服务失败",
      },
      { status: 400 },
    );
  }
}
