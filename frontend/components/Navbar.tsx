'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import Logo from '@/components/Logo';
import { Menu, X } from 'lucide-react';
import { NAV_LINKS } from '@/constants/navigation';

interface NavbarProps {
  theme?: 'light' | 'dark';
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const Navbar = ({ theme = 'dark' }: NavbarProps) => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout>;

    const handleScroll = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        setIsScrolled(window.scrollY > 20);
      }, 100);
    };

    window.addEventListener('scroll', handleScroll);

    return () => {
      window.removeEventListener('scroll', handleScroll);
      clearTimeout(timeoutId);
    };
  }, []);

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/';
    return pathname.startsWith(href);
  };

  return (
    <nav
      className={`top-0 left-0 right-0 z-50 transition-all duration-300 sticky ${
        isScrolled
          ? 'backdrop-blur-xl bg-slate-950/95 border-b border-white/20 py-2 shadow-xl shadow-black/20'
          : 'bg-transparent py-3'
      }`}
    >
      <div className="container mx-auto px-4 sm:px-6 flex items-center justify-between">
        {/* Logo */}
        <Logo
          size="md"
          textClassName="text-xl font-bold text-white tracking-tight"
        />

        {/* Desktop Navigation */}
        <div className="hidden md:flex items-center space-x-8">
          {NAV_LINKS.map((link) => {
            const active = isActive(link.href);

            return (
              <Link
                key={link.name}
                href={link.href}
                className={`relative text-sm font-medium transition-colors ${
                  active ? 'text-white' : 'text-blue-200/80 hover:text-white'
                }`}
              >
                {link.name}
                {active && (
                  <span className="absolute -bottom-1 left-0 right-0 h-0.5 bg-blue-400 rounded-full" />
                )}
              </Link>
            );
          })}
        </div>

        {/* Auth Actions */}
        <div className="hidden md:flex items-center space-x-4">
          <Link
            href="/login"
            className="text-sm font-semibold text-blue-200 hover:text-white transition-colors"
          >
            Log In
          </Link>
          <Link
            href="/signup"
            className="bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white px-6 py-2.5 rounded-lg text-sm font-semibold transition-all shadow-lg hover:shadow-xl"
          >
            Sign Up
          </Link>
        </div>

        {/* Mobile Menu Button */}
        <button
          className="md:hidden p-2.5 min-w-[44px] min-h-[44px] flex items-center justify-center -mr-1 rounded-lg hover:bg-white/10 transition-colors text-white"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          aria-label="Toggle menu"
        >
          {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Mobile Navigation Drawer */}
      {isMobileMenuOpen && (
        <div className="md:hidden absolute top-full left-0 right-0 backdrop-blur-xl bg-slate-950/98 border-b border-white/20 shadow-xl shadow-black/20">
          <div className="flex flex-col p-6 space-y-4">
            {NAV_LINKS.map((link) => {
              const active = isActive(link.href);

              return (
                <Link
                  key={link.name}
                  href={link.href}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`text-lg font-medium transition-colors ${
                    active ? 'text-white' : 'text-blue-200/80 hover:text-white'
                  }`}
                >
                  {link.name}
                </Link>
              );
            })}

            <div className="pt-4 flex flex-col space-y-4 border-t border-white/10">
              <Link
                href="/login"
                className="text-lg font-medium text-blue-300 hover:text-blue-200 transition-colors"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Log In
              </Link>
              <Link
                href="/signup"
                className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white px-6 py-3 rounded-lg text-center font-semibold shadow-lg transition-all"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Sign Up
              </Link>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
