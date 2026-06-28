import { NextResponse } from "next/server";

import { requireUser } from "@/lib/auth/current-user";
import { buildRouteSnapshot, buildServiceSnapshot } from "@/lib/services/snapshot";
import { getService, markPublished } from "@/lib/services/store";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const user = await requireUser();
  const service = await getService(id, user);

  if (!service) {
    return NextResponse.json({ message: "服务不存在" }, { status: 404 });
  }

  const routeSnapshot = buildRouteSnapshot(service);
  const serviceSnapshot = buildServiceSnapshot(service);
  const updated = await markPublished(id, {
    route: routeSnapshot,
    service: serviceSnapshot,
  });

  return NextResponse.json({
    data: {
      service: updated,
      kvWrites: [
        {
          key: `route:${service.shortCode}`,
          value: routeSnapshot,
        },
        {
          key: `service:${service.platform}:${service.shortCode}`,
          value: serviceSnapshot,
        },
      ],
    },
  });
}
