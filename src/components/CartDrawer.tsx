'use client';

import { X, Plus, Minus, Trash2, ShoppingBag } from 'lucide-react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useStore } from '@/context/StoreContext';

export default function CartDrawer() {
  const {
    cartItems,
    cartTotals,
    cartOpen,
    setCartOpen,
    removeFromCart,
    updateQuantity,
    setCheckoutStep,
    isAdmin,
    isLoggedIn,
    setAuthOpen,
    setAuthMode,
  } = useStore();
  const router = useRouter();

  const { subtotal, shipping, tax, total } = cartTotals;

  const handleCheckout = () => {
    if (!isLoggedIn) {
      setAuthMode('login');
      setAuthOpen(true);
      return;
    }
    setCartOpen(false);
    setCheckoutStep('shipping');
    router.push('/checkout');
  };

  if (!cartOpen) return null;

  if (isAdmin) {
    return (
      <div className="fixed inset-0 z-[60] flex justify-end">
        <div
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          onClick={() => setCartOpen(false)}
        />
        <div className="relative flex h-full w-full max-w-[420px] flex-col bg-[#0A0A0A] border-l border-[#1E1E1E] shadow-2xl animate-in slide-in-from-right duration-300">
          <div className="flex items-center justify-between border-b border-[#1E1E1E] px-6 py-4">
            <h2 className="text-lg font-semibold text-white">Shopping Cart</h2>
            <button
              onClick={() => setCartOpen(false)}
              className="rounded-md p-1.5 text-[#808080] hover:text-white hover:bg-[#1A1A1A] transition-colors"
            >
              <X size={20} />
            </button>
          </div>
          <div className="flex h-full flex-col items-center justify-center gap-4 px-6 text-center text-[#808080]">
            <ShoppingBag size={48} className="text-[#333333]" />
            <p className="text-sm">Admin accounts cannot use the cart or checkout.</p>
            <button
              onClick={() => {
                setCartOpen(false);
                router.push('/catalog');
              }}
              className="rounded-lg bg-[#2D6CDF] px-6 py-2.5 text-sm font-medium text-white hover:bg-[#2563c7] transition-colors"
            >
              Back to catalog
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[60] flex justify-end">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={() => setCartOpen(false)}
      />

      {/* Drawer */}
      <div className="relative flex h-full w-full max-w-[420px] flex-col bg-[#0A0A0A] border-l border-[#1E1E1E] shadow-2xl animate-in slide-in-from-right duration-300">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#1E1E1E] px-6 py-4">
          <h2 className="text-lg font-semibold text-white">Shopping Cart</h2>
          <button
            onClick={() => setCartOpen(false)}
            className="rounded-md p-1.5 text-[#808080] hover:text-white hover:bg-[#1A1A1A] transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Items */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {cartItems.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center gap-4 text-[#808080]">
              <ShoppingBag size={48} className="text-[#333333]" />
              <p className="text-sm">Your cart is empty</p>
              <button
                onClick={() => {
                  setCartOpen(false);
                  router.push('/catalog');
                }}
                className="rounded-lg bg-[#2D6CDF] px-6 py-2.5 text-sm font-medium text-white hover:bg-[#2563c7] transition-colors"
              >
                Continue Shopping
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {cartItems.map((item) => (
                <div
                  key={`${item.product.id}-${item.variant}`}
                  className="flex gap-4 rounded-lg border border-[#1E1E1E] bg-[#141414] p-3"
                >
                  <div className="relative h-20 w-20 flex-shrink-0 overflow-hidden rounded-md bg-[#1A1A1A]">
                    <Image
                      src={item.product.image}
                      alt={item.product.name}
                      fill
                      sizes="80px"
                      className="object-cover"
                    />
                  </div>
                  <div className="flex flex-1 flex-col justify-between">
                    <div>
                      <h4 className="text-sm font-medium text-white line-clamp-1">
                        {item.product.name}
                      </h4>
                      {item.variant && (
                        <p className="text-xs text-[#808080] mt-0.5">{item.variant}</p>
                      )}
                      <p className="mt-1 text-sm font-semibold text-white">
                        ${(item.product.price * item.quantity).toLocaleString()}
                      </p>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() =>
                            updateQuantity(item.product.id, item.quantity - 1, item.variant)
                          }
                          className="rounded-md border border-[#1E1E1E] p-1 text-[#808080] hover:text-white hover:border-[#808080] transition-colors"
                        >
                          <Minus size={14} />
                        </button>
                        <span className="w-6 text-center text-sm text-white">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() =>
                            updateQuantity(item.product.id, item.quantity + 1, item.variant)
                          }
                          className="rounded-md border border-[#1E1E1E] p-1 text-[#808080] hover:text-white hover:border-[#808080] transition-colors"
                        >
                          <Plus size={14} />
                        </button>
                      </div>
                      <button
                        onClick={() => removeFromCart(item.product.id, item.variant)}
                        className="rounded-md p-1.5 text-[#808080] hover:text-red-400 hover:bg-red-400/10 transition-colors"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Summary */}
        {cartItems.length > 0 && (
          <div className="border-t border-[#1E1E1E] px-6 py-4 space-y-3">
            <div className="flex justify-between text-sm text-[#A0A0A0]">
              <span>Subtotal</span>
              <span className="text-white">${subtotal.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-sm text-[#A0A0A0]">
              <span>Shipping</span>
              <span className={shipping === 0 ? 'text-green-400' : 'text-white'}>
                {shipping === 0 ? 'Free' : `$${shipping}`}
              </span>
            </div>
            <div className="flex justify-between text-sm text-[#A0A0A0]">
              <span>Tax</span>
              <span className="text-white">${tax.toFixed(2)}</span>
            </div>
            <div className="flex justify-between border-t border-[#1E1E1E] pt-3">
              <span className="text-base font-semibold text-white">Total</span>
              <span className="text-base font-bold text-white">
                ${total.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </span>
            </div>
            <button
              onClick={handleCheckout}
              className="w-full rounded-lg bg-[#2D6CDF] py-3 text-sm font-semibold text-white hover:bg-[#2563c7] transition-colors"
            >
              Proceed to Checkout
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
