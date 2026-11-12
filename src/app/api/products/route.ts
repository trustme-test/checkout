import { listProducts } from "@/server/catalog";

/** GET /api/products — the product catalog. Prerendered at build time. */
export async function GET() {
  return Response.json({ products: listProducts() });
}
