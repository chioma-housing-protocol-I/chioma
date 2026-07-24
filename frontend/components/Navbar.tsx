'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import Logo from '@/components/Logo';
import {
  Menu,
  X,
  User,
  LogOut,
  LayoutDashboard,
  ChevronDown,
} from 'lucide-react';
import { NAV_LINKS } from '@/constants/navigation';
import { useAuth } from '@/store/authStore';
import toast from 'react-hot-toast';

const WalletConnectButton = dynamic(
  () => import('@/components/auth/WalletConnectButton'),
  { ssr: false, loading: () => <div className="px-6 py-2.5" /> },
);

interface NavbarProps {
  theme?: 'light' | 'dark';
}

const Navbar = ({ theme = 'dark' }: NavbarProps) => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const { walletAddress, isAuthenticated, user, logout } = useAuth();
  const userMenuRef = useRef<HTMLDivElement>(null);

  void theme;

  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout>;
    const handleScroll = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => setIsScrolled(window.scrollY > 20), 100);
    };
    window.addEventListener('scroll', handleScroll);
    return () => {
      window.removeEventListener('scroll', handleScroll);
      clearTimeout(timeoutId);
    };
  }, []);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        userMenuRef.current &&
        !userMenuRef.current.contains(e.target as Node)
      ) {
        setIsUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/';
    return pathname.startsWith(href);
  };

  const handleLogout = async () => {
    setIsUserMenuOpen(false);
    await logout();
    toast.success('Signed out successfully.');
    router.push('/');
  };

  const dashboardHref = user?.role === 'admin' ? '/admin' : '/user';

  return (
    <header
      className={`top-0 left-0 right-0 z-50 transition-all duration-300 sticky ${
        isScrolled
          ? 'backdrop-blur-xl bg-slate-950/95 border-b border-white/20 py-2 shadow-xl shadow-black/20'
          : 'bg-transparent py-3'
      }`}
      suppressHydrationWarning
    >
      <nav
        className="container mx-auto px-4 sm:px-6 flex items-center justify-between"
        aria-label="Main navigation"
      >
        <Logo
          size="md"
          textClassName="text-xl font-bold text-white tracking-tight"
        />

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

        <div className="hidden md:flex items-center space-x-3">
          {isAuthenticated && user ? (
            <>
              {walletAddress && (
                <div className="px-3 py-1.5 rounded-lg bg-green-500/20 border border-green-500/50">
                  <p className="text-xs text-green-200 font-mono">
                    {walletAddress.slice(0, 6)}…{walletAddress.slice(-4)}
                  </p>
                </div>
              )}

              <div className="relative" ref={userMenuRef}>
                <button
                  onClick={() => setIsUserMenuOpen((v) => !v)}
                  className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all"
                  aria-expanded={isUserMenuOpen}
                  aria-haspopup="true"
                >
                  <div className="w-7 h-7 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                    {user.firstName[0]?.toUpperCase() ?? <User size={14} />}
                  </div>
                  <span className="text-sm text-white font-medium max-w-[100px] truncate">
                    {user.firstName}
                  </span>
                  <ChevronDown
                    size={14}
                    className={`text-blue-300/60 transition-transform ${isUserMenuOpen ? 'rotate-180' : ''}`}
                  />
                </button>

                {isUserMenuOpen && (
                  <div className="absolute right-0 top-full mt-2 w-52 bg-slate-900 border border-white/10 rounded-2xl shadow-2xl overflow-hidden z-50">
                    <div className="px-4 py-3 border-b border-white/10">
                      <p className="text-sm font-semibold text-white truncate">
                        {user.firstName} {user.lastName}
                      </p>
                      <p className="text-xs text-blue-300/50 truncate mt-0.5">
                        {user.email}
                      </p>
                    </div>
                    <div className="p-2">
                      <Link
                        href={dashboardHref}
                        onClick={() => setIsUserMenuOpen(false)}
                        className="flex items-center gap-3 px-3 py-2 rounded-xl text-sm text-blue-200 hover:bg-white/5 hover:text-white transition-colors"
                      >
                        <LayoutDashboard size={15} />
                        Dashboard
                      </Link>
                      <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm text-rose-400 hover:bg-rose-500/10 transition-colors"
                      >
                        <LogOut size={15} />
                        Sign out
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="px-4 py-2 text-sm font-medium text-blue-200 hover:text-white transition-colors"
              >
                Sign in
              </Link>
              <Link
                href="/signup"
                className="px-5 py-2 text-sm font-semibold bg-brass-500 hover:bg-brass-400 text-ink-950 rounded-xl transition-colors"
              >
                Get started
              </Link>
              {!walletAddress && (
                <WalletConnectButton
                  className="px-4 py-2 text-sm"
                  buttonText="Connect Wallet"
                />
              )}
            </>
          )}
        </div>

        {/* Mobile Menu Button */}
        <button
          className="md:hidden p-2.5 min-w-[44px] min-h-[44px] flex items-center justify-center -mr-1 rounded-lg hover:bg-white/10 transition-colors text-white"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          aria-label="Toggle menu"
          aria-expanded={isMobileMenuOpen}
          aria-controls="mobile-menu"
        >
          {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </nav>

      {/* Mobile Navigation Drawer */}
      {isMobileMenuOpen && (
        <nav
          id="mobile-menu"
          className="md:hidden absolute top-full left-0 right-0 backdrop-blur-xl bg-slate-950/98 border-b border-white/20 shadow-xl shadow-black/20"
          aria-label="Mobile navigation"
        >
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

            <div className="pt-4 flex flex-col space-y-3 border-t border-white/10">
              {isAuthenticated && user ? (
                <>
                  <Link
                    href={dashboardHref}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="flex items-center gap-2 px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white text-sm font-medium"
                  >
                    <LayoutDashboard size={16} />
                    Dashboard
                  </Link>
                  <button
                    onClick={() => {
                      setIsMobileMenuOpen(false);
                      handleLogout();
                    }}
                    className="flex items-center gap-2 px-4 py-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm font-medium"
                  >
                    <LogOut size={16} />
                    Sign out
                  </button>
                </>
              ) : (
                <>
                  <Link
                    href="/login"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white text-sm font-medium text-center"
                  >
                    Sign in
                  </Link>
                  <Link
                    href="/signup"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="px-4 py-3 rounded-xl bg-brass-500 text-ink-950 text-sm font-semibold text-center"
                  >
                    Get started
                  </Link>
                  <div onClick={() => setIsMobileMenuOpen(false)}>
                    <WalletConnectButton
                      className="w-full px-6 py-3"
                      buttonText="Connect Wallet"
                    />
                  </div>
                </>
              )}
            </div>
          </div>
        </nav>
      )}
    </header>
  );
};

export default Navbar;
