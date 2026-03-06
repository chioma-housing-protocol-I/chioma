'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu, X } from 'lucide-react';
import { NAV_LINKS } from '@/constants/navigation';
import ChiomaLogo from '@/components/ChiomaLogo';

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

  // On light theme use the dark logo (Logo 02); on dark theme use Logo 01 (blue+orange)
  const logoVariant = isLight ? 'light' : 'dark';

  return (
    <nav
      className={`top-0 left-0 right-0 z-50 transition-all duration-300 sticky ${
        isScrolled
          ? isLight
            ? 'glass py-3'
            : 'glass-dark py-3'
          : 'bg-transparent py-6'
      }`}
    >
      <div className="container mx-auto px-4 sm:px-6 flex items-center justify-between">
        {/* Logo */}
        <ChiomaLogo variant={logoVariant} height={36} />

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
                      ? isScrolled
                        ? isLight
                          ? 'text-slate-900 border-b-2 border-blue-600 pb-1'
                          : 'text-white border-b-2 border-blue-400 pb-1'
                        : isLight
                          ? 'text-slate-900 border-b-2 border-slate-900 pb-1'
                          : 'text-white border-b-2 border-white pb-1'
                      : isScrolled
                        ? isLight
                          ? 'text-slate-700 hover:text-slate-900'
                          : 'text-slate-200 hover:text-white'
                        : isLight
                          ? 'text-slate-800 hover:text-blue-900'
                          : 'text-white/90 hover:text-white'
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
            className={`text-sm font-semibold transition-colors ${
              isScrolled
                ? isLight
                  ? 'text-blue-600 hover:text-blue-800'
                  : 'text-blue-400 hover:text-blue-300'
                : isLight
                  ? 'text-blue-600 hover:text-blue-800'
                  : 'text-white hover:text-white/80'
            }`}
          >
            Log In
          </Link>
          <Link
            href="/signup"
            className="bg-blue-600 hover:bg-blue-700 text-white px-7 py-2.5 rounded-lg text-sm font-semibold transition-all shadow-lg hover:shadow-xl"
          >
            Sign Up
          </Link>
        </div>

        {/* Mobile Menu Button */}
        <button
          className={`md:hidden p-2.5 min-w-[44px] min-h-[44px] flex items-center justify-center -mr-1 rounded-lg active:bg-white/10 transition-colors ${
            isScrolled
              ? isLight
                ? 'text-slate-900'
                : 'text-white'
              : isLight
                ? 'text-blue-900'
                : 'text-white'
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
          className={`md:hidden absolute top-full left-0 right-0 border-t animate-in fade-in slide-in-from-top-4 duration-300 ${
            isLight
              ? 'bg-white/98 backdrop-blur-md border-slate-200 shadow-lg'
              : 'glass-dark border-white/10'
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
                  className={`text-lg font-medium w-fit transition-colors
                    ${
                      active
                        ? isLight
                          ? 'text-slate-900 border-b-2 border-blue-600 pb-1'
                          : 'text-white border-b-2 border-blue-400 pb-1'
                        : isLight
                          ? 'text-slate-700 hover:text-slate-900'
                          : 'text-slate-200 hover:text-white'
                    }
                  `}
                >
                  {link.name}
                </Link>
              );
            })}

            <div
              className={`pt-4 flex flex-col space-y-4 border-t ${isLight ? 'border-slate-200' : 'border-white/10'}`}
            >
              <Link
                href="/login"
                className={`text-lg font-medium transition-colors ${
                  isLight
                    ? 'text-blue-600 hover:text-blue-800'
                    : 'text-blue-400 hover:text-blue-300'
                }`}
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Log In
              </Link>
              <Link
                href="/signup"
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg text-center font-semibold shadow-lg transition-all"
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