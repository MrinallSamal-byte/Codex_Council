import { NextResponse } from "next/server";

import { requireSession } from "@/server/auth/require-session";
import { fetchOrders } from "@/server/services/orders.service";

export async function GET(request: Request) {
  const session = await requireSession(request);
  const orders = await fetchOrders({
    tenantId: session.tenantId,
  });

  return NextResponse.json({ orders });
}
