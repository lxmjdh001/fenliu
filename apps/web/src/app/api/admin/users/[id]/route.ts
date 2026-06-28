import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { requireAdmin } from "@/lib/auth/current-user";
import { updateUser, updateUserSchema } from "@/lib/auth/store";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireAdmin();
    const { id } = await params;
    const input = updateUserSchema.parse(await request.json());
    const user = await updateUser(Number(id), input);

    return NextResponse.json({ data: user });
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
        message: error instanceof Error ? error.message : "操作失败",
      },
      { status: 400 },
    );
  }
}
