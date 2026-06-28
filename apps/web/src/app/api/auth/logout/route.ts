import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { sessionCookieName } from "@/lib/auth/current-user";
import { deleteSession } from "@/lib/auth/store";

export async function POST() {
  const cookieStore = await cookies();
  const token = cookieStore.get(sessionCookieName)?.value;

  await deleteSession(token);
  cookieStore.delete(sessionCookieName);

  return NextResponse.json({ data: { ok: true } });
}
