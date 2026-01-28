"use client";

import React, { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
  House,
  Building2,
  Wallet,
  MessageSquare,
  FileText,
  PieChart,
  Bell,
  Search,
  Plus,
  LogOut,
  Menu,
} from "lucide-react";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

const DashboardLayout = ({ children }: DashboardLayoutProps) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const pathname = usePathname();

  const navItems = [
    {
      name: "Dashboard",
      href: "/agent",
      icon: House,
    },
    {
      name: "Properties",
      href: "/dashboard/properties",
      icon: Building2,
    },
    {
      name: "My Wallet",
      href: "/dashboard/wallet",
      icon: Wallet,
    },
    {
      name: "Messages",
      href: "/dashboard/messages",
      icon: MessageSquare,
      badge: "3",
      badgeColor: "bg-blue-600",
    },
    {
      name: "Contracts",
      href: "/dashboard/contracts",
      icon: FileText,
    },
    {
      name: "Analytics",
      href: "/dashboard/analytics",
      icon: PieChart,
    },
  ];

  const isActive = (href: string) => {
    if (href === "/agent") return pathname === "/agent";
    return pathname.startsWith(href);
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex">
      {/* Sidebar Overlay */}
      <div
        className={`fixed inset-0 bg-black/50 backdrop-blur-sm z-40 transition-opacity duration-300 lg:hidden ${
          isSidebarOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
        onClick={() => setIsSidebarOpen(false)}
      />

      {/* Sidebar */}
      <aside
        className={`fixed lg:static top-0 left-0 bottom-0 w-64 bg-sidebar-bg text-sidebar-text z-50 transition-transform duration-300 ease-in-out lg:translate-x-0 flex flex-col shrink-0 ${
          isSidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Logo */}
        <div className="h-24 flex items-center px-8">
          <Link href="/" className="flex items-center gap-3">
            <div className="w-8 h-8 bg-brand-blue rounded-lg flex items-center justify-center text-white font-bold text-lg">
              C
            </div>
            <span className="text-xl font-bold text-white tracking-tight">
              Chioma
            </span>
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-4 space-y-2 py-4">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);

            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={() => setIsSidebarOpen(false)}
                className={`relative flex items-center justify-between px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 group ${
                  active
                    ? "bg-sidebar-hover text-sidebar-text-active"
                    : "hover:text-sidebar-text-active hover:bg-white/5"
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon
                    size={20}
                    className={`transition-colors duration-200 ${
                      active
                        ? "text-brand-blue"
                        : "text-neutral-500 group-hover:text-neutral-300"
                    }`}
                  />
                  <span>{item.name}</span>
                </div>

                {item.badge && (
                  <span
                    className={`px-1.5 py-0.5 rounded-sm text-[10px] font-bold text-white ${item.badgeColor}`}
                  >
                    {item.badge}
                  </span>
                )}

                {/* Active Indicator Left Border */}
                {active && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-brand-blue rounded-r-full" />
                )}
              </Link>
            );
          })}
        </nav>

        {/* User Footer */}
        <div className="p-4 border-t border-white/5 mx-4 mb-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-full border-2 border-white/10 overflow-hidden relative shrink-0">
              <Image
                src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop"
                alt="User"
                width={40}
                height={40}
              />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-white text-sm font-medium leading-none mb-1">
                Sarah Jenks
              </div>
              <div className="text-neutral-500 text-xs mb-3">
                Agent ID: #8839
              </div>

              <button
                type="button"
                className="flex items-center gap-2 text-xs font-semibold text-neutral-400 hover:text-white transition-colors group mt-2"
              >
                <LogOut
                  size={14}
                  className="group-hover:translate-x-1 transition-transform"
                />
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-y-auto">
        {/* Header */}
        <header className="sticky top-0 z-30 h-20 px-8 flex items-center justify-between bg-white border-b border-neutral-100">
          <div className="flex items-center gap-4 lg:hidden">
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="p-2 text-neutral-600 hover:bg-neutral-50 rounded-lg"
            >
              <Menu size={24} />
            </button>
          </div>

          <div className="hidden lg:block">
            <h1 className="text-2xl font-bold text-neutral-900">Dashboard</h1>
            <p className="text-sm text-neutral-500">Welcome back, Sarah</p>
          </div>

          <div className="flex-1 flex items-center justify-end gap-6">
            {/* Search */}
            <div className="hidden md:flex items-center relative w-96">
              <Search size={16} className="absolute left-4 text-neutral-400" />
              <input
                type="text"
                placeholder="Search properties, clients..."
                className="w-full pl-11 pr-4 py-2.5 bg-white border border-neutral-200 rounded-lg text-sm outline-none focus:border-brand-blue/50 focus:ring-4 focus:ring-brand-blue/5 transition-all"
              />
            </div>

            {/* Notification */}
            <button className="relative p-2 text-neutral-400 hover:text-neutral-600 transition-colors">
              <Bell size={20} />
              <span className="absolute top-2 right-2.5 w-2 h-2 bg-red-500 rounded-full border border-white"></span>
            </button>

            {/* CTA */}
            <button className="flex items-center gap-2 bg-brand-blue hover:bg-blue-700 text-white px-5 py-2.5 rounded-lg text-sm font-semibold transition-colors shadow-lg shadow-blue-500/20">
              <Plus size={18} />
              <span>Create New Listing</span>
            </button>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-8">{children}</main>
      </div>
    </div>
  );
};

export default DashboardLayout;
