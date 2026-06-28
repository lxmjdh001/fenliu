import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { requireAdmin } from "@/lib/auth/current-user";
import { deleteRoutingDomain, updateRoutingDomain, updateRoutingDomainSchema } from "@/lib/domains/store";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireAdmin();
    const { id } = await params;
    const input = updateRoutingDomainSchema.parse(await request.json());
    const domain = await updateRoutingDomain(Number(id), input);

    return NextResponse.json({ data: domain });
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

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireAdmin();
    const { id } = await params;
    await deleteRoutingDomain(Number(id));

    return NextResponse.json({ data: { ok: true } });
  } catch (error) {
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
