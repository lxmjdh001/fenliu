import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { requireAdmin } from "@/lib/auth/current-user";
import { createRoutingDomain, listRoutingDomains, routingDomainSchema } from "@/lib/domains/store";

export async function GET() {
  try {
    await requireAdmin();

    return NextResponse.json({
      data: await listRoutingDomains(),
    });
  } catch (error) {
    return adminError(error);
  }
}

export async function POST(request: Request) {
  try {
    await requireAdmin();
    const input = routingDomainSchema.parse(await request.json());
    const domain = await createRoutingDomain(input);

    return NextResponse.json({ data: domain }, { status: 201 });
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
