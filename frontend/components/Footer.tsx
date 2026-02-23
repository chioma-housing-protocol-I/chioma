'use-client';

import { Twitter, Instagram, Facebook } from 'lucide-react';
export default function Footer() {
  return (
    <div>
      {/* Footer */}
      <footer className="bg-slate-900 text-white mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
          {/* Footer Content */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 mb-8 sm:mb-12">
            {/* Brand Section */}
            <div className="lg:col-span-1 sm:col-span-2">
              <h3 className="text-2xl sm:text-3xl font-bold mb-3 sm:mb-4">
                Chioma
              </h3>
              <p className="text-gray-400 text-sm sm:text-base leading-relaxed">
                Reimagining rentals with blockchain security. Transparent, fast,
                and trusted.
              </p>
            </div>

            {/* Platform Links */}
            <div>
              <h4 className="text-xs sm:text-sm font-semibold uppercase tracking-wider text-gray-400 mb-4 sm:mb-6">
                PLATFORM
              </h4>
              <ul className="space-y-2 sm:space-y-3">
                <li>
                  <a
                    href="#"
                    className="text-gray-300 hover:text-white transition text-sm sm:text-base"
                  >
                    Browse Homes
                  </a>
                </li>
                <li>
                  <a
                    href="#"
                    className="text-gray-300 hover:text-white transition text-sm sm:text-base"
                  >
                    List Property
                  </a>
                </li>
                <li>
                  <a
                    href="#"
                    className="text-gray-300 hover:text-white transition text-sm sm:text-base"
                  >
                    Pricing
                  </a>
                </li>
              </ul>
            </div>

            {/* Company Links */}
            <div>
              <h4 className="text-xs sm:text-sm font-semibold uppercase tracking-wider text-gray-400 mb-4 sm:mb-6">
                COMPANY
              </h4>
              <ul className="space-y-2 sm:space-y-3">
                <li>
                  <a
                    href="#"
                    className="text-gray-300 hover:text-white transition text-sm sm:text-base"
                  >
                    About Us
                  </a>
                </li>
                <li>
                  <a
                    href="#"
                    className="text-gray-300 hover:text-white transition text-sm sm:text-base"
                  >
                    Careers
                  </a>
                </li>
                <li>
                  <a
                    href="#"
                    className="text-gray-300 hover:text-white transition text-sm sm:text-base"
                  >
                    Press
                  </a>
                </li>
              </ul>
            </div>

            {/* Support Links */}
            <div>
              <h4 className="text-xs sm:text-sm font-semibold uppercase tracking-wider text-gray-400 mb-4 sm:mb-6">
                SUPPORT
              </h4>
              <ul className="space-y-2 sm:space-y-3">
                <li>
                  <a
                    href="#"
                    className="text-gray-300 hover:text-white transition text-sm sm:text-base"
                  >
                    Help Center
                  </a>
                </li>
                <li>
                  <a
                    href="#"
                    className="text-gray-300 hover:text-white transition text-sm sm:text-base"
                  >
                    Terms
                  </a>
                </li>
                <li>
                  <a
                    href="#"
                    className="text-gray-300 hover:text-white transition text-sm sm:text-base"
                  >
                    Privacy
                  </a>
                </li>
              </ul>
            </div>
          </div>

          {/* Footer Bottom */}
          <div className="border-t border-gray-800 pt-8 sm:pt-12 flex flex-col sm:flex-row justify-between items-center gap-6">
            <p className="text-gray-400 text-xs sm:text-sm text-center sm:text-left">
              © 2024 Chioma. All rights reserved.
            </p>

            {/* Social Links */}
            {/* Social Links */}
            <div className="flex items-center gap-4 sm:gap-6">
              <a href="#" className="text-gray-400 hover:text-white transition">
                <Twitter className="w-5 h-5 sm:w-6 sm:h-6" />
              </a>
              <a href="#" className="text-gray-400 hover:text-white transition">
                <Instagram className="w-5 h-5 sm:w-6 sm:h-6" />
              </a>
              <a href="#" className="text-gray-400 hover:text-white transition">
                <Facebook className="w-5 h-5 sm:w-6 sm:h-6" />
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
