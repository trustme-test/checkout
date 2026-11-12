import { BasketSummary } from "@/components/basket-summary";
import { ProductCard } from "@/components/product-card";
import { listProducts } from "@/server/catalog";

export default function ShopPage() {
  const products = listProducts();

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_20rem]">
      <section aria-labelledby="shop-heading">
        <h1 id="shop-heading" className="text-2xl font-bold tracking-tight">
          Shop
        </h1>
        <p className="mt-1 text-stone-600">Freshly roasted coffee and the gear to brew it well.</p>
        <ul className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {products.map((product) => (
            <li key={product.id}>
              <ProductCard product={product} />
            </li>
          ))}
        </ul>
      </section>
      <BasketSummary products={products} />
    </div>
  );
}
