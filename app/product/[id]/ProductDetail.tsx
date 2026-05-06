'use client';

import { useState } from 'react';
import { Star, Heart, Plus, Minus, Truck, Shield, RotateCcw, ChevronRight } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import type { Product } from '@/types';
import { useStore } from '@/context/StoreContext';
import ProductCard from '@/components/ProductCard';

interface ProductDetailProps {
  product: Product;
  relatedProducts: Product[];
}

export default function ProductDetail({ product, relatedProducts }: ProductDetailProps) {
  const { addToCart, setCartOpen } = useStore();
  const [selectedImage, setSelectedImage] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [selectedColor, setSelectedColor] = useState<string | null>(null);
  const [selectedSize, setSelectedSize] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'description' | 'specs' | 'reviews'>('description');
  const [isWishlisted, setIsWishlisted] = useState(false);

  const thumbnails = [product.image, product.image, product.image, product.image];

  const handleAddToCart = () => {
    if (product.stockQuantity <= 0) {
      alert('This product is out of stock');
      return;
    }
    if (quantity > product.stockQuantity) {
      alert(`Only ${product.stockQuantity} units available`);
      return;
    }
    const variantParts: string[] = [];
    if (selectedColor) variantParts.push(selectedColor);
    if (selectedSize) variantParts.push(selectedSize);
    const variant = variantParts.length > 0 ? variantParts.join(', ') : undefined;
    try {
      addToCart(product, quantity, variant);
      setCartOpen(true);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to add to cart';
      alert(message);
    }
  };

  const discount = product.originalPrice
    ? Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)
    : null;

  return (
    <div className="min-h-screen bg-[#0A0A0A] pt-16">
      <div className="mx-auto max-w-[1400px] px-4 py-8 lg:px-8">
        {/* Breadcrumb */}
        <nav className="mb-6 flex items-center gap-2 text-xs text-[#606060]">
          <Link href="/" className="hover:text-white transition-colors">
            Home
          </Link>
          <ChevronRight size={12} />
          <Link
            href={`/catalog?category=${encodeURIComponent(product.category)}`}
            className="hover:text-white transition-colors"
          >
            {product.category}
          </Link>
          <ChevronRight size={12} />
          <span className="text-[#808080]">{product.name}</span>
        </nav>

        {/* Product Grid */}
        <div className="grid gap-10 lg:grid-cols-2">
          {/* Left - Image Gallery */}
          <div className="space-y-4">
            <div className="relative aspect-square overflow-hidden rounded-xl bg-[#111111]">
              <Image
                src={thumbnails[selectedImage]}
                alt={product.name}
                fill
                sizes="(max-width: 1024px) 100vw, 50vw"
                priority
                className="object-cover"
              />
              {product.badge && (
                <span className="absolute left-4 top-4 rounded-full bg-[#2D6CDF] px-3 py-1 text-xs font-bold uppercase text-white">
                  {product.badge}
                </span>
              )}
            </div>
            <div className="grid grid-cols-4 gap-3">
              {thumbnails.map((thumb, i) => (
                <button
                  key={i}
                  onClick={() => setSelectedImage(i)}
                  className={`relative aspect-square overflow-hidden rounded-lg bg-[#1A1A1A] border-2 transition-colors ${
                    selectedImage === i ? 'border-[#2D6CDF]' : 'border-transparent hover:border-[#333333]'
                  }`}
                >
                  <Image
                    src={thumb}
                    alt={`${product.name} view ${i + 1}`}
                    fill
                    sizes="120px"
                    className="object-cover"
                  />
                </button>
              ))}
            </div>
          </div>

          {/* Right - Product Info */}
          <div className="space-y-6">
            <div>
              <p className="mb-2 text-xs font-bold uppercase tracking-wider text-[#606060]">
                {product.category}
              </p>
              <h1 className="text-2xl font-bold text-white lg:text-[28px]">
                {product.name}
              </h1>
              <div className="mt-3 flex items-center gap-3">
                <div className="flex items-center gap-0.5">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      size={16}
                      className={
                        star <= Math.round(product.rating)
                          ? 'fill-[#2D6CDF] text-[#2D6CDF]'
                          : 'text-[#333333]'
                      }
                    />
                  ))}
                </div>
                <span className="text-sm text-[#808080]">
                  {product.rating} ({product.reviewCount} reviews)
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-3xl font-bold text-white">
                ${product.price.toLocaleString()}
              </span>
              {product.originalPrice && (
                <>
                  <span className="text-lg text-[#505050] line-through">
                    ${product.originalPrice.toLocaleString()}
                  </span>
                  <span className="rounded-full bg-red-500/20 px-2.5 py-1 text-xs font-bold text-red-400">
                    Save {discount}%
                  </span>
                </>
              )}
            </div>

            {product.variants?.colors && (
              <div>
                <p className="mb-2 text-sm font-medium text-white">
                  Color{selectedColor ? `: ${selectedColor}` : ''}
                </p>
                <div className="flex flex-wrap gap-2">
                  {product.variants.colors.map((color) => (
                    <button
                      key={color.name}
                      onClick={() => setSelectedColor(color.name)}
                      className={`flex items-center gap-2 rounded-lg border px-4 py-2 text-sm transition-all ${
                        selectedColor === color.name
                          ? 'border-[#2D6CDF] bg-[#2D6CDF]/10 text-white'
                          : 'border-[#1E1E1E] text-[#A0A0A0] hover:border-[#808080] hover:text-white'
                      }`}
                    >
                      <span
                        className="h-4 w-4 rounded-full border border-[#333333]"
                        style={{ backgroundColor: color.value }}
                      />
                      {color.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {product.variants?.sizes && (
              <div>
                <p className="mb-2 text-sm font-medium text-white">
                  Storage{selectedSize ? `: ${selectedSize}` : ''}
                </p>
                <div className="flex flex-wrap gap-2">
                  {product.variants.sizes.map((size) => (
                    <button
                      key={size.name}
                      onClick={() => setSelectedSize(size.name)}
                      className={`rounded-lg border px-4 py-2 text-sm transition-all ${
                        selectedSize === size.name
                          ? 'border-[#2D6CDF] bg-[#2D6CDF]/10 text-white'
                          : 'border-[#1E1E1E] text-[#A0A0A0] hover:border-[#808080] hover:text-white'
                      }`}
                    >
                      {size.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <span className="text-sm font-medium text-white">Quantity</span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    disabled={product.stockQuantity === 0}
                    className="rounded-lg border border-[#1E1E1E] p-2 text-[#808080] hover:text-white hover:border-[#808080] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Minus size={16} />
                  </button>
                  <span className="w-8 text-center text-sm font-medium text-white">
                    {quantity}
                  </span>
                  <button
                    onClick={() => setQuantity(quantity + 1)}
                    disabled={product.stockQuantity === 0 || quantity >= product.stockQuantity}
                    className="rounded-lg border border-[#1E1E1E] p-2 text-[#808080] hover:text-white hover:border-[#808080] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Plus size={16} />
                  </button>
                </div>
              </div>

              {/* Stock indicator */}
              <div>
                {product.stockQuantity === 0 ? (
                  <p className="text-sm font-semibold text-red-400">Out of stock</p>
                ) : product.stockQuantity <= 5 ? (
                  <p className="text-sm font-semibold text-yellow-400">
                    ⚠️ Only {product.stockQuantity} left
                  </p>
                ) : (
                  <p className="text-sm text-[#808080]">
                    {product.stockQuantity} available in stock
                  </p>
                )}
              </div>

              <button
                onClick={handleAddToCart}
                disabled={product.stockQuantity === 0}
                className="w-full rounded-lg bg-[#2D6CDF] py-4 text-sm font-semibold text-white transition-colors hover:bg-[#2563c7] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {product.stockQuantity === 0 ? 'Out of Stock' : `Add to Cart — $${(product.price * quantity).toLocaleString()}`}
              </button>

              <button
                onClick={() => setIsWishlisted(!isWishlisted)}
                className={`flex w-full items-center justify-center gap-2 rounded-lg border py-3 text-sm font-medium transition-all ${
                  isWishlisted
                    ? 'border-red-500/50 bg-red-500/10 text-red-400'
                    : 'border-[#1E1E1E] text-[#A0A0A0] hover:border-[#808080] hover:text-white'
                }`}
              >
                <Heart size={16} className={isWishlisted ? 'fill-red-400' : ''} />
                {isWishlisted ? 'In Wishlist' : 'Add to Wishlist'}
              </button>
            </div>

            {/* Trust badges */}
            <div className="grid grid-cols-3 gap-3 rounded-xl border border-[#1E1E1E] bg-[#141414] p-4">
              <div className="text-center">
                <Truck size={18} className="mx-auto mb-1.5 text-[#2D6CDF]" />
                <p className="text-xs text-[#A0A0A0]">Free Shipping</p>
              </div>
              <div className="text-center">
                <Shield size={18} className="mx-auto mb-1.5 text-[#2D6CDF]" />
                <p className="text-xs text-[#A0A0A0]">2-Year Warranty</p>
              </div>
              <div className="text-center">
                <RotateCcw size={18} className="mx-auto mb-1.5 text-[#2D6CDF]" />
                <p className="text-xs text-[#A0A0A0]">30-Day Returns</p>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="mt-12 border-b border-[#1E1E1E]">
          <div className="flex gap-0">
            {(
              [
                { key: 'description', label: 'Description' },
                { key: 'specs', label: 'Specifications' },
                { key: 'reviews', label: 'Reviews' },
              ] as const
            ).map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`relative px-6 py-3 text-sm font-medium transition-colors ${
                  activeTab === tab.key
                    ? 'text-white'
                    : 'text-[#808080] hover:text-[#A0A0A0]'
                }`}
              >
                {tab.label}
                {activeTab === tab.key && (
                  <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#2D6CDF]" />
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content */}
        <div className="py-8">
          {activeTab === 'description' && (
            <div className="max-w-3xl">
              <p className="text-[15px] leading-relaxed text-[#A0A0A0]">
                {product.description}
              </p>
              <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="rounded-xl border border-[#1E1E1E] bg-[#141414] p-4">
                  <h4 className="mb-2 text-sm font-semibold text-white">Premium Build</h4>
                  <p className="text-sm text-[#808080]">
                    Crafted from aerospace-grade materials for durability and a refined aesthetic.
                  </p>
                </div>
                <div className="rounded-xl border border-[#1E1E1E] bg-[#141414] p-4">
                  <h4 className="mb-2 text-sm font-semibold text-white">Expert Support</h4>
                  <p className="text-sm text-[#808080]">
                    Our team of tech specialists is available 24/7 to help you get the most out of your purchase.
                  </p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'specs' && (
            <div className="max-w-2xl">
              <div className="rounded-xl border border-[#1E1E1E] bg-[#141414] overflow-hidden">
                {Object.entries(product.specs).map(([key, value], i, arr) => (
                  <div
                    key={key}
                    className={`flex justify-between px-6 py-3 ${
                      i !== arr.length - 1 ? 'border-b border-[#1E1E1E]' : ''
                    }`}
                  >
                    <span className="text-sm text-[#808080]">{key}</span>
                    <span className="text-sm font-medium text-white">{value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'reviews' && (
            <div className="max-w-3xl space-y-6">
              <div className="flex items-center gap-6">
                <div className="text-center">
                  <p className="text-4xl font-bold text-white">{product.rating}</p>
                  <div className="mt-1 flex items-center gap-0.5">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        size={14}
                        className={
                          star <= Math.round(product.rating)
                            ? 'fill-[#2D6CDF] text-[#2D6CDF]'
                            : 'text-[#333333]'
                        }
                      />
                    ))}
                  </div>
                  <p className="mt-1 text-xs text-[#808080]">{product.reviewCount} reviews</p>
                </div>
                <div className="flex-1 space-y-1">
                  {[5, 4, 3, 2, 1].map((rating) => (
                    <div key={rating} className="flex items-center gap-2">
                      <span className="w-3 text-xs text-[#808080]">{rating}</span>
                      <Star size={10} className="text-[#2D6CDF] fill-[#2D6CDF]" />
                      <div className="flex-1 h-2 rounded-full bg-[#1E1E1E] overflow-hidden">
                        <div
                          className="h-full rounded-full bg-[#2D6CDF]"
                          style={{
                            width: `${(rating / 5) * 80 + 10}%`,
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {[
                { name: 'Alex M.', rating: 5, date: '2 weeks ago', text: 'Absolutely incredible product. The build quality is top-notch and performance exceeds expectations.' },
                { name: 'Sarah K.', rating: 4, date: '1 month ago', text: 'Great value for money. Shipping was fast and the packaging was premium. Would recommend.' },
                { name: 'James L.', rating: 5, date: '2 months ago', text: 'Best purchase I have made this year. TechStore never disappoints with their quality.' },
              ].map((review, i) => (
                <div key={i} className="rounded-xl border border-[#1E1E1E] bg-[#141414] p-5">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#2D6CDF]/20 text-xs font-bold text-[#2D6CDF]">
                        {review.name.charAt(0)}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-white">{review.name}</p>
                        <p className="text-xs text-[#606060]">{review.date}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-0.5">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star
                          key={star}
                          size={12}
                          className={
                            star <= review.rating
                              ? 'fill-[#2D6CDF] text-[#2D6CDF]'
                              : 'text-[#333333]'
                          }
                        />
                      ))}
                    </div>
                  </div>
                  <p className="text-sm text-[#A0A0A0]">{review.text}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Related Products */}
        {relatedProducts.length > 0 && (
          <div className="mt-12 border-t border-[#1E1E1E] pt-10">
            <h2 className="mb-6 text-xl font-bold text-white">Related Products</h2>
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {relatedProducts.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
