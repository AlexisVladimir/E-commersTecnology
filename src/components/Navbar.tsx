'use client';

import { Search, ShoppingCart, User, Menu, X } from 'lucide-react';
import Link from 'next/link';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { useStore } from '@/context/StoreContext';
import { useState } from 'react';

const navLinks = [
  { label: 'Laptops', category: 'Laptops' },
  { label: 'Smartphones', category: 'Smartphones' },
  { label: 'Peripherals', category: 'Peripherals' },
  { label: 'Components', category: 'Components' },
  { label: 'Deals', category: null },
];

export default function Navbar() {
  const {
    cartItems,
    setCartOpen,
    setSearchOpen,
    setAuthOpen,
    isLoggedIn,
    setAccountTab,
    isAdmin,
  } = useStore();

  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentCategory = searchParams.get('category');

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const cartCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);

  const handleNavClick = (category: string | null) => {
    const url = category ? `/catalog?category=${encodeURIComponent(category)}` : '/catalog';
    router.push(url);
    setMobileMenuOpen(false);
  };

  const handleAccountClick = () => {
    if (isLoggedIn) {
      setAccountTab('profile');
      router.push('/account');
    } else {
      setAuthOpen(true);
    }
  };

  const isActive = (category: string | null) => {
    if (pathname !== '/catalog') return false;
    return currentCategory === category || (category === null && !currentCategory);
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 h-16 border-b border-[#1E1E1E] bg-[#0A0A0A]/95 backdrop-blur-sm">
      <div className="mx-auto flex h-full max-w-[1400px] items-center justify-between px-4 lg:px-8">
        {/* Logo */}
        <Link
          href="/"
          className="text-xl font-bold text-white tracking-tight hover:opacity-80 transition-opacity"
        >
          TechStore
        </Link>

        {/* Desktop Nav Links */}
        <div className="hidden md:flex items-center gap-1">
          {navLinks.map((link) => (
            <button
              key={link.label}
              onClick={() => handleNavClick(link.category)}
              className={`px-4 py-2 text-sm font-medium transition-all duration-200 rounded-md ${
                isActive(link.category)
                  ? 'text-white border-b-2 border-[#2D6CDF] -mb-[1px]'
                  : 'text-[#A0A0A0] hover:text-white'
              }`}
            >
              {link.label}
            </button>
          ))}
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setSearchOpen(true)}
            className="p-2 text-[#A0A0A0] hover:text-white transition-colors rounded-md hover:bg-[#1A1A1A]"
            aria-label="Search"
          >
            <Search size={20} />
          </button>

          {!isAdmin && (
            <button
              onClick={() => setCartOpen(true)}
              className="relative p-2 text-[#A0A0A0] hover:text-white transition-colors rounded-md hover:bg-[#1A1A1A]"
              aria-label="Cart"
            >
              <ShoppingCart size={20} />
              {cartCount > 0 && (
                <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-[#2D6CDF] text-[10px] font-bold text-white">
                  {cartCount}
                </span>
              )}
            </button>
          )}

          <button
            onClick={handleAccountClick}
            className="p-2 text-[#A0A0A0] hover:text-white transition-colors rounded-md hover:bg-[#1A1A1A]"
            aria-label="Account"
          >
            <User size={20} />
          </button>

          {/* Mobile Menu Toggle */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 text-[#A0A0A0] hover:text-white transition-colors rounded-md hover:bg-[#1A1A1A]"
            aria-label="Menu"
          >
            {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden absolute top-16 left-0 right-0 bg-[#0A0A0A] border-b border-[#1E1E1E] py-4 px-4">
          {navLinks.map((link) => (
            <button
              key={link.label}
              onClick={() => handleNavClick(link.category)}
              className={`block w-full text-left px-4 py-3 text-sm font-medium transition-colors rounded-md ${
                isActive(link.category)
                  ? 'text-white bg-[#1A1A1A]'
                  : 'text-[#A0A0A0] hover:text-white hover:bg-[#141414]'
              }`}
            >
              {link.label}
            </button>
          ))}
        </div>
      )}
    </nav>
  );
}
