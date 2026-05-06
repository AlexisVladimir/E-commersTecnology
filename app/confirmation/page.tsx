'use client';

import { Check, ArrowLeft, ShoppingBag } from 'lucide-react';
import Link from 'next/link';
import { useStore } from '@/context/StoreContext';
import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { apiFetch } from '@/lib/api';

export default function ConfirmationPage() {
  const { setOrderPlaced } = useStore();
  const searchParams = useSearchParams();
  const [orderNumber, setOrderNumber] = useState<string>('');

  useEffect(() => {
    setOrderPlaced(true);
    const paramNumber = searchParams.get('orderNumber');
    setOrderNumber(paramNumber || '');
    const paypalToken = searchParams.get('token');
    if (paypalToken && paramNumber) {
      apiFetch('/payments/paypal/capture/', {
        method: 'POST',
        body: JSON.stringify({ paypalOrderId: paypalToken, orderNumber: paramNumber }),
      }).catch(() => {
        // Capture errors can be handled in a follow-up UI pass.
      });
    }
  }, [searchParams, setOrderPlaced]);

  return (
    <div className="min-h-screen bg-[#0A0A0A] pt-16">
      <div className="mx-auto flex max-w-lg flex-col items-center px-4 py-20 text-center">
        {/* Success Icon */}
        <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-[#2D6CDF]/10">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#2D6CDF]">
            <Check size={28} className="text-white" strokeWidth={3} />
          </div>
        </div>

        <h1 className="mb-2 text-3xl font-bold text-white">
          Order Placed Successfully!
        </h1>
        <p className="mb-6 text-[#808080]">
          Thank you for your purchase. We have sent a confirmation email with your order details.
        </p>

        <div className="mb-8 w-full rounded-xl border border-[#1E1E1E] bg-[#141414] p-6">
          <div className="mb-4 flex items-center justify-between border-b border-[#1E1E1E] pb-4">
            <span className="text-sm text-[#808080]">Order Number</span>
            <span className="text-sm font-mono font-medium text-white">{orderNumber}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-[#808080]">Estimated Delivery</span>
            <span className="text-sm font-medium text-white">3-5 Business Days</span>
          </div>
        </div>

        <div className="flex w-full flex-col gap-3">
          <Link
            href="/"
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#2D6CDF] py-3 text-sm font-semibold text-white transition-colors hover:bg-[#2563c7]"
          >
            <ShoppingBag size={16} />
            Continue Shopping
          </Link>
          <Link
            href="/account"
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-[#1E1E1E] bg-[#141414] py-3 text-sm font-medium text-[#A0A0A0] transition-colors hover:text-white hover:border-[#808080]"
          >
            <ArrowLeft size={16} />
            View Order History
          </Link>
        </div>
      </div>
    </div>
  );
}
