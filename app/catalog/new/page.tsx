'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useStore } from '@/context/StoreContext';
import { apiFetch } from '@/lib/api';
import ProductForm, {
  type ProductFormState,
  type Category,
  type Brand,
} from '../_components/ProductForm';

export default function NewProductPage() {
  const router = useRouter();
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
        const [categoriesRes, brandsRes] = await Promise.all([
          apiFetch<{ items: Category[] }>('/catalog/categories/'),
          apiFetch<{ items: Brand[] }>('/catalog/brands/'),
        ]);
        setCategories(categoriesRes.items || []);
        setBrands(brandsRes.items || []);
        if (categoriesRes.items?.length) {
          setFormData((prev) => ({ ...prev, category: categoriesRes.items[0].name }));
        }
      } catch {
        setError('Unable to load catalog metadata.');
      } finally {
        setIsLoading(false);
      }
    };

    load();
  }, []);

  const handleSubmit = async (data: ProductFormState, imageFile: File | null) => {
    if (isSubmitting) return;

    setError('');
    if (!imageFile) {
      setError('Product image is required.');
      return;
    }
    setIsSubmitting(true);

    try {
      const stockCount = Number(data.stockQuantity || '0');
      const payload = new FormData();
      payload.append('name', data.name.trim());
      if (data.sku.trim()) payload.append('sku', data.sku.trim());
      payload.append('description', data.description.trim());
      payload.append('category', data.category);
      if (data.brand) payload.append('brand', data.brand);
      payload.append('price', data.price);
      if (data.originalPrice) payload.append('originalPrice', data.originalPrice);
      if (data.badge !== 'None') payload.append('badge', data.badge);
      payload.append('inStock', String(stockCount > 0));
      payload.append('stockQuantity', data.stockQuantity || '0');
      payload.append('isActive', 'true');
      if (imageFile) payload.append('imageFile', imageFile);

      await apiFetch('/catalog/products/', {
        method: 'POST',
        body: payload,
      });

      router.push('/catalog');
    } catch (submitError) {
      const message = submitError instanceof Error ? submitError.message : 'Unable to create product.';
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
            You do not have permission to create products.
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
      title="Create product"
      subtitle="Add a new item to the catalog."
      submitLabel="Create product"
      requireFields
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
