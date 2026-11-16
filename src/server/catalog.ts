import type { Product } from "@/lib/types";
import { SEED_PRODUCTS } from "./catalog-seed";

/** Storage for the product catalog. */
export interface ProductRepository {
  list(): Promise<readonly Product[]>;
  get(productId: string): Promise<Product | undefined>;
}

/**
 * Mocked in-memory database: a map of products by id. It is read-only after
 * construction, so every serverless instance behaves the same.
 */
export class InMemoryProductRepository implements ProductRepository {
  private readonly products: ReadonlyMap<string, Product>;

  constructor(products: readonly Product[]) {
    this.products = new Map(products.map((product) => [product.id, product]));
  }

  async list(): Promise<readonly Product[]> {
    return [...this.products.values()];
  }

  async get(productId: string): Promise<Product | undefined> {
    return this.products.get(productId);
  }
}

/** The repository used by the deployed app. */
export const defaultProductRepository: ProductRepository = new InMemoryProductRepository(
  SEED_PRODUCTS,
);

export function listProducts(): Promise<readonly Product[]> {
  return defaultProductRepository.list();
}

export function getProduct(productId: string): Promise<Product | undefined> {
  return defaultProductRepository.get(productId);
}
