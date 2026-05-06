'use client';

import { useState, useMemo, useEffect, Suspense } from 'react';
import { SlidersHorizontal, ChevronDown, Star } from 'lucide-react';
import { useSearchParams, useRouter } from 'next/navigation';
import ProductCard from '@/components/ProductCard';
import { apiFetch } from '@/lib/api';
import { useStore } from '@/context/StoreContext';
import type { Product } from '@/types';

type SortOption = 'featured' | 'price-low' | 'price-high' | 'rating' | 'newest';
const PRICE_MAX_CAP = 10000;

function CatalogContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const initialCategory = searchParams.get('category');
  const { isAdmin } = useStore();

  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<{ name: string; icon?: string | null }[]>([]);
  const [brands, setBrands] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [selectedCategories, setSelectedCategories] = useState<string[]>(
    initialCategory ? [initialCategory] : []
  );
  const [selectedBrands, setSelectedBrands] = useState<string[]>([]);
  const [priceRange, setPriceRange] = useState<[number, number]>([0, PRICE_MAX_CAP]);
  const [maxPrice, setMaxPrice] = useState(PRICE_MAX_CAP);
  const [minRating, setMinRating] = useState<number | null>(null);
  const [sortBy, setSortBy] = useState<SortOption>('featured');
  const [showSortDropdown, setShowSortDropdown] = useState(false);
  const [pageNum, setPageNum] = useState(1);
  const itemsPerPage = 9;

  useEffect(() => {
    const load = async () => {
      try {
        const [productsRes, categoriesRes, brandsRes] = await Promise.all([
          apiFetch<{ items: Product[] }>('/catalog/products/?pageSize=200'),
          apiFetch<{ items: { name: string; icon?: string | null }[] }>('/catalog/categories/'),
          apiFetch<{ items: string[] }>('/catalog/brands/'),
        ]);
        setAllProducts(productsRes.items || []);
        setCategories(categoriesRes.items || []);
        setBrands(brandsRes.items || []);
        setMaxPrice(PRICE_MAX_CAP);
        setPriceRange((prev) => (prev[1] === 0 ? [0, PRICE_MAX_CAP] : prev));
      } catch {
        setAllProducts([]);
        setCategories([]);
        setBrands([]);
        setMaxPrice(PRICE_MAX_CAP);
      } finally {
        setIsLoading(false);
      }
    };

    load();
  }, []);

  useEffect(() => {
    if (initialCategory) {
      setSelectedCategories([initialCategory]);
    } else {
      setSelectedCategories([]);
    }
    setPageNum(1);
  }, [initialCategory]);

  const sortOptions: { value: SortOption; label: string }[] = [
    { value: 'featured', label: 'Featured' },
    { value: 'price-low', label: 'Price: Low to High' },
    { value: 'price-high', label: 'Price: High to Low' },
    { value: 'rating', label: 'Highest Rated' },
    { value: 'newest', label: 'Newest' },
  ];

  const filteredProducts = useMemo(() => {
    let result = [...allProducts];

    if (selectedCategories.length > 0) {
      result = result.filter((p) => selectedCategories.includes(p.category));
    }

    if (selectedBrands.length > 0) {
      result = result.filter((p) =>
        selectedBrands.some((b) => p.name.toLowerCase().includes(b.toLowerCase()))
      );
    }

    const upperLimit = priceRange[1] >= PRICE_MAX_CAP ? Number.POSITIVE_INFINITY : priceRange[1];
    result = result.filter(
      (p) => p.price >= priceRange[0] && p.price <= upperLimit
    );

    if (minRating !== null) {
      result = result.filter((p) => p.rating >= minRating);
    }

    switch (sortBy) {
      case 'price-low':
        result.sort((a, b) => a.price - b.price);
        break;
      case 'price-high':
        result.sort((a, b) => b.price - a.price);
        break;
      case 'rating':
        result.sort((a, b) => b.rating - a.rating);
        break;
      case 'newest':
        result.sort((a) => (a.badge === 'New' ? -1 : 1));
        break;
    }

    return result;
  }, [allProducts, selectedCategories, selectedBrands, priceRange, minRating, sortBy]);

  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);
  const paginatedProducts = filteredProducts.slice(
    (pageNum - 1) * itemsPerPage,
    pageNum * itemsPerPage
  );

  const handleProductDeleted = (productId: string) => {
    setAllProducts((prev) => prev.filter((product) => product.id !== productId));
  };

  const toggleCategory = (cat: string) => {
    setSelectedCategories((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
    );
    setPageNum(1);
  };

  const toggleBrand = (brand: string) => {
    setSelectedBrands((prev) =>
      prev.includes(brand) ? prev.filter((b) => b !== brand) : [...prev, brand]
    );
    setPageNum(1);
  };

  const activeFiltersCount =
    selectedCategories.length +
    selectedBrands.length +
    (minRating !== null ? 1 : 0) +
    (priceRange[0] > 0 || priceRange[1] < 3000 ? 1 : 0);

  const formatPriceInput = (value: number, cap: number, suffix = '') => {
    const base = value >= cap && suffix ? `${cap}` : `${value}`;
    const formatted = Number(base).toLocaleString();
    return value >= cap && suffix ? `${formatted} ${suffix}` : formatted;
  };

  const clearFilters = () => {
    setSelectedCategories([]);
    setSelectedBrands([]);
    setPriceRange([0, maxPrice || PRICE_MAX_CAP]);
    setMinRating(null);
    setPageNum(1);
    router.push('/catalog');
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A] pt-16">
      <div className="mx-auto max-w-[1400px] px-4 py-8 lg:px-8">
        {/* Header */}
        <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-white">
              {initialCategory || 'All Products'}
            </h1>
            <p className="mt-1 text-sm text-[#808080]">
              Showing {filteredProducts.length} product{filteredProducts.length !== 1 ? 's' : ''}
            </p>
          </div>
          {isAdmin && (
            <button
              onClick={() => router.push('/catalog/new')}
              className="rounded-lg bg-[#2D6CDF] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#2563c7]"
            >
              + New product
            </button>
          )}
        </div>

        <div className="flex gap-8">
          {/* Sidebar */}
          <aside className="hidden w-[260px] flex-shrink-0 lg:block">
            <div className="sticky top-20 space-y-6">
              {activeFiltersCount > 0 && (
                <div className="flex items-center justify-between">
                  <span className="text-xs text-[#808080]">{activeFiltersCount} filter{activeFiltersCount !== 1 ? 's' : ''} active</span>
                  <button
                    onClick={clearFilters}
                    className="text-xs text-[#2D6CDF] hover:underline"
                  >
                    Clear all
                  </button>
                </div>
              )}

              <FilterSection title="Category">
                <div className="space-y-2">
                  {categories.map((cat) => (
                    <label
                      key={cat.name}
                      className="flex cursor-pointer items-center gap-3"
                    >
                      <div className="relative flex items-center">
                        <input
                          type="checkbox"
                          checked={selectedCategories.includes(cat.name)}
                          onChange={() => toggleCategory(cat.name)}
                          className="peer h-4 w-4 cursor-pointer appearance-none rounded border border-[#333333] bg-[#0A0A0A] transition-colors checked:border-[#2D6CDF] checked:bg-[#2D6CDF]"
                        />
                        <svg
                          className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 opacity-0 peer-checked:opacity-100"
                          width="10"
                          height="10"
                          viewBox="0 0 10 10"
                          fill="none"
                        >
                          <path
                            d="M1 5L4 8L9 2"
                            stroke="white"
                            strokeWidth="1.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      </div>
                      <span className="text-sm text-[#A0A0A0]">{cat.name}</span>
                    </label>
                  ))}
                </div>
              </FilterSection>

              <FilterSection title="Price Range">
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      value={priceRange[0]}
                      onChange={(e) =>
                        setPriceRange([Number(e.target.value || 0), priceRange[1]])
                      }
                      className="w-full rounded-lg border border-[#1E1E1E] bg-[#0A0A0A] px-3 py-2 text-sm text-white outline-none focus:border-[#2D6CDF]"
                      placeholder="Min"
                    />
                    <span className="text-[#808080]">-</span>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={formatPriceInput(priceRange[1], PRICE_MAX_CAP, '+')}
                      onChange={(e) => {
                        const raw = e.target.value.replace(/[^\d]/g, '');
                        const next = raw ? Number(raw) : 0;
                        setPriceRange([priceRange[0], Math.min(next, PRICE_MAX_CAP)]);
                      }}
                      className="w-full rounded-lg border border-[#1E1E1E] bg-[#0A0A0A] px-3 py-2 text-sm text-white outline-none focus:border-[#2D6CDF]"
                      placeholder="Max"
                    />
                  </div>
                  <input
                    type="range"
                    min="0"
                    max={PRICE_MAX_CAP}
                    value={priceRange[1]}
                    onChange={(e) =>
                      setPriceRange([priceRange[0], Number(e.target.value)])
                    }
                    className="w-full accent-[#2D6CDF]"
                  />
                  <div className="flex justify-between text-xs text-[#808080]">
                    <span>${formatPriceInput(priceRange[0], PRICE_MAX_CAP)}</span>
                    <span>${formatPriceInput(priceRange[1], PRICE_MAX_CAP, '+')}</span>
                  </div>
                </div>
              </FilterSection>

              <FilterSection title="Brands">
                <div className="space-y-2">
                  {brands.map((brand) => (
                    <label
                      key={brand}
                      className="flex cursor-pointer items-center gap-3"
                    >
                      <div className="relative flex items-center">
                        <input
                          type="checkbox"
                          checked={selectedBrands.includes(brand)}
                          onChange={() => toggleBrand(brand)}
                          className="peer h-4 w-4 cursor-pointer appearance-none rounded border border-[#333333] bg-[#0A0A0A] transition-colors checked:border-[#2D6CDF] checked:bg-[#2D6CDF]"
                        />
                        <svg
                          className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 opacity-0 peer-checked:opacity-100"
                          width="10"
                          height="10"
                          viewBox="0 0 10 10"
                          fill="none"
                        >
                          <path
                            d="M1 5L4 8L9 2"
                            stroke="white"
                            strokeWidth="1.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      </div>
                      <span className="text-sm text-[#A0A0A0]">{brand}</span>
                    </label>
                  ))}
                </div>
              </FilterSection>

              <FilterSection title="Rating">
                <div className="space-y-2">
                  {[4, 3, 2, 1].map((rating) => (
                    <button
                      key={rating}
                      onClick={() =>
                        setMinRating(minRating === rating ? null : rating)
                      }
                      className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors ${
                        minRating === rating
                          ? 'bg-[#2D6CDF]/10 text-[#2D6CDF]'
                          : 'text-[#A0A0A0] hover:bg-[#1A1A1A]'
                      }`}
                    >
                      <div className="flex items-center gap-0.5">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star
                            key={star}
                            size={14}
                            className={
                              star <= rating
                                ? 'fill-[#2D6CDF] text-[#2D6CDF]'
                                : 'text-[#333333]'
                            }
                          />
                        ))}
                      </div>
                      <span>& Up</span>
                    </button>
                  ))}
                </div>
              </FilterSection>
            </div>
          </aside>

          {/* Main Content */}
          <div className="flex-1 min-w-0">
            <div className="mb-6 flex items-center justify-between">
              <p className="text-sm text-[#808080]">
                Showing{' '}
                <span className="text-white">
                  {paginatedProducts.length > 0 ? (pageNum - 1) * itemsPerPage + 1 : 0}
                  –{Math.min(pageNum * itemsPerPage, filteredProducts.length)}
                </span>{' '}
                of <span className="text-white">{filteredProducts.length}</span> results
              </p>

              <div className="relative">
                <button
                  onClick={() => setShowSortDropdown(!showSortDropdown)}
                  className="flex items-center gap-2 rounded-lg border border-[#1E1E1E] bg-[#141414] px-4 py-2 text-sm text-[#A0A0A0] hover:text-white transition-colors"
                >
                  <SlidersHorizontal size={14} />
                  {sortOptions.find((o) => o.value === sortBy)?.label}
                  <ChevronDown size={14} />
                </button>

                {showSortDropdown && (
                  <>
                    <div
                      className="fixed inset-0 z-10"
                      onClick={() => setShowSortDropdown(false)}
                    />
                    <div className="absolute right-0 top-full z-20 mt-1 w-48 rounded-lg border border-[#1E1E1E] bg-[#141414] py-1 shadow-xl">
                      {sortOptions.map((option) => (
                        <button
                          key={option.value}
                          onClick={() => {
                            setSortBy(option.value);
                            setShowSortDropdown(false);
                          }}
                          className={`block w-full px-4 py-2 text-left text-sm transition-colors ${
                            sortBy === option.value
                              ? 'bg-[#2D6CDF]/10 text-[#2D6CDF]'
                              : 'text-[#A0A0A0] hover:bg-[#1A1A1A] hover:text-white'
                          }`}
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>

            <div className="mb-4 lg:hidden">
              <button
                onClick={() => alert('Mobile filters - use desktop for full filtering')}
                className="flex items-center gap-2 rounded-lg border border-[#1E1E1E] bg-[#141414] px-4 py-2 text-sm text-[#A0A0A0]"
              >
                <SlidersHorizontal size={14} />
                Filters {activeFiltersCount > 0 && `(${activeFiltersCount})`}
              </button>
            </div>

            {isLoading ? (
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
                {Array.from({ length: itemsPerPage }, (_, i) => (
                  <div
                    key={`catalog-skeleton-${i}`}
                    className="rounded-xl border border-[#1E1E1E] bg-[#141414] p-4"
                  >
                    <div className="mb-4 aspect-video rounded-lg bg-[#0A0A0A] animate-pulse" />
                    <div className="space-y-2">
                      <div className="h-3 w-20 rounded bg-[#0A0A0A] animate-pulse" />
                      <div className="h-4 w-3/4 rounded bg-[#0A0A0A] animate-pulse" />
                      <div className="h-3 w-32 rounded bg-[#0A0A0A] animate-pulse" />
                      <div className="h-5 w-24 rounded bg-[#0A0A0A] animate-pulse" />
                    </div>
                    <div className="mt-4 h-10 rounded-lg bg-[#0A0A0A] animate-pulse" />
                  </div>
                ))}
              </div>
            ) : paginatedProducts.length > 0 ? (
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
                {paginatedProducts.map((product) => (
                  <ProductCard key={product.id} product={product} onDeleted={handleProductDeleted} />
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-20 text-[#808080]">
                <SlidersHorizontal size={48} className="mb-4 text-[#333333]" />
                <p className="text-sm">No products match your filters</p>
                <button
                  onClick={clearFilters}
                  className="mt-4 text-sm text-[#2D6CDF] hover:underline"
                >
                  Clear all filters
                </button>
              </div>
            )}

            {totalPages > 1 && (
              <div className="mt-8 flex items-center justify-center gap-2">
                <button
                  onClick={() => setPageNum((p) => Math.max(1, p - 1))}
                  disabled={pageNum === 1}
                  className="rounded-lg border border-[#1E1E1E] bg-[#141414] px-4 py-2 text-sm text-[#A0A0A0] transition-colors hover:text-white disabled:opacity-30"
                >
                  Previous
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                  <button
                    key={page}
                    onClick={() => setPageNum(page)}
                    className={`h-9 w-9 rounded-lg text-sm font-medium transition-colors ${
                      pageNum === page
                        ? 'bg-[#2D6CDF] text-white'
                        : 'border border-[#1E1E1E] bg-[#141414] text-[#A0A0A0] hover:text-white'
                    }`}
                  >
                    {page}
                  </button>
                ))}
                <button
                  onClick={() => setPageNum((p) => Math.min(totalPages, p + 1))}
                  disabled={pageNum === totalPages}
                  className="rounded-lg border border-[#1E1E1E] bg-[#141414] px-4 py-2 text-sm text-[#A0A0A0] transition-colors hover:text-white disabled:opacity-30"
                >
                  Next
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function FilterSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border-b border-[#1E1E1E] pb-6">
      <h3 className="mb-4 text-[13px] font-bold uppercase tracking-[0.1em] text-white">
        {title}
      </h3>
      {children}
    </div>
  );
}

export default function CatalogPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#0A0A0A] pt-16" />}>
      <CatalogContent />
    </Suspense>
  );
}
