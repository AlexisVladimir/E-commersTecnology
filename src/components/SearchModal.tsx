'use client';

import { Search, X, Clock, TrendingUp } from 'lucide-react';
import { useStore } from '@/context/StoreContext';
import { apiFetch } from '@/lib/api';
import { useEffect, useState } from 'react';
import ProductCard from './ProductCard';
import type { Product } from '@/types';

const recentSearches = ['gaming laptop', 'wireless earbuds', 'mechanical keyboard'];
const trending = ['RTX 4080', 'Smartwatch', '4K Monitor', 'SSD'];

export default function SearchModal() {
  const { searchOpen, setSearchOpen } = useStore();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Product[]>([]);

  useEffect(() => {
    const load = async () => {
      if (!query.trim()) {
        setResults([]);
        return;
      }
      try {
        const response = await apiFetch<{ items: Product[] }>(
          `/catalog/products/?search=${encodeURIComponent(query)}&pageSize=6`
        );
        setResults(response.items || []);
      } catch {
        setResults([]);
      }
    };

    const handler = setTimeout(load, 250);
    return () => clearTimeout(handler);
  }, [query]);

  if (!searchOpen) return null;

  return (
    <div className="fixed inset-0 z-[70] flex flex-col items-start pt-20">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={() => {
          setSearchOpen(false);
          setQuery('');
        }}
      />

      {/* Modal */}
      <div className="relative mx-auto w-full max-w-3xl px-4">
        <div className="rounded-xl border border-[#1E1E1E] bg-[#141414] shadow-2xl overflow-hidden">
          {/* Input */}
          <div className="flex items-center gap-3 border-b border-[#1E1E1E] px-4 py-3">
            <Search size={20} className="text-[#808080]" />
            <input
              type="text"
              autoFocus
              placeholder="Search products, categories..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="flex-1 bg-transparent text-base text-white placeholder-[#606060] outline-none"
            />
            <button
              onClick={() => {
                setSearchOpen(false);
                setQuery('');
              }}
              className="rounded-md p-1.5 text-[#808080] hover:text-white hover:bg-[#1A1A1A] transition-colors"
            >
              <X size={18} />
            </button>
          </div>

          {/* Content */}
          <div className="max-h-[60vh] overflow-y-auto p-4">
            {!query.trim() ? (
              <div className="space-y-6">
                {/* Recent */}
                <div>
                  <h3 className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-[#606060]">
                    <Clock size={14} />
                    Recent Searches
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {recentSearches.map((term) => (
                      <button
                        key={term}
                        onClick={() => setQuery(term)}
                        className="rounded-full border border-[#1E1E1E] px-4 py-2 text-sm text-[#A0A0A0] hover:border-[#2D6CDF] hover:text-white transition-colors"
                      >
                        {term}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Trending */}
                <div>
                  <h3 className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-[#606060]">
                    <TrendingUp size={14} />
                    Trending
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {trending.map((term) => (
                      <button
                        key={term}
                        onClick={() => setQuery(term)}
                        className="rounded-full border border-[#1E1E1E] px-4 py-2 text-sm text-[#A0A0A0] hover:border-[#2D6CDF] hover:text-white transition-colors"
                      >
                        {term}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ) : results.length > 0 ? (
              <div>
                <p className="mb-3 text-xs text-[#808080]">
                  {results.length} result{results.length !== 1 ? 's' : ''} for &quot;{query}&quot;
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {results.map((product) => (
                    <ProductCard key={product.id} product={product} />
                  ))}
                </div>
              </div>
            ) : (
              <div className="py-8 text-center text-[#808080]">
                <p className="text-sm">No products found for &quot;{query}&quot;</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
