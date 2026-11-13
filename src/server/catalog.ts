import type { Product } from "@/lib/types";

/**
 * Product catalog. The store has a small, fixed range, so the catalog is kept
 * in code rather than in a database. Prices are in minor units (cents).
 */
const PRODUCTS: readonly Product[] = [
  {
    id: "house-blend-500g",
    name: "House Blend Beans, 500 g",
    description: "Our everyday medium roast. Cocoa, hazelnut and dried cherry.",
    unitPrice: 1490,
    emoji: "🫘",
  },
  {
    id: "ethiopia-yirgacheffe-250g",
    name: "Ethiopia Yirgacheffe, 250 g",
    description: "Light roast single origin with jasmine, bergamot and lemon.",
    unitPrice: 1650,
    emoji: "🌸",
  },
  {
    id: "ceramic-dripper",
    name: "Ceramic Pour-Over Dripper",
    description: "Hand-glazed size 02 dripper that brews one to three cups.",
    unitPrice: 2900,
    emoji: "🫗",
  },
  {
    id: "paper-filters-100",
    name: "Paper Filters, 100 pack",
    description: "Unbleached cone filters that fit size 02 drippers.",
    unitPrice: 650,
    emoji: "📄",
  },
  {
    id: "gooseneck-kettle",
    name: "Gooseneck Kettle, 1 L",
    description: "Stainless steel kettle with a precise pour spout.",
    unitPrice: 5900,
    emoji: "🫖",
  },
  {
    id: "stoneware-mug",
    name: "Stoneware Mug, 300 ml",
    description: "Speckled stoneware mug, dishwasher and microwave safe.",
    unitPrice: 1850,
    emoji: "☕",
  },
  {
    id: "coca-cola-330ml",
    name: "Coca-Cola, 330 ml",
    description: "Classic cola in a chilled can.",
    unitPrice: 250,
    emoji: "🥤",
  },
  {
    id: "fanta-330ml",
    name: "Fanta Orange, 330 ml",
    description: "Bright, fizzy orange soda in a can.",
    unitPrice: 250,
    emoji: "🍊",
  },
  {
    id: "root-beer-355ml",
    name: "Root Beer, 355 ml",
    description: "Creamy, sweet root beer with vanilla and wintergreen.",
    unitPrice: 290,
    emoji: "🍺",
  },
  {
    id: "beer-330ml",
    name: "Beer, 330 ml",
    description: "Crisp lager in a bottle.",
    unitPrice: 350,
    emoji: "🍻",
  },
];

const PRODUCTS_BY_ID = new Map(PRODUCTS.map((product) => [product.id, product]));

export function listProducts(): readonly Product[] {
  return PRODUCTS;
}

export function getProduct(productId: string): Product | undefined {
  return PRODUCTS_BY_ID.get(productId);
}
