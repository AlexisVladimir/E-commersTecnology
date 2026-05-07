import { ArrowRight, ChevronRight, Laptop, Smartphone, Headphones, Watch, Mouse, Gamepad2, HardDrive, Cable } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import ProductCard from '@/components/ProductCard';
import { API_BASE } from '@/lib/api';
import type { Product } from '@/types';

const iconMap: Record<string, React.ReactNode> = {
  Laptop: <Laptop size={24} />,
  Smartphone: <Smartphone size={24} />,
  Headphones: <Headphones size={24} />,
  Watch: <Watch size={24} />,
  Mouse: <Mouse size={24} />,
  Gamepad2: <Gamepad2 size={24} />,
  HardDrive: <HardDrive size={24} />,
  Cable: <Cable size={24} />,
};

export default async function HomePage() {
  const [productsRes, categoriesRes] = await Promise.allSettled([
    fetch(`${API_BASE}/catalog/products/?pageSize=100`, { cache: 'no-store' }),
    fetch(`${API_BASE}/catalog/categories/`, { cache: 'no-store' }),
  ]);

  const productsData: { items: Product[] } =
    productsRes.status === 'fulfilled' && productsRes.value.ok
      ? ((await productsRes.value.json()) as { items: Product[] })
      : { items: [] };

  const categoriesData: { items: { name: string; icon?: string | null }[] } =
    categoriesRes.status === 'fulfilled' && categoriesRes.value.ok
      ? ((await categoriesRes.value.json()) as { items: { name: string; icon?: string | null }[] })
      : { items: [] };

  const products = productsData.items;
  const categories = categoriesData.items;

  const featuredProducts = products.filter((p) => p.badge === 'Sale').slice(0, 4);
  const newArrivals = products.filter((p) => p.badge === 'New').slice(0, 4);
  const bestDeals = products.filter((p) => p.originalPrice).slice(0, 4);

  return (
    <div className="min-h-screen bg-[#0A0A0A]">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-[#0D0D0D] pt-16">
        <div
          className="absolute inset-0 opacity-[0.08]"
          style={{
            backgroundImage: `
              linear-gradient(to right, #161616 1px, transparent 1px),
              linear-gradient(to bottom, #161616 1px, transparent 1px)
            `,
            backgroundSize: '60px 60px',
          }}
        />

        <div className="relative mx-auto max-w-[1400px] px-4 py-20 lg:px-8 lg:py-28">
          <div className="grid items-center gap-12 lg:grid-cols-2">
            <div className="space-y-6">
              <h1 className="text-4xl font-bold leading-tight text-white sm:text-5xl lg:text-[56px]">
                Next-level tech.
                <br />
                <span className="text-[#2D6CDF]">Delivered.</span>
              </h1>
              <p className="max-w-lg text-lg text-[#808080]">
                Discover premium electronics curated for professionals, gamers, and creators who demand the best.
              </p>
              <div className="flex flex-wrap gap-4">
                <Link
                  href="/catalog"
                  className="rounded-lg bg-[#2D6CDF] px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#2563c7]"
                >
                  Shop Now
                </Link>
                <Link
                  href="/catalog"
                  className="rounded-lg border border-white/20 px-6 py-3 text-sm font-semibold text-white transition-colors hover:border-white hover:bg-white/5"
                >
                  View Deals
                </Link>
              </div>
            </div>

            <div className="relative flex items-center justify-center">
              <div className="relative w-full max-w-lg">
                <Image
                  src="/hero-laptop.jpg"
                  alt="Premium Gaming Laptop"
                  width={600}
                  height={400}
                  priority
                  className="relative z-10 w-full rounded-xl"
                />
                <div className="absolute -bottom-8 left-1/2 h-16 w-[80%] -translate-x-1/2 rounded-full bg-[#2D6CDF]/20 blur-2xl" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Category Strip */}
      <section className="border-b border-[#1E1E1E] bg-[#0A0A0A]">
        <div className="mx-auto max-w-[1400px] px-4 py-8 lg:px-8">
          <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
            {categories.map((cat) => (
              <Link
                key={cat.name}
                href={`/catalog?category=${encodeURIComponent(cat.name)}`}
                className="flex flex-shrink-0 items-center gap-3 rounded-xl border border-[#1E1E1E] bg-[#141414] px-5 py-3 text-[#A0A0A0] transition-all duration-200 hover:border-[#2D6CDF] hover:text-white"
              >
                <span className="text-[#2D6CDF]">{cat.icon ? iconMap[cat.icon] : null}</span>
                <span className="text-sm font-medium">{cat.name}</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Products */}
      <ProductSection
        title="Featured Products"
        subtitle="Hand-picked favorites from our catalog"
        items={featuredProducts}
      />

      {/* New Arrivals */}
      <ProductSection
        title="New Arrivals"
        subtitle="The latest drops you can't miss"
        items={newArrivals}
      />

      {/* Best Deals */}
      <ProductSection
        title="Best Deals"
        subtitle="Unbeatable prices on premium gear"
        items={bestDeals}
        bg="#0D0D0D"
      />
    </div>
  );
}

function ProductSection({
  title,
  subtitle,
  items,
  bg = '#0A0A0A',
}: {
  title: string;
  subtitle: string;
  items: Product[];
  bg?: string;
}) {
  return (
    <section className="border-b border-[#1E1E1E]" style={{ backgroundColor: bg }}>
      <div className="mx-auto max-w-[1400px] px-4 py-14 lg:px-8">
        <div className="mb-8 flex items-end justify-between">
          <div>
            <h2 className="text-2xl font-bold text-white">{title}</h2>
            <p className="mt-1 text-sm text-[#808080]">{subtitle}</p>
          </div>
          <Link
            href="/catalog"
            className="hidden items-center gap-1 text-sm font-medium text-[#2D6CDF] hover:underline sm:flex"
          >
            View All
            <ArrowRight size={16} />
          </Link>
        </div>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {items.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>

        <Link
          href="/catalog"
          className="mt-6 flex w-full items-center justify-center gap-1 rounded-lg border border-[#1E1E1E] py-3 text-sm font-medium text-[#A0A0A0] hover:border-[#2D6CDF] hover:text-white transition-colors sm:hidden"
        >
          View All Products
          <ChevronRight size={16} />
        </Link>
      </div>
    </section>
  );
}
