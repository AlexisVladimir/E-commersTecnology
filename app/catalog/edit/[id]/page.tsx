'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useStore } from '@/context/StoreContext';
import { apiFetch } from '@/lib/api';
import ProductForm, {
  type ProductFormState,
  type Category,
  type Brand,
} from '../../_components/ProductForm';

type ProductDetail = {
  id: string;
  sku: string;
  name: string;
  category: string;
  brand?: string | null;
  price: number;
  originalPrice?: number | null;
  badge?: 'New' | 'Sale' | null;
  image: string;
  description: string;
  inStock: boolean;
  stockQuantity: number;
  isActive: boolean;
};

export default function EditProductPage() {
  const router = useRouter();
  const params = useParams<{ id: string | string[] }>();
  const productId = Array.isArray(params.id) ? params.id[0] : params.id;
  const { isAdmin } = useStore();
  const [categories, setCategories] = useState<Category[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState<ProductFormState>({
    name: '',
    sku: '',
    description: '',
    category: '',
    brand: '',
    price: '',
    originalPrice: '',
    badge: 'None',
    image: '',
    inStock: true,
    stockQuantity: '0',
    isActive: true,
  });

  useEffect(() => {
    const load = async () => {
      try {
        const [productRes, categoriesRes, brandsRes] = await Promise.all([
          apiFetch<{ item: ProductDetail }>(`/catalog/products/${productId}/`),
          apiFetch<{ items: Category[] }>('/catalog/categories/'),
          apiFetch<{ items: Brand[] }>('/catalog/brands/'),
        ]);
        const product = productRes.item;
        setCategories(categoriesRes.items || []);
        setBrands(brandsRes.items || []);
        setFormData({
          name: product.name,
          sku: product.sku || '',
          description: product.description,
          category: product.category,
          brand: product.brand || '',
          price: product.price?.toString() || '',
          originalPrice: product.originalPrice ? String(product.originalPrice) : '',
          badge: product.badge || 'None',
          image: product.image || '',
          inStock: product.inStock,
          stockQuantity: String(product.stockQuantity ?? 0),
          isActive: product.isActive,
        });
      } catch (loadError) {
        const message = loadError instanceof Error ? loadError.message : 'Unable to load product.';
        setError(message);
      } finally {
        setIsLoading(false);
      }
    };

    if (productId) {
      load();
    }
  }, [productId]);

  const handleSubmit = async (data: ProductFormState, imageFile: File | null) => {
    if (isSubmitting) return;

    setError('');
    setIsSubmitting(true);

    try {
      const stockCount = Number(data.stockQuantity || '0');
      const payload = new FormData();
      payload.append('name', data.name.trim());
      if (data.sku.trim()) payload.append('sku', data.sku.trim());
      payload.append('description', data.description.trim());
      payload.append('category', data.category);
      payload.append('brand', data.brand || '');
      payload.append('price', data.price);
      payload.append('originalPrice', data.originalPrice || '');
      payload.append('badge', data.badge === 'None' ? '' : data.badge);
      if (data.image.trim()) payload.append('image', data.image.trim());
      payload.append('inStock', String(stockCount > 0));
      payload.append('stockQuantity', data.stockQuantity || '0');
      payload.append('isActive', 'true');
      if (imageFile) payload.append('imageFile', imageFile);

      await apiFetch(`/catalog/products/${productId}/`, {
        method: 'PATCH',
        body: payload,
      });

      router.push('/catalog');
    } catch (submitError) {
      const message = submitError instanceof Error ? submitError.message : 'Unable to update product.';
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] pt-16">
        <div className="mx-auto flex max-w-md flex-col items-center justify-center px-6 py-16 text-center">
          <h1 className="text-xl font-semibold text-white">Admin access only</h1>
          <p className="mt-2 text-sm text-[#808080]">
            You do not have permission to edit products.
          </p>
          <button
            onClick={() => router.push('/catalog')}
            className="mt-6 rounded-lg bg-[#2D6CDF] px-6 py-2.5 text-sm font-semibold text-white hover:bg-[#2563c7] transition-colors"
          >
            Back to catalog
          </button>
        </div>
      </div>
    );
  }

  return (
    <ProductForm
      title="Edit product"
      subtitle="Update details for this catalog item."
      submitLabel="Save changes"
      requireFields={false}
      initialData={formData}
      categories={categories}
      brands={brands}
      isLoading={isLoading}
      isSubmitting={isSubmitting}
      error={error}
      onCancel={() => router.push('/catalog')}
      onSubmit={handleSubmit}
    />
  );
}
