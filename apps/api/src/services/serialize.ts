import type { Category, Product, ProductImage } from '@prisma/client';

export const productInclude = {
  category: true,
  images: { orderBy: { sortOrder: 'asc' as const } },
};

type FullProduct = Product & { category: Category; images: ProductImage[] };

export function discountPercent(p: Pick<Product, 'pricePaise' | 'compareAtPaise'>) {
  if (!p.compareAtPaise || p.compareAtPaise <= p.pricePaise) return 0;
  return Math.round(((p.compareAtPaise - p.pricePaise) / p.compareAtPaise) * 100);
}

export function stockStatus(stock: number) {
  if (stock <= 0) return 'out_of_stock' as const;
  if (stock <= 2) return 'low_stock' as const;
  return 'in_stock' as const;
}

/** Public card representation for listings. */
export function productCard(p: FullProduct) {
  return {
    id: p.id,
    slug: p.slug,
    sku: p.sku,
    name: p.name,
    shortDescription: p.shortDescription,
    pricePaise: p.pricePaise,
    compareAtPaise: p.compareAtPaise && p.compareAtPaise > p.pricePaise ? p.compareAtPaise : null,
    discountPercent: discountPercent(p),
    stock: p.stock,
    stockStatus: stockStatus(p.stock),
    isFeatured: p.isFeatured,
    period: p.period,
    origin: p.origin,
    provenanceType: p.provenanceType,
    category: { id: p.category.id, slug: p.category.slug, name: p.category.name },
    image: p.images[0] ? { url: p.images[0].url, alt: p.images[0].alt } : null,
    hoverImage: p.images[1] ? { url: p.images[1].url, alt: p.images[1].alt } : null,
    createdAt: p.createdAt,
  };
}

export function productDetail(p: FullProduct) {
  return {
    ...productCard(p),
    description: p.description,
    materials: p.materials,
    dimensions: p.dimensions,
    provenance: p.provenance,
    condition: p.condition,
    imageCredit: p.imageCredit,
    images: p.images.map((i) => ({ id: i.id, url: i.url, alt: i.alt })),
  };
}

export function adminProduct(p: FullProduct & { _count?: { orderItems: number } }) {
  return {
    ...productDetail(p),
    status: p.status,
    isCuratorPick: p.isCuratorPick,
    popularity: p.popularity,
    categoryId: p.categoryId,
    publishedAt: p.publishedAt,
    updatedAt: p.updatedAt,
    images: p.images.map((i) => ({ id: i.id, url: i.url, alt: i.alt, sortOrder: i.sortOrder })),
  };
}
