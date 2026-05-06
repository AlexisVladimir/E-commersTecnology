'use client';

import { useEffect, useRef, useState } from 'react';
import { ChevronRight, Check, Truck, CreditCard, ClipboardCheck, Shield, ShoppingBag } from 'lucide-react';
import Image from 'next/image';
import Script from 'next/script';
import { useStore } from '@/context/StoreContext';
import { apiFetch } from '@/lib/api';
import type { CartItem, CartTotals, CheckoutStep } from '@/types';

export default function CheckoutPage() {
  const {
    cartItems,
    cartTotals,
    checkoutStep,
    setCheckoutStep,
    clearCart,
    isCartReady,
    isAdmin,
    isLoggedIn,
    setAuthOpen,
    setAuthMode,
  } = useStore();
  const isCartEmpty = cartItems.length === 0;
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);
  const [isCreatingOrder, setIsCreatingOrder] = useState(false);
  const [isReloading, setIsReloading] = useState(false);
  const [orderNumber, setOrderNumber] = useState('');
  const [paypalClientId, setPaypalClientId] = useState('');
  const [paypalCurrency, setPaypalCurrency] = useState('USD');
  const [isPaypalReady, setIsPaypalReady] = useState(false);
  const [isPaymentApproved, setIsPaymentApproved] = useState(false);
  const [orderSnapshot, setOrderSnapshot] = useState<{ items: CartItem[]; totals: CartTotals } | null>(null);
  const paypalButtonsRef = useRef<HTMLDivElement | null>(null);
  const paypalRenderedRef = useRef(false);
  const [shippingData, setShippingData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    address: '',
    city: '',
    zip: '',
    country: 'United States',
  });
  const { subtotal, shipping, tax, total } = cartTotals;
  const summaryItems = orderSnapshot && isCartEmpty ? orderSnapshot.items : cartItems;
  const summaryTotals = orderSnapshot && isCartEmpty ? orderSnapshot.totals : cartTotals;
  const isSummaryEmpty = summaryItems.length === 0;
  const shippingName = [shippingData.firstName, shippingData.lastName].filter(Boolean).join(' ') || '—';
  const shippingLine = shippingData.address || '—';
  const shippingCityLine = [shippingData.city, shippingData.zip].filter(Boolean).join(', ') || '—';
  const shippingCountry = shippingData.country || '—';
  const shippingEmail = shippingData.email || '—';

  const steps: { key: CheckoutStep; label: string; icon: React.ReactNode }[] = [
    { key: 'shipping', label: 'Shipping', icon: <Truck size={16} /> },
    { key: 'payment', label: 'Payment', icon: <CreditCard size={16} /> },
    { key: 'review', label: 'Review', icon: <ClipboardCheck size={16} /> },
  ];

  useEffect(() => {
    const reloadKey = 'checkout:reloaded';
    if (!sessionStorage.getItem(reloadKey)) {
      setIsReloading(true);
      sessionStorage.setItem(reloadKey, '1');
      window.location.reload();
      return;
    }
    sessionStorage.removeItem(reloadKey);
    setCheckoutStep('shipping');
    setOrderNumber('');
    setIsPaymentApproved(false);
    setIsPlacingOrder(false);
    setIsCreatingOrder(false);
    setOrderSnapshot(null);
    paypalRenderedRef.current = false;
  }, [setCheckoutStep]);

  useEffect(() => {
    apiFetch<{ clientId: string; currency: string }>('/payments/paypal/config/')
      .then((response) => {
        setPaypalClientId(response.clientId);
        setPaypalCurrency(response.currency || 'USD');
      })
      .catch(() => {
        // The checkout flow will surface an error when trying to render PayPal.
      });
  }, []);

  useEffect(() => {
    if (!isPaypalReady || !orderNumber || !paypalButtonsRef.current) {
      return;
    }
    if (paypalRenderedRef.current) {
      return;
    }
    const paypal = (window as typeof window & { paypal?: any }).paypal;
    if (!paypal) {
      return;
    }

    paypalRenderedRef.current = true;
    paypal
      .Buttons({
        style: {
          layout: 'vertical',
          height: 48,
          shape: 'rect',
          label: 'paypal',
        },
        createOrder: async () => {
          const response = await apiFetch<{ paypalOrderId: string }>(
            '/payments/paypal/create-order/',
            {
              method: 'POST',
              body: JSON.stringify({ orderNumber }),
            }
          );
          return response.paypalOrderId;
        },
        onApprove: async (data: { orderID: string }) => {
          await apiFetch('/payments/paypal/capture/', {
            method: 'POST',
            body: JSON.stringify({ paypalOrderId: data.orderID, orderNumber }),
          });
          setOrderSnapshot({
            items: cartItems.map((item) => ({
              ...item,
              product: { ...item.product },
            })),
            totals: { ...cartTotals },
          });
          clearCart();
          setIsPaymentApproved(true);
          setCheckoutStep('review');
        },
        onError: () => {
          alert('Unable to start PayPal checkout. Please try again.');
        },
      })
      .render(paypalButtonsRef.current);
  }, [cartItems, cartTotals, clearCart, isPaypalReady, orderNumber]);

  const handlePlaceOrder = async () => {
    if (isPlacingOrder || isCreatingOrder || orderNumber) return;
    setIsPlacingOrder(true);
    setIsCreatingOrder(true);
    try {
      const orderResponse = await apiFetch<{ orderNumber: string }>('/orders/create/', {
        method: 'POST',
        body: JSON.stringify({
          shipping: {
            firstName: shippingData.firstName,
            lastName: shippingData.lastName,
            email: shippingData.email,
            address: shippingData.address,
            city: shippingData.city,
            zip: shippingData.zip,
            country: shippingData.country,
          },
        }),
      });

      setOrderNumber(orderResponse.orderNumber);
      setIsPlacingOrder(false);
      setIsCreatingOrder(false);
    } catch (error) {
      console.error('PayPal checkout failed', error);
      alert('Unable to start PayPal checkout. Please try again.');
      setIsPlacingOrder(false);
      setIsCreatingOrder(false);
    }
  };

  const canProceed = () => {
    if (cartItems.length === 0) {
      return false;
    }
    if (checkoutStep === 'shipping') {
      return shippingData.firstName && shippingData.lastName && shippingData.email && shippingData.address;
    }
    return true;
  };

  if (isReloading) {
    return (
      <div className="min-h-screen bg-[#0A0A0A]">
        <div className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-6 text-center">
          <div className="mb-4 h-10 w-10 animate-spin rounded-full border-2 border-[#2D6CDF] border-t-transparent" />
          <p className="text-sm text-[#808080]">Loading checkout...</p>
        </div>
      </div>
    );
  }

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] pt-16">
        <div className="mx-auto flex max-w-md flex-col items-center justify-center px-6 py-16 text-center">
          <h1 className="text-2xl font-semibold text-white">Sign in to checkout</h1>
          <p className="mt-2 text-sm text-[#808080]">
            Create an account or sign in to add items to your cart and pay securely.
          </p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <button
              onClick={() => {
                setAuthMode('login');
                setAuthOpen(true);
              }}
              className="rounded-lg bg-[#2D6CDF] px-6 py-2.5 text-sm font-semibold text-white hover:bg-[#2563c7] transition-colors"
            >
              Sign in
            </button>
            <a
              href="/catalog"
              className="rounded-lg border border-[#1E1E1E] px-6 py-2.5 text-sm font-semibold text-[#A0A0A0] hover:text-white transition-colors"
            >
              Browse catalog
            </a>
          </div>
        </div>
      </div>
    );
  }

  if (isAdmin) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] pt-16">
        <div className="mx-auto flex max-w-md flex-col items-center justify-center px-6 py-16 text-center">
          <ShoppingBag size={40} className="mb-4 text-[#333333]" />
          <h1 className="text-xl font-semibold text-white">Admin access only</h1>
          <p className="mt-2 text-sm text-[#808080]">
            Admin accounts cannot use the checkout flow.
          </p>
          <a
            href="/catalog"
            className="mt-6 rounded-lg bg-[#2D6CDF] px-6 py-2.5 text-sm font-semibold text-white hover:bg-[#2563c7] transition-colors"
          >
            Back to catalog
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A] pt-16">
      {paypalClientId && (
        <Script
          src={`https://www.paypal.com/sdk/js?client-id=${paypalClientId}&currency=${paypalCurrency}&intent=capture`}
          strategy="afterInteractive"
          onLoad={() => setIsPaypalReady(true)}
        />
      )}
      <div className="mx-auto max-w-[1200px] px-4 py-8 lg:px-8">
        <h1 className="mb-8 text-2xl font-bold text-white">Checkout</h1>

        {/* Progress */}
        <div className="mb-10">
          <div className="flex items-center">
            {steps.map((step, i) => (
              <div key={step.key} className="flex items-center">
                <div className="flex items-center gap-2">
                  <div
                    className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold transition-colors ${
                      steps.findIndex((s) => s.key === checkoutStep) >= i
                        ? 'bg-[#2D6CDF] text-white'
                        : 'border border-[#1E1E1E] bg-[#141414] text-[#606060]'
                    }`}
                  >
                    {steps.findIndex((s) => s.key === checkoutStep) > i ? (
                      <Check size={14} />
                    ) : (
                      i + 1
                    )}
                  </div>
                  <span
                    className={`text-sm font-medium ${
                      steps.findIndex((s) => s.key === checkoutStep) >= i
                        ? 'text-white'
                        : 'text-[#606060]'
                    }`}
                  >
                    {step.label}
                  </span>
                </div>
                {i < steps.length - 1 && (
                  <div className="mx-4 h-[1px] w-12 bg-[#1E1E1E]">
                    <div
                      className="h-full bg-[#2D6CDF] transition-all"
                      style={{
                        width:
                          steps.findIndex((s) => s.key === checkoutStep) > i ? '100%' : '0%',
                      }}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
          {/* Form */}
          <div className="space-y-6">
            {checkoutStep === 'shipping' && (
              <div className="rounded-xl border border-[#1E1E1E] bg-[#141414] p-6">
                <h2 className="mb-6 text-lg font-semibold text-white">Shipping Information</h2>
                {isCartReady && isCartEmpty && (
                  <div className="mb-6 rounded-lg border border-[#2D6CDF]/40 bg-[#0A0A0A] px-4 py-3 text-sm text-[#A0A0A0]">
                    <p>Your cart is empty. Add at least one item to continue checkout.</p>
                    <a
                      href="/catalog"
                      className="mt-3 inline-flex items-center rounded-md border border-[#2D6CDF]/50 px-3 py-1.5 text-xs font-semibold text-[#B5CCFF] transition-colors hover:border-[#2D6CDF] hover:text-white"
                    >
                      Back to catalog
                    </a>
                  </div>
                )}
                {isCartReady ? (
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-[#808080]">
                        First Name
                      </label>
                      <input
                        type="text"
                        disabled={isCartEmpty}
                        value={shippingData.firstName}
                        onChange={(e) => setShippingData({ ...shippingData, firstName: e.target.value })}
                        className="w-full rounded-lg border border-[#1E1E1E] bg-[#0A0A0A] px-4 py-2.5 text-sm text-white placeholder-[#505050] outline-none transition-colors focus:border-[#2D6CDF] disabled:cursor-not-allowed disabled:opacity-60"
                        placeholder="John"
                      />
                    </div>
                    <div>
                      <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-[#808080]">
                        Last Name
                      </label>
                      <input
                        type="text"
                        disabled={isCartEmpty}
                        value={shippingData.lastName}
                        onChange={(e) => setShippingData({ ...shippingData, lastName: e.target.value })}
                        className="w-full rounded-lg border border-[#1E1E1E] bg-[#0A0A0A] px-4 py-2.5 text-sm text-white placeholder-[#505050] outline-none transition-colors focus:border-[#2D6CDF] disabled:cursor-not-allowed disabled:opacity-60"
                        placeholder="Doe"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-[#808080]">
                        Email
                      </label>
                      <input
                        type="email"
                        disabled={isCartEmpty}
                        value={shippingData.email}
                        onChange={(e) => setShippingData({ ...shippingData, email: e.target.value })}
                        className="w-full rounded-lg border border-[#1E1E1E] bg-[#0A0A0A] px-4 py-2.5 text-sm text-white placeholder-[#505050] outline-none transition-colors focus:border-[#2D6CDF] disabled:cursor-not-allowed disabled:opacity-60"
                        placeholder="john@example.com"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-[#808080]">
                        Address
                      </label>
                      <input
                        type="text"
                        disabled={isCartEmpty}
                        value={shippingData.address}
                        onChange={(e) => setShippingData({ ...shippingData, address: e.target.value })}
                        className="w-full rounded-lg border border-[#1E1E1E] bg-[#0A0A0A] px-4 py-2.5 text-sm text-white placeholder-[#505050] outline-none transition-colors focus:border-[#2D6CDF] disabled:cursor-not-allowed disabled:opacity-60"
                        placeholder="123 Main Street"
                      />
                    </div>
                    <div>
                      <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-[#808080]">
                        City
                      </label>
                      <input
                        type="text"
                        disabled={isCartEmpty}
                        value={shippingData.city}
                        onChange={(e) => setShippingData({ ...shippingData, city: e.target.value })}
                        className="w-full rounded-lg border border-[#1E1E1E] bg-[#0A0A0A] px-4 py-2.5 text-sm text-white placeholder-[#505050] outline-none transition-colors focus:border-[#2D6CDF] disabled:cursor-not-allowed disabled:opacity-60"
                        placeholder="New York"
                      />
                    </div>
                    <div>
                      <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-[#808080]">
                        ZIP Code
                      </label>
                      <input
                        type="text"
                        disabled={isCartEmpty}
                        value={shippingData.zip}
                        onChange={(e) => setShippingData({ ...shippingData, zip: e.target.value })}
                        className="w-full rounded-lg border border-[#1E1E1E] bg-[#0A0A0A] px-4 py-2.5 text-sm text-white placeholder-[#505050] outline-none transition-colors focus:border-[#2D6CDF] disabled:cursor-not-allowed disabled:opacity-60"
                        placeholder="10001"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <div className="mb-2 h-3 w-24 rounded bg-[#1E1E1E]" />
                      <div className="h-10 rounded-lg bg-[#0A0A0A] animate-pulse" />
                    </div>
                    <div>
                      <div className="mb-2 h-3 w-24 rounded bg-[#1E1E1E]" />
                      <div className="h-10 rounded-lg bg-[#0A0A0A] animate-pulse" />
                    </div>
                    <div className="sm:col-span-2">
                      <div className="mb-2 h-3 w-16 rounded bg-[#1E1E1E]" />
                      <div className="h-10 rounded-lg bg-[#0A0A0A] animate-pulse" />
                    </div>
                    <div className="sm:col-span-2">
                      <div className="mb-2 h-3 w-20 rounded bg-[#1E1E1E]" />
                      <div className="h-10 rounded-lg bg-[#0A0A0A] animate-pulse" />
                    </div>
                    <div>
                      <div className="mb-2 h-3 w-12 rounded bg-[#1E1E1E]" />
                      <div className="h-10 rounded-lg bg-[#0A0A0A] animate-pulse" />
                    </div>
                    <div>
                      <div className="mb-2 h-3 w-16 rounded bg-[#1E1E1E]" />
                      <div className="h-10 rounded-lg bg-[#0A0A0A] animate-pulse" />
                    </div>
                  </div>
                )}
              </div>
            )}

            {checkoutStep === 'payment' && (
              <div className="rounded-xl border border-[#1E1E1E] bg-[#141414] p-6">
                <h2 className="mb-6 text-lg font-semibold text-white">Payment Method</h2>
                <div className="mt-2 flex flex-col gap-3">
                  {!orderNumber ? (
                    <button
                      onClick={handlePlaceOrder}
                      disabled={isPlacingOrder}
                      className="w-full rounded-lg bg-[#2D6CDF] px-8 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#2563c7] disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {isPlacingOrder
                        ? 'Preparing PayPal...'
                        : `Place Order — $${total.toLocaleString(undefined, { minimumFractionDigits: 2 })}`}
                    </button>
                  ) : (
                    <div className="text-xs text-[#808080]">
                      Complete payment with PayPal below.
                    </div>
                  )}
                  {orderNumber && (
                    <div className="w-full" ref={paypalButtonsRef} />
                  )}
                </div>
                <div className="mt-6 rounded-lg border border-[#1E1E1E] bg-[#0A0A0A] p-4 text-sm text-[#A0A0A0]">
                  You will be redirected to PayPal to complete your payment.
                </div>
                <div className="mt-4 flex items-center gap-3 rounded-lg border border-[#1E1E1E] bg-[#0A0A0A] p-4">
                  <Shield size={18} className="text-[#2D6CDF]" />
                  <p className="text-xs text-[#808080]">
                    Payments are processed securely by PayPal
                  </p>
                </div>
              </div>
            )}

            {checkoutStep === 'review' && (
              <div className="space-y-6">
                <div className="rounded-xl border border-[#1E1E1E] bg-[#141414] p-6">
                  <div className="flex items-center justify-between gap-3">
                    <h2 className="text-lg font-semibold text-white">Shipping Address</h2>
                    <span className="rounded-full border border-[#2D6CDF]/30 bg-[#0A0A0A] px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-[#B5CCFF]">
                      Confirmed
                    </span>
                  </div>
                  <div className="mt-4 grid gap-3 text-sm text-[#A0A0A0] sm:grid-cols-2">
                    <div>
                      <p className="text-xs uppercase tracking-wider text-[#606060]">Name</p>
                      <p className="text-white font-medium">{shippingName}</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-wider text-[#606060]">Email</p>
                      <p>{shippingEmail}</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-wider text-[#606060]">Street Address</p>
                      <p>{shippingLine}</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-wider text-[#606060]">City & ZIP</p>
                      <p>{shippingCityLine}</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-wider text-[#606060]">Country</p>
                      <p>{shippingCountry}</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-wider text-[#606060]">Order Number</p>
                      <p className="text-white font-medium">{orderNumber || '—'}</p>
                    </div>
                  </div>
                </div>

                <div className="rounded-xl border border-[#1E1E1E] bg-[#141414] p-6">
                  <h2 className="mb-4 text-lg font-semibold text-white">Payment Method</h2>
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#2D6CDF]/10">
                      <Shield size={18} className="text-[#2D6CDF]" />
                    </div>
                    <div className="text-sm">
                      <p className="text-white font-medium">PayPal Checkout</p>
                      <p className="text-[#808080]">Secure payment through PayPal</p>
                    </div>
                  </div>
                  {isPaymentApproved && (
                    <div className="mt-5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
                      <div className="flex items-center gap-2 font-semibold text-emerald-200">
                        <Check size={14} className="text-emerald-300" />
                        Payment confirmed
                      </div>
                      <p className="mt-1 text-xs text-emerald-100/80">
                        Your PayPal payment was captured successfully.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Navigation Buttons */}
            <div className="flex gap-4">
              {checkoutStep !== 'shipping' && (
                checkoutStep === 'review' && isPaymentApproved ? (
                  <button
                    onClick={() => {
                      window.location.href = '/catalog';
                    }}
                    className="rounded-lg bg-[#2D6CDF] px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#2563c7]"
                  >
                    Continue shopping
                  </button>
                ) : checkoutStep === 'payment' ? (
                  <div className="flex items-center gap-3 text-sm text-[#A0A0A0]">
                    <span>¿Dont sure?</span>
                    <button
                      onClick={() => {
                        const shouldCancel = window.confirm('Are you sure you want to cancel and return to the catalog?');
                        if (!shouldCancel) return;
                        setCheckoutStep('shipping');
                        setOrderNumber('');
                        setIsPaymentApproved(false);
                        setOrderSnapshot(null);
                        paypalRenderedRef.current = false;
                        window.location.href = '/catalog';
                      }}
                      className="rounded-lg bg-[#B91C1C] px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-[#9F1B1B]"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => {
                      const prev = steps[steps.findIndex((s) => s.key === checkoutStep) - 1];
                      if (prev) setCheckoutStep(prev.key);
                    }}
                    className="rounded-lg border border-[#1E1E1E] bg-[#141414] px-6 py-3 text-sm font-medium text-[#A0A0A0] transition-colors hover:text-white"
                  >
                    Back
                  </button>
                )
              )}
              {checkoutStep === 'shipping' ? (
                <button
                  onClick={() => {
                    const next = steps[steps.findIndex((s) => s.key === checkoutStep) + 1];
                    if (next) setCheckoutStep(next.key);
                  }}
                  disabled={!canProceed()}
                  className="ml-auto flex items-center gap-2 rounded-lg bg-[#2D6CDF] px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#2563c7] disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  Continue
                  <ChevronRight size={16} />
                </button>
              ) : null}
            </div>
          </div>

          {/* Order Summary */}
          <div className="h-fit rounded-xl border border-[#1E1E1E] bg-[#141414] p-6">
            <h2 className="mb-4 text-lg font-semibold text-white">Order Summary</h2>
            {!isCartReady ? (
              <div className="space-y-4">
                <div className="h-12 rounded-lg bg-[#0A0A0A] animate-pulse" />
                <div className="h-12 rounded-lg bg-[#0A0A0A] animate-pulse" />
                <div className="h-12 rounded-lg bg-[#0A0A0A] animate-pulse" />
                <div className="h-12 rounded-lg bg-[#0A0A0A] animate-pulse" />
              </div>
            ) : isSummaryEmpty ? (
              <div className="rounded-lg border border-[#1E1E1E] bg-[#0A0A0A] px-4 py-8 text-center text-sm text-[#808080]">
                <ShoppingBag size={24} className="mx-auto mb-3 text-[#333333]" />
                Your cart is empty.
              </div>
            ) : (
              <>
                <div className="space-y-3">
                  {summaryItems.map((item) => (
                    <div key={item.product.id} className="flex gap-3">
                      <div className="relative h-14 w-14 flex-shrink-0 overflow-hidden rounded-md bg-[#1A1A1A]">
                        <Image
                          src={item.product.image}
                          alt={item.product.name}
                          fill
                          sizes="56px"
                          className="object-cover"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-white truncate">{item.product.name}</p>
                        {item.variant && (
                          <p className="text-xs text-[#808080]">{item.variant}</p>
                        )}
                        <p className="text-xs text-[#808080]">Qty: {item.quantity}</p>
                      </div>
                      <p className="text-sm font-medium text-white">
                        ${(item.product.price * item.quantity).toLocaleString()}
                      </p>
                    </div>
                  ))}
                </div>

                <div className="my-4 border-t border-[#1E1E1E]" />

                <div className="space-y-2">
                  <div className="flex justify-between text-sm text-[#A0A0A0]">
                    <span>Subtotal</span>
                    <span className="text-white">${summaryTotals.subtotal.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm text-[#A0A0A0]">
                    <span>Shipping</span>
                    <span className={summaryTotals.shipping === 0 ? 'text-green-400' : 'text-white'}>
                      {summaryTotals.shipping === 0 ? 'Free' : `$${summaryTotals.shipping}`}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm text-[#A0A0A0]">
                    <span>Tax</span>
                    <span className="text-white">${summaryTotals.tax.toFixed(2)}</span>
                  </div>
                </div>

                <div className="my-4 border-t border-[#1E1E1E]" />

                <div className="flex justify-between">
                  <span className="text-base font-semibold text-white">Total</span>
                  <span className="text-base font-bold text-white">
                    ${summaryTotals.total.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
