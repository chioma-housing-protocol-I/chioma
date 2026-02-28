'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu, X } from 'lucide-react';
import { NAV_LINKS } from '@/constants/navigation';

interface NavbarProps {
  theme?: 'light' | 'dark';
}

const Navbar = ({ theme = 'dark' }: NavbarProps) => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const pathname = usePathname();

  const isLight = theme === 'light';

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
        isScrolled ? 'glass py-3' : 'bg-transparent py-6'
      }`}
    >
      <div className="container mx-auto px-4 sm:px-6 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center space-x-2">
          <span
            className={`text-2xl font-bold tracking-tight ${
              isLight ? 'text-blue-900' : 'text-white'
            }`}
          >
            Chioma
          </span>
        </Link>

        {/* Desktop Navigation */}
        <div className="hidden md:flex items-center space-x-10">
          {NAV_LINKS.map((link) => {
            const active = isActive(link.href);

            return (
              <Link
                key={link.name}
                href={link.href}
                className={`relative text-sm font-medium transition-colors
                  ${
                    active
                      ? `${isLight ? 'text-black border-b-2 border-black' : 'text-white border-b-2 border-white'} pb-1`
                      : `${isLight ? 'text-black hover:text-blue-900' : 'text-white/80 hover:text-white'}`
                  }
                `}
              >
                {link.name}
              </Link>
            );
          })}
        </div>

        {/* Auth Actions */}
        <div className="hidden md:flex items-center space-x-6">
          <Link
            href="/login"
            className={`${
              isLight
                ? 'text-blue-600 hover:text-blue-800'
                : 'text-white hover:text-white/80'
            } text-sm font-semibold transition-colors`}
          >
            Log In
          </Link>
          <Link
            href="/signup"
            className="bg-blue-800 hover:bg-brand-blue text-white px-7 py-2.5 rounded-lg text-sm font-semibold transition-all shadow-lg hover:shadow-brand-blue/20"
          >
            Sign Up
          </Link>
        </div>

        {/* Mobile Menu Button - min 44px touch target */}
        <button
          className={`md:hidden p-2.5 min-w-[44px] min-h-[44px] flex items-center justify-center -mr-1 rounded-lg active:bg-white/10 ${
            isLight ? 'text-blue-900' : 'text-white'
          }`}
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          aria-label="Toggle menu"
        >
          {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Mobile Navigation Drawer */}
      {isMobileMenuOpen && (
        <div
          className={`md:hidden absolute top-full left-0 right-0 border-t border-white/10 animate-in fade-in slide-in-from-top-4 duration-300 ${
            isLight ? 'bg-white/95 backdrop-blur-md' : 'glass-dark'
          }`}
        >
          <div className="flex flex-col p-6 space-y-4">
            {NAV_LINKS.map((link) => {
              const active = isActive(link.href);

              return (
                <Link
                  key={link.name}
                  href={link.href}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`text-lg font-medium w-fit
                    ${
                      active
                        ? `${isLight ? 'text-blue-900 border-b-2 border-blue-900' : 'text-white border-b-2 border-white'} pb-1`
                        : `${isLight ? 'text-blue-900' : 'text-white'}`
                    }
                  `}
                >
                  {link.name}
                </Link>
              );
            })}

            <div className="pt-4 flex flex-col space-y-4 border-t border-white/10">
              <Link
                href="/login"
                className={`text-lg font-medium ${isLight ? 'text-blue-900' : 'text-white'}`}
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Log In
              </Link>
              <Link
                href="/signup"
                className="bg-brand-blue text-white px-6 py-3 rounded-lg text-center font-semibold shadow-lg"
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
