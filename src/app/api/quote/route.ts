import { quoteRequestSchema } from "@/lib/schemas";
import { withAuditLog } from "@/server/audit-log";
import { errorResponse, parseJsonBody } from "@/server/http";
import { createQuote } from "@/server/pricing";

/** POST /api/quote — prices a basket. Used by the checkout page to show the total. */
export const POST = withAuditLog(async (request) => {
  const body = await parseJsonBody(request, quoteRequestSchema);
  if (!body.ok) return body.response;

  const result = createQuote(body.data.items);
  if (!result.ok) return errorResponse(result.error);

  return Response.json(result.quote);
});
