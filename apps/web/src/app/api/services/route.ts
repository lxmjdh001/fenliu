import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { createService, createServiceSchema, listServiceRows } from "@/lib/services/store";

export async function GET() {
  return NextResponse.json({
    data: listServiceRows(),
  });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const input = createServiceSchema.parse(body);
    const service = createService(input);

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
