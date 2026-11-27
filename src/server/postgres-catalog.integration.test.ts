import { PostgreSqlContainer, type StartedPostgreSqlContainer } from "@testcontainers/postgresql";
import { Pool } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { SEED_PRODUCTS } from "./catalog-seed";
import { placeOrder } from "./orders";
import { PostgresProductRepository } from "./postgres-catalog";
import { createQuote } from "./pricing";
import { validCardInput } from "@/test/fixtures";

// Needs a running Docker daemon. Run with `npm run test:integration`.
describe("PostgresProductRepository (Postgres in a container)", () => {
  let container: StartedPostgreSqlContainer;
  let pool: Pool;
  let repository: PostgresProductRepository;

  beforeAll(async () => {
    container = await new PostgreSqlContainer("postgres:17-alpine").start();
    pool = new Pool({ connectionString: container.getConnectionUri() });
    repository = new PostgresProductRepository(pool);
    await repository.migrate(SEED_PRODUCTS);
    await repository.migrate(SEED_PRODUCTS); // idempotent
  }, 120_000);

  afterAll(async () => {
    await pool?.end();
    await container?.stop();
  });

  it("lists every product in catalog order", async () => {
    expect(await repository.list()).toEqual(SEED_PRODUCTS);
  });

  it("gets a product by id", async () => {
    expect(await repository.get("gooseneck-kettle")).toEqual(
      SEED_PRODUCTS.find((p) => p.id === "gooseneck-kettle"),
    );
  });

  it("returns undefined for an unknown product", async () => {
    expect(await repository.get("espresso-machine")).toBeUndefined();
  });

  it("prices a basket from the database", async () => {
    const result = await createQuote([{ productId: "house-blend-500g", quantity: 2 }], repository);
    expect(result).toMatchObject({ ok: true, quote: { total: 2980 } });
  });

  it("places an order against the database catalog", async () => {
    const result = await placeOrder(
      {
        items: [{ productId: "ceramic-dripper", quantity: 1 }],
        card: validCardInput({ expiry: "12/27" }),
        expectedTotal: 3625,
      },
      { now: new Date("2026-06-15T12:00:00Z"), catalog: repository },
    );
    expect(result.ok).toBe(true);
  });
});
