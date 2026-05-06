export interface Product {
  id: string;
  name: string;
  category: string;
  price: number;
  originalPrice?: number;
  rating: number;
  reviewCount: number;
  image: string;
  badge?: 'New' | 'Sale';
  description: string;
  specs: Record<string, string>;
  variants?: {
    colors?: { name: string; value: string }[];
    sizes?: { name: string; value: string }[];
  };
  inStock: boolean;
  stockQuantity: number;
}

export interface CartItem {
  product: Product;
  quantity: number;
  variant?: string;
}

export interface CartTotals {
  subtotal: number;
  shipping: number;
  tax: number;
  total: number;
}

export interface UserProfile {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string | null;
  isAdmin?: boolean;
}

export type CheckoutStep = 'shipping' | 'payment' | 'review';

export type AccountTab = 'profile' | 'orders' | 'wishlist' | 'addresses' | 'settings';

export interface FilterState {
  categories: string[];
  priceRange: [number, number];
  brands: string[];
  rating: number | null;
}
