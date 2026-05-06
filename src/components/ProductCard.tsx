'use client';

import { Star, Pencil, Trash2 } from 'lucide-react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import type { Product } from '@/types';
import { useStore } from '@/context/StoreContext';
import { apiFetch } from '@/lib/api';

interface ProductCardProps {
  product: Product;
  onDeleted?: (productId: string) => void;
}

export default function ProductCard({ product, onDeleted }: ProductCardProps) {
  const { addToCart, isAdmin } = useStore();
  const router = useRouter();

  const handleClick = () => {
    if (!isAdmin) {
      router.push(`/product/${product.id}`);
    }
  };

  const handleAddToCart = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isAdmin) return;
    if (product.stockQuantity <= 0) {
      alert('This product is out of stock');
      return;
    }
    try {
      await addToCart(product, 1);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to add to cart';
      alert(message);
    }
  };

  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    router.push(`/catalog/edit/${product.id}`);
  };

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const shouldDelete = window.confirm('Delete this product?');
    if (!shouldDelete) return;
    try {
      await apiFetch(`/catalog/products/${product.id}/`, { method: 'DELETE' });
      onDeleted?.(product.id);
    } catch (error) {
      console.error('Unable to delete product', error);
      alert('Unable to delete product. Please try again.');
    }
  };

  const discount = product.originalPrice
    ? Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)
    : null;

  return (
    <div
      onClick={handleClick}
      className={`group rounded-xl border border-[#1E1E1E] bg-[#141414] p-4 transition-all duration-300 ${
        !isAdmin ? 'cursor-pointer hover:scale-[1.02] hover:border-[#2D6CDF]' : ''
      }`}
    >
      {/* Image */}
      <div className="relative mb-4 aspect-video overflow-hidden rounded-lg bg-[#1A1A1A]">
        <Image
          src={product.image}
          alt={product.name}
          fill
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
          className="object-cover transition-transform duration-500 group-hover:scale-105"
        />
        {product.badge && (
          <span
            className={`absolute left-3 top-3 rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wide ${
              product.badge === 'New'
                ? 'bg-[#2D6CDF] text-white'
                : 'bg-[#2D6CDF] text-white'
            }`}
          >
            {product.badge}
          </span>
        )}
        {discount && (
          <span className="absolute right-3 top-3 rounded-full bg-red-500/90 px-2 py-1 text-xs font-bold text-white">
            {discount}% off
          </span>
        )}
      </div>

      {/* Content */}
      <div className="space-y-2">
        <p className="text-xs font-bold uppercase tracking-wider text-[#606060]">
          {product.category}
        </p>
        <h3 className="text-[15px] font-medium text-white leading-snug">
          {product.name}
        </h3>

        {/* Rating */}
        <div className="flex items-center gap-1.5">
          <div className="flex items-center gap-0.5">
            {[1, 2, 3, 4, 5].map((star) => (
              <Star
                key={star}
                size={13}
                className={
                  star <= Math.round(product.rating)
                    ? 'fill-[#2D6CDF] text-[#2D6CDF]'
                    : 'text-[#333333]'
                }
              />
            ))}
          </div>
          <span className="text-xs text-[#808080]">({product.reviewCount})</span>
        </div>

        {/* Price */}
        <div className="flex items-center gap-2 pt-1">
          <span className="text-lg font-bold text-white">
            ${product.price.toLocaleString()}
          </span>
          {product.originalPrice && (
            <span className="text-sm text-[#505050] line-through">
              ${product.originalPrice.toLocaleString()}
            </span>
          )}
        </div>

        {/* Stock availability */}
        <div className="pt-1">
          {product.stockQuantity === 0 ? (
            <p className="text-xs font-semibold text-red-400">Out of stock</p>
          ) : product.stockQuantity <= 5 ? (
            <p className="text-xs font-semibold text-yellow-400">
              Only {product.stockQuantity} left
            </p>
          ) : (
            <p className="text-xs text-[#808080]">
              {product.stockQuantity} available
            </p>
          )}
        </div>
      </div>

      {/* Add to Cart Button */}
      {isAdmin ? (
        <div className="mt-4 grid grid-cols-2 gap-2">
          <button
            onClick={handleEdit}
            className="flex items-center justify-center gap-2 rounded-lg border border-[#1E1E1E] bg-[#0A0A0A] py-2.5 text-xs font-semibold text-[#A0A0A0] transition-colors hover:border-[#2D6CDF] hover:text-white"
          >
            <Pencil size={14} />
            Edit
          </button>
          <button
            onClick={handleDelete}
            className="flex items-center justify-center gap-2 rounded-lg border border-red-500/40 bg-red-500/10 py-2.5 text-xs font-semibold text-red-200 transition-colors hover:border-red-400 hover:text-white"
          >
            <Trash2 size={14} />
            Delete
          </button>
        </div>
      ) : product.stockQuantity === 0 ? (
        <button
          disabled
          className="mt-4 w-full rounded-lg border border-[#505050] bg-[#0A0A0A] py-2.5 text-sm font-medium text-[#606060] cursor-not-allowed opacity-50"
        >
          Don't have in stock
        </button>
      ) : (
        <button
          onClick={handleAddToCart}
          className="mt-4 w-full rounded-lg border border-[#1E1E1E] bg-transparent py-2.5 text-sm font-medium text-[#A0A0A0] transition-all duration-200 hover:border-[#2D6CDF] hover:bg-[#2D6CDF] hover:text-white"
        >
          Add to cart
        </button>
      )}
    </div>
  );
}
