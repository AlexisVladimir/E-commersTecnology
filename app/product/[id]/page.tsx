import { notFound } from 'next/navigation';
import ProductDetail from './ProductDetail';
import { API_BASE } from '@/lib/api';
import type { Product } from '@/types';

export default async function ProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const productResponse = await fetch(`${API_BASE}/catalog/products/${id}/`, {
    cache: 'no-store',
  });

  if (!productResponse.ok) {
    notFound();
  }

  const productData = (await productResponse.json()) as { item: Product };
  const product = productData.item;

  if (!product) {
    notFound();
  }

  const relatedResponse = await fetch(
    `${API_BASE}/catalog/products/?category=${encodeURIComponent(product.category)}&pageSize=8`,
    { cache: 'no-store' }
  );
  const relatedData = (await relatedResponse.json()) as { items: Product[] };
  const relatedProducts = relatedData.items.filter((p) => p.id !== product.id).slice(0, 4);

  return <ProductDetail product={product} relatedProducts={relatedProducts} />;
}
