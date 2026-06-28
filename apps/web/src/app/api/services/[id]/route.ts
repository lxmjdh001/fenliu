import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { requireUser } from "@/lib/auth/current-user";
import { deleteService, getService, updateService, updateServiceSchema } from "@/lib/services/store";

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

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const user = await requireUser();
    const input = updateServiceSchema.parse(await request.json());
    const service = await updateService(id, input, user);

    if (!service) {
      return NextResponse.json({ message: "服务不存在" }, { status: 404 });
    }

    return NextResponse.json({ data: service });
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
        message: error instanceof Error ? error.message : "更新服务失败",
      },
      { status: 400 },
    );
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const user = await requireUser();
  const deleted = await deleteService(id, user);

  if (!deleted) {
    return NextResponse.json({ message: "服务不存在" }, { status: 404 });
  }

  return NextResponse.json({ data: { ok: true } });
}
