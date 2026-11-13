import { orderRequestSchema } from "@/lib/schemas";
import { withAuditLog } from "@/server/audit-log";
import { errorResponse, parseJsonBody } from "@/server/http";
import { placeOrder } from "@/server/orders";

/** POST /api/orders — validates card details and places an order. */
export const POST = withAuditLog(async (request) => {
  const body = await parseJsonBody(request, orderRequestSchema);
  if (!body.ok) return body.response;

  const result = placeOrder(body.data);
  if (!result.ok) return errorResponse(result.error);

  return Response.json(result.order, { status: 201 });
});
