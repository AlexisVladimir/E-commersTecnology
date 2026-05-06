import type { Metadata } from 'next';
import './globals.css';
import { StoreProvider } from '@/context/StoreContext';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import CartDrawer from '@/components/CartDrawer';
import SearchModal from '@/components/SearchModal';
import AuthModal from '@/components/AuthModal';

export const metadata: Metadata = {
  title: 'TechStore — Next-level tech, delivered',
  description:
    'Premium electronics curated for professionals, gamers, and creators who demand the best.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <StoreProvider>
          <div className="min-h-screen bg-[#0A0A0A]">
            <Navbar />
            <main>{children}</main>
            <Footer />
            <CartDrawer />
            <SearchModal />
            <AuthModal />
          </div>
        </StoreProvider>
      </body>
    </html>
  );
}
