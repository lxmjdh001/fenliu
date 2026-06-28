import { NextResponse } from "next/server";

import { buildRouteSnapshot, buildServiceSnapshot } from "@/lib/services/snapshot";
import { getService, markPublished } from "@/lib/services/store";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const service = getService(id);

  if (!service) {
    return NextResponse.json({ message: "服务不存在" }, { status: 404 });
  }

  const routeSnapshot = buildRouteSnapshot(service);
  const serviceSnapshot = buildServiceSnapshot(service);
  const updated = markPublished(id);

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
