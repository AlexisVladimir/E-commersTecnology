import { Github, Twitter, Instagram, Youtube } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="border-t border-[#1E1E1E] bg-[#0A0A0A]">
      <div className="mx-auto max-w-[1400px] px-4 py-12 lg:px-8">
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {/* Brand */}
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-white">TechStore</h3>
            <p className="text-sm text-[#808080] leading-relaxed">
              Next-level tech, delivered. Premium electronics curated for professionals and enthusiasts.
            </p>
            <div className="flex gap-3">
              <a href="#" className="text-[#606060] hover:text-[#2D6CDF] transition-colors">
                <Twitter size={18} />
              </a>
              <a href="#" className="text-[#606060] hover:text-[#2D6CDF] transition-colors">
                <Instagram size={18} />
              </a>
              <a href="#" className="text-[#606060] hover:text-[#2D6CDF] transition-colors">
                <Youtube size={18} />
              </a>
              <a href="#" className="text-[#606060] hover:text-[#2D6CDF] transition-colors">
                <Github size={18} />
              </a>
            </div>
          </div>

          {/* Products */}
          <div>
            <h4 className="mb-4 text-xs font-bold uppercase tracking-widest text-[#606060]">
              Products
            </h4>
            <ul className="space-y-2.5">
              {['Laptops', 'Smartphones', 'Audio', 'Wearables', 'Peripherals', 'Gaming'].map(
                (item) => (
                  <li key={item}>
                    <a
                      href={`/catalog?category=${encodeURIComponent(item)}`}
                      className="text-sm text-[#808080] hover:text-white transition-colors"
                    >
                      {item}
                    </a>
                  </li>
                )
              )}
            </ul>
          </div>

          {/* Support */}
          <div>
            <h4 className="mb-4 text-xs font-bold uppercase tracking-widest text-[#606060]">
              Support
            </h4>
            <ul className="space-y-2.5">
              {['Help Center', 'Shipping Info', 'Returns', 'Warranty', 'Contact Us', 'FAQ'].map(
                (item) => (
                  <li key={item}>
                    <a
                      href="#"
                      className="text-sm text-[#808080] hover:text-white transition-colors"
                    >
                      {item}
                    </a>
                  </li>
                )
              )}
            </ul>
          </div>

          {/* Company */}
          <div>
            <h4 className="mb-4 text-xs font-bold uppercase tracking-widest text-[#606060]">
              Company
            </h4>
            <ul className="space-y-2.5">
              {['About Us', 'Careers', 'Press', 'Blog', 'Privacy Policy', 'Terms of Service'].map(
                (item) => (
                  <li key={item}>
                    <a
                      href="#"
                      className="text-sm text-[#808080] hover:text-white transition-colors"
                    >
                      {item}
                    </a>
                  </li>
                )
              )}
            </ul>
          </div>
        </div>

        <div className="mt-12 border-t border-[#1E1E1E] pt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-[#606060]">
            &copy; 2025 TechStore. All rights reserved.
          </p>
          <div className="flex gap-6">
            <a href="#" className="text-xs text-[#606060] hover:text-[#A0A0A0] transition-colors">
              Privacy
            </a>
            <a href="#" className="text-xs text-[#606060] hover:text-[#A0A0A0] transition-colors">
              Terms
            </a>
            <a href="#" className="text-xs text-[#606060] hover:text-[#A0A0A0] transition-colors">
              Cookies
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
