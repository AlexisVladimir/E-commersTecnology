'use client';

import { User, ShoppingBag, Heart, MapPin, Settings, ChevronRight, LogOut, CheckCircle2, Clock, Truck } from 'lucide-react';
import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useStore } from '@/context/StoreContext';
import { apiFetch } from '@/lib/api';
import type { AccountTab } from '@/types';

const allTabs: { key: AccountTab; label: string; icon: React.ReactNode }[] = [
  { key: 'profile', label: 'Profile', icon: <User size={18} /> },
  { key: 'orders', label: 'Orders', icon: <ShoppingBag size={18} /> },
  { key: 'wishlist', label: 'Wishlist', icon: <Heart size={18} /> },
  { key: 'addresses', label: 'Addresses', icon: <MapPin size={18} /> },
  { key: 'settings', label: 'Settings', icon: <Settings size={18} /> },
];

type OrderSummary = {
  orderNumber: string;
  status: string;
  total: number;
  placedAt: string;
};

export default function AccountPage() {
  const { accountTab, setAccountTab, setIsLoggedIn, user, setUser, isAdmin } = useStore();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [orders, setOrders] = useState<OrderSummary[]>([]);
  const wishlistItems: { name: string; price: number; image: string }[] = [];
  const addresses: { name: string; address: string; default: boolean }[] = [];
  const paidOrders = orders.filter((order) => order.status === 'paid');

  const getStatusMeta = (status: string) => {
    switch (status) {
      case 'paid':
        return { label: 'Paid', hint: 'Payment captured successfully.' };
      case 'pending':
        return { label: 'Pending', hint: 'Payment is still processing.' };
      case 'shipped':
        return { label: 'Shipped', hint: 'Order has left the warehouse.' };
      case 'delivered':
        return { label: 'Delivered', hint: 'Order delivered to the address.' };
      default:
        return { label: status || 'Unknown', hint: 'Order status update pending.' };
    }
  };

  const tabs = isAdmin
    ? allTabs.filter((tab) => tab.key === 'profile' || tab.key === 'settings')
    : allTabs;

  useEffect(() => {
    const loadOrders = async () => {
      if (!user || isAdmin) {
        setOrders([]);
        return;
      }
      try {
        const response = await apiFetch<{ items: OrderSummary[] }>('/orders/');
        setOrders(response.items || []);
      } catch {
        setOrders([]);
      }
    };

    loadOrders();
  }, [user, isAdmin]);

  useEffect(() => {
    if (isAdmin && ['orders', 'wishlist', 'addresses'].includes(accountTab)) {
      setAccountTab('profile');
    }
  }, [isAdmin, accountTab, setAccountTab]);

  useEffect(() => {
    if (!user && !isAdmin) {
      const timer = window.setTimeout(() => {
        router.push('/');
      }, 1200);
      return () => window.clearTimeout(timer);
    }
    return undefined;
  }, [user, isAdmin, router]);

  useEffect(() => {
    if (isAdmin) return;
    const tab = searchParams?.get('tab');
    if (tab && ['profile', 'orders', 'wishlist', 'addresses', 'settings'].includes(tab)) {
      setAccountTab(tab as AccountTab);
    }
  }, [isAdmin, searchParams, setAccountTab]);

  const handleLogout = async () => {
    try {
      await apiFetch('/users/logout/', { method: 'POST' });
    } finally {
      sessionStorage.removeItem('auth:active');
      setUser(null);
      setIsLoggedIn(false);
      window.location.href = '/';
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A] pt-16">
      {!user && !isAdmin && (
        <div className="mx-auto flex max-w-md flex-col items-center justify-center px-6 py-12 text-center">
          <h1 className="text-2xl font-semibold text-white">Sign in to view your account</h1>
          <p className="mt-2 text-sm text-[#808080]">
            You will be redirected to the home page.
          </p>
        </div>
      )}
      <div className="mx-auto max-w-[1400px] px-4 py-8 lg:px-8">
        <div className="grid gap-8 lg:grid-cols-[280px_1fr]">
          {/* Sidebar */}
          <aside className="space-y-2">
            <div className="mb-6 flex items-center gap-3 rounded-xl border border-[#1E1E1E] bg-[#141414] p-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#2D6CDF]/20">
                <User size={20} className="text-[#2D6CDF]" />
              </div>
              <div>
                <p className="text-sm font-semibold text-white">
                  {user ? `${user.firstName} ${user.lastName}` : 'Guest'}
                </p>
                <p className="text-xs text-[#808080]">{user?.email || 'Not signed in'}</p>
              </div>
            </div>

            <nav className="space-y-1">
              {tabs.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setAccountTab(tab.key)}
                  className={`flex w-full items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition-colors ${
                    accountTab === tab.key
                      ? 'bg-[#2D6CDF]/10 text-[#2D6CDF]'
                      : 'text-[#A0A0A0] hover:bg-[#1A1A1A] hover:text-white'
                  }`}
                >
                  {tab.icon}
                  {tab.label}
                  {accountTab === tab.key && <ChevronRight size={14} className="ml-auto" />}
                </button>
              ))}
            </nav>

            <button
              onClick={handleLogout}
              className="flex w-full items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium text-red-400 transition-colors hover:bg-red-400/10"
            >
              <LogOut size={18} />
              Sign Out
            </button>
          </aside>

          {/* Main Content */}
          <main className="rounded-xl border border-[#1E1E1E] bg-[#141414] p-6">
            {accountTab === 'profile' && (
              <div>
                <h2 className="mb-6 text-xl font-bold text-white">Profile</h2>
                <div className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-[#808080]">
                        First Name
                      </label>
                      <input
                        type="text"
                        defaultValue={user?.firstName || ''}
                        className="w-full rounded-lg border border-[#1E1E1E] bg-[#0A0A0A] px-4 py-2.5 text-sm text-white outline-none focus:border-[#2D6CDF]"
                      />
                    </div>
                    <div>
                      <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-[#808080]">
                        Last Name
                      </label>
                      <input
                        type="text"
                        defaultValue={user?.lastName || ''}
                        className="w-full rounded-lg border border-[#1E1E1E] bg-[#0A0A0A] px-4 py-2.5 text-sm text-white outline-none focus:border-[#2D6CDF]"
                      />
                    </div>
                    <div>
                      <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-[#808080]">
                        Email
                      </label>
                      <input
                        type="email"
                        defaultValue={user?.email || ''}
                        className="w-full rounded-lg border border-[#1E1E1E] bg-[#0A0A0A] px-4 py-2.5 text-sm text-white outline-none focus:border-[#2D6CDF]"
                      />
                    </div>
                    <div>
                      <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-[#808080]">
                        Phone
                      </label>
                      <input
                        type="tel"
                        defaultValue={user?.phone || ''}
                        className="w-full rounded-lg border border-[#1E1E1E] bg-[#0A0A0A] px-4 py-2.5 text-sm text-white outline-none focus:border-[#2D6CDF]"
                      />
                    </div>
                  </div>
                  <button
                    disabled={!user}
                    className="mt-4 rounded-lg bg-[#2D6CDF] px-6 py-2.5 text-sm font-semibold text-white hover:bg-[#2563c7] transition-colors disabled:opacity-50"
                  >
                    Save Changes
                  </button>
                </div>
              </div>
            )}

            {accountTab === 'orders' && !isAdmin && (
              <div>
                <h2 className="mb-6 text-xl font-bold text-white">Order History</h2>
                <div className="space-y-3">
                  {paidOrders.map((order) => {
                    const statusMeta = getStatusMeta(order.status);
                    return (
                      <div
                        key={order.orderNumber}
                        className="flex items-start justify-between gap-4 rounded-lg border border-[#1E1E1E] bg-[#0A0A0A] p-4"
                      >
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-white">{order.orderNumber}</p>
                          <p className="text-xs text-[#808080]">
                            {new Date(order.placedAt).toLocaleString(undefined, {
                              dateStyle: 'medium',
                              timeStyle: 'short',
                            })}
                          </p>
                        </div>
                        <div className="flex flex-col items-end gap-2 text-right">
                          <div className="flex items-center gap-2">
                            <span
                              title={statusMeta.hint}
                              className={`rounded-full border px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide whitespace-nowrap ${
                                order.status === 'paid'
                                  ? 'border-emerald-400/30 bg-emerald-400/10 text-emerald-300'
                                  : order.status === 'delivered'
                                  ? 'border-green-400/30 bg-green-400/10 text-green-300'
                                  : order.status === 'shipped'
                                  ? 'border-[#2D6CDF]/30 bg-[#2D6CDF]/10 text-[#B5CCFF]'
                                  : order.status === 'pending'
                                  ? 'border-yellow-400/30 bg-yellow-400/10 text-yellow-300'
                                  : 'border-[#2D6CDF]/30 bg-[#2D6CDF]/10 text-[#B5CCFF]'
                              }`}
                            >
                              {statusMeta.label}
                            </span>
                            {order.status === 'paid' && (
                              <CheckCircle2 size={14} className="text-emerald-400" />
                            )}
                            {order.status === 'pending' && (
                              <Clock size={14} className="text-yellow-400" />
                            )}
                            {order.status === 'shipped' && (
                              <Truck size={14} className="text-[#2D6CDF]" />
                            )}
                            {order.status === 'delivered' && (
                              <CheckCircle2 size={14} className="text-green-400" />
                            )}
                          </div>
                          <p className="text-sm font-semibold text-white">${order.total.toLocaleString()}</p>
                        </div>
                      </div>
                    );
                  })}
                  {user && paidOrders.length === 0 && (
                    <p className="text-sm text-[#808080]">No paid orders yet.</p>
                  )}
                  {!user && (
                    <p className="text-sm text-[#808080]">Sign in to view your orders.</p>
                  )}
                </div>
              </div>
            )}

            {accountTab === 'wishlist' && (
              <div>
                <h2 className="mb-6 text-xl font-bold text-white">Wishlist</h2>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  {wishlistItems.map((item, i) => (
                    <div
                      key={i}
                      className="flex gap-3 rounded-lg border border-[#1E1E1E] bg-[#0A0A0A] p-3"
                    >
                      <div className="relative h-20 w-20 flex-shrink-0 overflow-hidden rounded-md bg-[#1A1A1A]">
                        <Image
                          src={item.image}
                          alt={item.name}
                          fill
                          sizes="80px"
                          className="object-cover"
                        />
                      </div>
                      <div className="flex flex-1 flex-col justify-between">
                        <div>
                          <p className="text-sm font-medium text-white">{item.name}</p>
                          <p className="text-sm font-semibold text-white">${item.price.toLocaleString()}</p>
                        </div>
                        <button className="self-start rounded-lg bg-[#2D6CDF] px-4 py-1.5 text-xs font-medium text-white hover:bg-[#2563c7] transition-colors">
                          Add to Cart
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {accountTab === 'addresses' && (
              <div>
                <h2 className="mb-6 text-xl font-bold text-white">Addresses</h2>
                <div className="space-y-3">
                  {addresses.map((addr, i) => (
                    <div
                      key={i}
                      className="rounded-lg border border-[#1E1E1E] bg-[#0A0A0A] p-4"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium text-white">{addr.name}</p>
                            {addr.default && (
                              <span className="rounded-full bg-[#2D6CDF]/10 px-2 py-0.5 text-[10px] font-bold uppercase text-[#2D6CDF]">
                                Default
                              </span>
                            )}
                          </div>
                          <p className="mt-1 text-sm text-[#808080]">{addr.address}</p>
                        </div>
                        <button className="text-xs text-[#2D6CDF] hover:underline">Edit</button>
                      </div>
                    </div>
                  ))}
                  <button className="w-full rounded-lg border border-dashed border-[#1E1E1E] py-3 text-sm text-[#808080] hover:border-[#2D6CDF] hover:text-[#2D6CDF] transition-colors">
                    + Add New Address
                  </button>
                </div>
              </div>
            )}

            {accountTab === 'settings' && (
              <div>
                <h2 className="mb-6 text-xl font-bold text-white">Settings</h2>
                <div className="space-y-4">
                  {[
                    { label: 'Email Notifications', desc: 'Receive updates about orders and promotions', checked: true },
                    { label: 'SMS Notifications', desc: 'Get text alerts for shipping updates', checked: false },
                    { label: 'Newsletter', desc: 'Weekly digest of new products and deals', checked: true },
                    { label: 'Two-Factor Authentication', desc: 'Add an extra layer of security', checked: false },
                  ].map((setting, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between rounded-lg border border-[#1E1E1E] bg-[#0A0A0A] p-4"
                    >
                      <div>
                        <p className="text-sm font-medium text-white">{setting.label}</p>
                        <p className="text-xs text-[#808080]">{setting.desc}</p>
                      </div>
                      <button
                        type="button"
                        className={`relative h-6 w-11 rounded-full transition-colors ${
                          setting.checked ? 'bg-[#2D6CDF]' : 'bg-[#333333]'
                        }`}
                      >
                        <span
                          className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform ${
                            setting.checked ? 'left-[22px]' : 'left-0.5'
                          }`}
                        />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}
