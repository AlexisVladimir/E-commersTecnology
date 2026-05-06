'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import type { Product, CartItem, CartTotals, CheckoutStep, AccountTab, UserProfile } from '@/types';
import { apiFetch } from '@/lib/api';

interface StoreContextType {
  // Cart
  cartItems: CartItem[];
  cartTotals: CartTotals;
  isCartReady: boolean;
  addToCart: (product: Product, quantity?: number, variant?: string) => Promise<void>;
  removeFromCart: (productId: string, variant?: string) => Promise<void>;
  updateQuantity: (productId: string, quantity: number, variant?: string) => Promise<void>;
  clearCart: () => void;
  cartOpen: boolean;
  setCartOpen: (open: boolean) => void;

  // Search
  searchOpen: boolean;
  setSearchOpen: (open: boolean) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;

  // Auth
  authOpen: boolean;
  setAuthOpen: (open: boolean) => void;
  isLoggedIn: boolean;
  setIsLoggedIn: (loggedIn: boolean) => void;
  user: UserProfile | null;
  setUser: (user: UserProfile | null) => void;
  isAdmin: boolean;
  authMode: 'login' | 'register';
  setAuthMode: (mode: 'login' | 'register') => void;

  // Checkout
  checkoutStep: CheckoutStep;
  setCheckoutStep: (step: CheckoutStep) => void;
  orderPlaced: boolean;
  setOrderPlaced: (placed: boolean) => void;

  // Account
  accountTab: AccountTab;
  setAccountTab: (tab: AccountTab) => void;
}

const StoreContext = createContext<StoreContextType | undefined>(undefined);
const AUTH_SESSION_KEY = 'auth:active';

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [cartTotals, setCartTotals] = useState<CartTotals>({
    subtotal: 0,
    shipping: 0,
    tax: 0,
    total: 0,
  });
  const [isCartReady, setIsCartReady] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [authOpen, setAuthOpen] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [checkoutStep, setCheckoutStep] = useState<CheckoutStep>('shipping');
  const [orderPlaced, setOrderPlaced] = useState(false);
  const [accountTab, setAccountTab] = useState<AccountTab>('profile');
  const isAdmin = !!user?.isAdmin;

  useEffect(() => {
    const resetCartState = () => {
      setCartItems([]);
      setCartTotals({ subtotal: 0, shipping: 0, tax: 0, total: 0 });
    };

    const loadCart = async () => {
      try {
        const response = await apiFetch<{ items: CartItem[]; totals: CartTotals }>('/cart/');
        setCartItems(response.items);
        setCartTotals(response.totals);
      } catch {
        resetCartState();
      }
    };

    const initSession = async () => {
      const hasSession = sessionStorage.getItem(AUTH_SESSION_KEY) === '1';
      if (!hasSession) {
        try {
          await apiFetch('/users/logout/', { method: 'POST' });
        } catch {
          // Ignore logout errors for anonymous visitors.
        }
        setUser(null);
        setIsLoggedIn(false);
        resetCartState();
        setIsCartReady(true);
        return;
      }

      try {
        const response = await apiFetch<{ user: UserProfile | null }>('/users/me/');
        setUser(response.user);
        setIsLoggedIn(!!response.user);
        if (response.user) {
          await loadCart();
        } else {
          resetCartState();
        }
      } catch {
        setUser(null);
        setIsLoggedIn(false);
        resetCartState();
      } finally {
        setIsCartReady(true);
      }
    };

    initSession();
  }, []);

  const addToCart = async (product: Product, quantity = 1, variant?: string) => {
    if (isAdmin) return;
    if (!isLoggedIn) {
      setAuthMode('login');
      setAuthOpen(true);
      return;
    }
    if (product.stockQuantity <= 0) {
      throw new Error('Product is out of stock');
    }
    if (quantity > product.stockQuantity) {
      throw new Error(`Insufficient stock. Available: ${product.stockQuantity}`);
    }
    const response = await apiFetch<{ item: CartItem; totals: CartTotals }>(
      '/cart/items/',
      {
        method: 'POST',
        body: JSON.stringify({ productId: product.id, quantity, variant }),
      }
    );

    setCartItems((prev) => {
      const existing = prev.find(
        (item) => item.product.id === product.id && item.variant === (variant || undefined)
      );
      if (!existing) {
        return [...prev, response.item];
      }
      return prev.map((item) =>
        item.product.id === product.id && item.variant === (variant || undefined)
          ? response.item
          : item
      );
    });
    setCartTotals(response.totals);
  };

  const removeFromCart = async (productId: string, variant?: string) => {
    if (isAdmin) return;
    if (!isLoggedIn) return;
    const response = await apiFetch<{ items: CartItem[]; totals: CartTotals }>('/cart/items/', {
      method: 'DELETE',
      body: JSON.stringify({ productId, variant }),
    });
    setCartItems(response.items);
    setCartTotals(response.totals);
  };

  const updateQuantity = async (productId: string, quantity: number, variant?: string) => {
    if (isAdmin) return;
    if (!isLoggedIn) return;
    const response = await apiFetch<{ item?: CartItem; items?: CartItem[]; totals: CartTotals }>(
      '/cart/items/',
      {
        method: 'PATCH',
        body: JSON.stringify({ productId, quantity, variant }),
      }
    );
    if (response.items) {
      setCartItems(response.items);
    } else if (response.item) {
      setCartItems((prev) =>
        prev.map((item) =>
          item.product.id === productId && item.variant === (variant || undefined)
            ? response.item!
            : item
        )
      );
    }
    setCartTotals(response.totals);
  };

  const clearCart = () => {
    setCartItems([]);
    setCartTotals({ subtotal: 0, shipping: 0, tax: 0, total: 0 });
  };

  return (
    <StoreContext.Provider
      value={{
        cartItems,
        cartTotals,
        isCartReady,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        cartOpen,
        setCartOpen,
        searchOpen,
        setSearchOpen,
        searchQuery,
        setSearchQuery,
        authOpen,
        setAuthOpen,
        isLoggedIn,
        setIsLoggedIn,
        user,
        setUser,
        isAdmin,
        authMode,
        setAuthMode,
        checkoutStep,
        setCheckoutStep,
        orderPlaced,
        setOrderPlaced,
        accountTab,
        setAccountTab,
      }}
    >
      {children}
    </StoreContext.Provider>
  );
}

export function useStore() {
  const context = useContext(StoreContext);
  if (context === undefined) {
    throw new Error('useStore must be used within a StoreProvider');
  }
  return context;
}
