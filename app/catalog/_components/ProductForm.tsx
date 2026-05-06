'use client';

import { useEffect, useState } from 'react';

const badgeOptions = ['None', 'New', 'Sale'] as const;

type BadgeOption = (typeof badgeOptions)[number];

type Category = { name: string; icon?: string | null };

type Brand = string;

type ProductFormState = {
  name: string;
  sku: string;
  description: string;
  category: string;
  brand: string;
  price: string;
  originalPrice: string;
  badge: BadgeOption;
  image: string;
  inStock: boolean;
  stockQuantity: string;
  isActive: boolean;
};

interface ProductFormProps {
  title: string;
  subtitle: string;
  submitLabel: string;
  requireFields?: boolean;
  initialData: ProductFormState;
  categories: Category[];
  brands: Brand[];
  isLoading: boolean;
  isSubmitting: boolean;
  error: string;
  onCancel: () => void;
  onSubmit: (data: ProductFormState, imageFile: File | null) => Promise<void>;
}

export default function ProductForm({
  title,
  subtitle,
  submitLabel,
  requireFields = true,
  initialData,
  categories,
  brands,
  isLoading,
  isSubmitting,
  error,
  onCancel,
  onSubmit,
}: ProductFormProps) {
  const [formData, setFormData] = useState<ProductFormState>(initialData);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const stockCount = Number(formData.stockQuantity || '0');
  const stockLabel = stockCount <= 0
    ? 'Out of stock'
    : stockCount <= 5
    ? `Low stock (${stockCount})`
    : 'In stock';
  const stockTone = stockCount <= 0
    ? 'text-red-400'
    : stockCount <= 5
    ? 'text-yellow-400'
    : 'text-emerald-400';

  useEffect(() => {
    setFormData(initialData);
  }, [initialData]);

  useEffect(() => {
    if (imageFile) {
      const url = URL.createObjectURL(imageFile);
      setPreviewUrl(url);
      return () => URL.revokeObjectURL(url);
    }
    setPreviewUrl(formData.image ? formData.image : null);
    return undefined;
  }, [imageFile, formData.image]);

  const handleChange = (field: keyof ProductFormState, value: string | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    await onSubmit(formData, imageFile);
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A] pt-16">
      <div className="mx-auto max-w-[900px] px-4 py-8 lg:px-8">
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white">{title}</h1>
            <p className="mt-1 text-sm text-[#808080]">{subtitle}</p>
          </div>
          <button
            onClick={onCancel}
            className="rounded-lg border border-[#1E1E1E] bg-[#141414] px-4 py-2 text-sm text-[#A0A0A0] hover:text-white transition-colors"
          >
            Cancel
          </button>
        </div>

        <form
          onSubmit={handleSubmit}
          className="rounded-xl border border-[#1E1E1E] bg-[#141414] p-6"
        >
          {error && (
            <div className="mb-6 rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
              {error}
            </div>
          )}

          <div className="grid gap-6 md:grid-cols-2">
            <div className="md:col-span-2">
              <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-[#808080]">
                Product name
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => handleChange('name', e.target.value)}
                className="w-full rounded-lg border border-[#1E1E1E] bg-[#0A0A0A] px-4 py-2.5 text-sm text-white outline-none focus:border-[#2D6CDF]"
                placeholder="AeroBook Pro X1"
                required={requireFields}
              />
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-[#808080]">
                SKU (optional)
              </label>
              <input
                type="text"
                value={formData.sku}
                onChange={(e) => handleChange('sku', e.target.value)}
                className="w-full rounded-lg border border-[#1E1E1E] bg-[#0A0A0A] px-4 py-2.5 text-sm text-white outline-none focus:border-[#2D6CDF]"
                placeholder="SKU-12345"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-[#808080]">
                Badge
              </label>
              <select
                value={formData.badge}
                onChange={(e) => handleChange('badge', e.target.value as BadgeOption)}
                className="w-full rounded-lg border border-[#1E1E1E] bg-[#0A0A0A] px-4 py-2.5 text-sm text-white outline-none focus:border-[#2D6CDF]"
              >
                {badgeOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-[#808080]">
                Category
              </label>
              <select
                value={formData.category}
                onChange={(e) => handleChange('category', e.target.value)}
                className="w-full rounded-lg border border-[#1E1E1E] bg-[#0A0A0A] px-4 py-2.5 text-sm text-white outline-none focus:border-[#2D6CDF]"
                disabled={isLoading}
                required={requireFields}
              >
                {categories.map((category) => (
                  <option key={category.name} value={category.name}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-[#808080]">
                Brand (optional)
              </label>
              <select
                value={formData.brand}
                onChange={(e) => handleChange('brand', e.target.value)}
                className="w-full rounded-lg border border-[#1E1E1E] bg-[#0A0A0A] px-4 py-2.5 text-sm text-white outline-none focus:border-[#2D6CDF]"
                disabled={isLoading}
              >
                <option value="">No brand</option>
                {brands.map((brand) => (
                  <option key={brand} value={brand}>
                    {brand}
                  </option>
                ))}
              </select>
            </div>

            <div className="md:col-span-2 pt-2">
              <div className="flex items-center gap-3">
                <div className="h-px flex-1 bg-[#1E1E1E]" />
                <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#606060]">
                  Pricing
                </span>
                <div className="h-px flex-1 bg-[#1E1E1E]" />
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-[#808080]">
                Price
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={formData.price}
                onChange={(e) => handleChange('price', e.target.value)}
                className="w-full rounded-lg border border-[#1E1E1E] bg-[#0A0A0A] px-4 py-2.5 text-sm text-white outline-none focus:border-[#2D6CDF]"
                placeholder="1999"
                required={requireFields}
              />
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-[#808080]">
                Original price (optional)
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={formData.originalPrice}
                onChange={(e) => handleChange('originalPrice', e.target.value)}
                className="w-full rounded-lg border border-[#1E1E1E] bg-[#0A0A0A] px-4 py-2.5 text-sm text-white outline-none focus:border-[#2D6CDF]"
                placeholder="2199"
              />
            </div>

            <div className="md:col-span-2 pt-2">
              <div className="flex items-center gap-3">
                <div className="h-px flex-1 bg-[#1E1E1E]" />
                <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#606060]">
                  Media
                </span>
                <div className="h-px flex-1 bg-[#1E1E1E]" />
              </div>
            </div>

            <div className="md:col-span-2">
              <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-[#808080]">
                Image file
              </label>
              <div className="flex flex-col gap-2 rounded-lg border border-dashed border-[#1E1E1E] bg-[#0A0A0A] px-4 py-3">
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setImageFile(e.target.files?.[0] || null)}
                  className="w-full text-sm text-[#A0A0A0] file:mr-4 file:rounded-md file:border-0 file:bg-[#2D6CDF] file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-white"
                />
                <p className="text-xs text-[#606060]">
                  Upload a product image (JPG or PNG).
                </p>
              </div>
              {imageFile && (
                <p className="mt-2 text-xs text-[#808080]">
                  Selected: {imageFile.name}
                </p>
              )}
              {previewUrl && (
                <div className="mt-3 h-48 overflow-hidden rounded-lg border border-[#1E1E1E] bg-[#0A0A0A]">
                  <img
                    src={previewUrl}
                    alt="Product preview"
                    className="h-full w-full object-cover"
                  />
                </div>
              )}
            </div>

            <div className="md:col-span-2 pt-2">
              <div className="flex items-center gap-3">
                <div className="h-px flex-1 bg-[#1E1E1E]" />
                <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#606060]">
                  Details
                </span>
                <div className="h-px flex-1 bg-[#1E1E1E]" />
              </div>
            </div>

            <div className="md:col-span-2">
              <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-[#808080]">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => handleChange('description', e.target.value)}
                className="h-28 w-full rounded-lg border border-[#1E1E1E] bg-[#0A0A0A] px-4 py-2.5 text-sm text-white outline-none focus:border-[#2D6CDF]"
                placeholder="Product description"
                required={requireFields}
              />
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-[#808080]">
                Stock quantity
              </label>
              <input
                type="number"
                min="0"
                step="1"
                value={formData.stockQuantity}
                onChange={(e) => handleChange('stockQuantity', e.target.value)}
                className="w-full rounded-lg border border-[#1E1E1E] bg-[#0A0A0A] px-4 py-2.5 text-sm text-white outline-none focus:border-[#2D6CDF]"
              />
              <p className={`mt-2 text-xs font-semibold ${stockTone}`}>
                {stockLabel}
              </p>
            </div>
          </div>

          <div className="mt-8 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onCancel}
              className="rounded-lg border border-[#1E1E1E] bg-[#141414] px-5 py-2.5 text-sm text-[#A0A0A0] hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="rounded-lg bg-[#2D6CDF] px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#2563c7] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? 'Saving...' : submitLabel}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export type { ProductFormState, Category, Brand, BadgeOption };
