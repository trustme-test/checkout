import type { Pool } from "pg";
import type { Product } from "@/lib/types";
import type { ProductRepository } from "./catalog";

type ProductRow = {
  id: string;
  name: string;
  description: string;
  unit_price: number;
  emoji: string;
};

const toProduct = (row: ProductRow): Product => ({
  id: row.id,
  name: row.name,
  description: row.description,
  unitPrice: row.unit_price,
  emoji: row.emoji,
});

/** Product catalog stored in a Postgres `products` table. Prices are integer cents. */
export class PostgresProductRepository implements ProductRepository {
  constructor(private readonly pool: Pool) {}

  /** Creates the `products` table if needed and inserts any missing products. */
  async migrate(seed: readonly Product[]): Promise<void> {
    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS products (
        id          TEXT PRIMARY KEY,
        name        TEXT NOT NULL,
        description TEXT NOT NULL,
        unit_price  INTEGER NOT NULL CHECK (unit_price >= 0),
        emoji       TEXT NOT NULL,
        position    SERIAL
      )`);
    for (const p of seed) {
      await this.pool.query(
        `INSERT INTO products (id, name, description, unit_price, emoji)
         VALUES ($1, $2, $3, $4, $5) ON CONFLICT (id) DO NOTHING`,
        [p.id, p.name, p.description, p.unitPrice, p.emoji],
      );
    }
  }

  async list(): Promise<readonly Product[]> {
    const { rows } = await this.pool.query<ProductRow>(
      "SELECT id, name, description, unit_price, emoji FROM products ORDER BY position",
    );
    return rows.map(toProduct);
  }

  async get(productId: string): Promise<Product | undefined> {
    const { rows } = await this.pool.query<ProductRow>(
      "SELECT id, name, description, unit_price, emoji FROM products WHERE id = $1",
      [productId],
    );
    return rows[0] ? toProduct(rows[0]) : undefined;
  }
}
