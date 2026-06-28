import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { sessionCookieName } from "@/lib/auth/current-user";
import { loginUser } from "@/lib/auth/store";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { user, session } = await loginUser(body);
    const cookieStore = await cookies();

    cookieStore.set(sessionCookieName, session.token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      expires: new Date(session.expiresAt),
    });

    return NextResponse.json({ data: { user } });
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
        message: error instanceof Error ? error.message : "登录失败",
      },
      { status: 400 },
    );
  }
}
