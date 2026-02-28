'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu, X } from 'lucide-react';

const Navbar = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navLinks = [
    { name: 'Find a Home', href: '/properties' },
    { name: 'For Landlords', href: '/landlords' },
    { name: 'For Agents', href: '/agents' },
    { name: 'Resources', href: '/resources' },
  ];

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/';
    return pathname.startsWith(href);
  };

  return (
    <nav
      className={`top-0 left-0 right-0 z-50 transition-all duration-300 sticky ${
        isScrolled
          ? 'bg-white/90 backdrop-blur-xl border-b border-gray-200 py-3 shadow-sm'
          : 'bg-white py-4 sm:py-6 border-b border-gray-100'
      }`}
    >
      <div className="container mx-auto px-4 sm:px-6 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center space-x-2">
          <span className="text-2xl font-black text-brand-blue tracking-tight">
            Chioma
          </span>
        </Link>

        {/* Desktop Navigation */}
        <div className="hidden md:flex items-center space-x-10">
          {navLinks.map((link) => {
            const active = isActive(link.href);

            return (
              <Link
                key={link.name}
                href={link.href}
                className={`relative text-sm font-semibold transition-all duration-200
                  ${
                    active
                      ? 'text-brand-blue'
                      : 'text-gray-600 hover:text-gray-900'
                  }
                `}
              >
                {link.name}
                {/* Active Indicator Line */}
                {active && (
                  <span className="absolute -bottom-1.5 left-0 w-full h-[2px] bg-brand-blue rounded-full" />
                )}
              </Link>
            );
          })}
        </div>

        {/* Auth Actions */}
        <div className="hidden md:flex items-center space-x-6">
          <Link
            href="/login"
            className="text-gray-600 hover:text-brand-blue text-sm font-bold transition-colors"
          >
            Log In
          </Link>
          <Link
            href="/signup"
            className="bg-brand-blue hover:bg-brand-blue-dark text-white px-7 py-2.5 rounded-full text-sm font-bold transition-all shadow-lg hover:shadow-brand-blue/20 hover:-translate-y-0.5"
          >
            Sign Up
          </Link>
        </div>

        {/* Mobile Menu Button - visible on light nav (text-blue-900), min touch target */}
        <button
          className="md:hidden text-blue-900 p-2.5 min-w-[44px] min-h-[44px] flex items-center justify-center -mr-1 rounded-lg active:bg-blue-900/10"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          aria-label="Toggle menu"
        >
          {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Mobile Navigation Drawer */}
      {isMobileMenuOpen && (
        <div className="md:hidden absolute top-full left-0 right-0 bg-slate-900/95 backdrop-blur border-t border-white/10 animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="flex flex-col p-6 space-y-4">
            {navLinks.map((link) => {
              const active = isActive(link.href);

              return (
                <Link
                  key={link.name}
                  href={link.href}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`text-lg font-bold w-fit
                    ${
                      active
                        ? 'text-brand-blue border-b-2 border-brand-blue pb-1'
                        : 'text-gray-700 hover:text-brand-blue'
                    }
                  `}
                >
                  {link.name}
                </Link>
              );
            })}

            <div className="pt-4 flex flex-col space-y-4 border-t border-gray-100">
              <Link
                href="/login"
                className="text-gray-700 text-lg font-bold"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Log In
              </Link>
              <Link
                href="/signup"
                className="bg-brand-blue text-white px-6 py-3 rounded-xl text-center font-bold shadow-lg"
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
