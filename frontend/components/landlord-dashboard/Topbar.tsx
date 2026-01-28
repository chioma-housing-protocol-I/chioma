"use client";

import { useState } from "react";
import { FaSearch, FaBell, FaPlus, FaBars, FaTimes } from "react-icons/fa";
import Link from "next/link";
import { navItems } from "./Sidebar";
import Image from "next/image";
import { FaArrowRightFromBracket } from "react-icons/fa6";
import { usePathname } from "next/navigation";

export default function Topbar({ pageTitle }: { pageTitle: string }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const pathname = usePathname();

  return (
    <>
      {/* ================= Topbar ================= */}
      <header className="flex items-center justify-between px-3 py-2 md:p-4 bg-white shadow">
        {/* Left */}
        <div className="flex items-center gap-3 md:gap-4">
          <button
            className="md:hidden"
            onClick={() => setMobileOpen(true)}
            aria-label="Open menu"
          >
            <FaBars />
          </button>

          <h1 className="text-base md:text-2xl font-bold text-[#1e40af]">
            {pageTitle}
          </h1>
        </div>

        {/* Search (tablet & desktop) */}
        <div className="hidden md:flex items-center px-3 py-2 border border-gray-300 bg-gray-100 rounded-lg w-1/3">
          <FaSearch className="text-gray-500" />
          <input
            type="text"
            placeholder="Search properties, tenants..."
            className="mx-3 w-full bg-transparent outline-none"
          />
        </div>

        {/* Right */}
        <div className="flex items-center gap-4 md:gap-6">
          <button
            className="md:hidden"
            onClick={() => setSearchOpen(true)}
            aria-label="Open search"
          >
            <FaSearch className="text-gray-500" size={18} />
          </button>

          <button className="relative">
            <FaBell className="text-gray-500" size={20} />
            <span className="absolute top-0 right-0 w-1.5 h-1.5 bg-red-600 rounded-full" />
          </button>

          <button className="flex items-center gap-2 bg-[#1e40af] text-white text-sm md:text-base font-bold py-2 px-3 md:px-5 rounded-lg hover:bg-blue-700">
            <FaPlus />
            <span className="hidden md:inline">Add Property</span>
          </button>
        </div>
      </header>

      {/* ================= Mobile Search Overlay ================= */}
      <div
        className={`fixed inset-0 z-50 transition
          ${searchOpen ? "visible pointer-events-auto" : "invisible pointer-events-none"}
        `}
      >
        {/* overlay */}
        <div
          className={`absolute inset-0 bg-black/40 transition-opacity
            ${searchOpen ? "opacity-100" : "opacity-0"}
          `}
          onClick={() => setSearchOpen(false)}
        />

        {/* panel */}
        <div
          className={`relative bg-white p-4 shadow-md transform transition-transform
            ${searchOpen ? "translate-y-0" : "-translate-y-full"}
          `}
        >
          <div className="flex items-center gap-3">
            <FaSearch className="text-gray-500" />
            <input
              autoFocus
              type="text"
              placeholder="Search properties, tenants..."
              className="w-full outline-none text-sm"
            />
            <button onClick={() => setSearchOpen(false)}>
              <FaTimes />
            </button>
          </div>
        </div>
      </div>

      {/* ================= Mobile Drawer ================= */}
      <div
        className={`fixed inset-0 z-50 transition
          ${mobileOpen ? "visible pointer-events-auto" : "invisible pointer-events-none"}
        `}
      >
        {/* overlay */}
        <div
          className={`absolute inset-0 bg-black/40 transition-opacity
            ${mobileOpen ? "opacity-100" : "opacity-0"}
          `}
          onClick={() => setMobileOpen(false)}
        />

        {/* drawer */}
        <aside
          className={`relative flex flex-col justify-between h-full bg-white shadow-lg
            transform transition-transform duration-300
            ${mobileOpen ? "translate-x-0" : "-translate-x-full"}
            w-52 sm:w-64
          `}
        >
          <div>
            <div className="flex items-center justify-between p-4 border-b border-gray-300">
              <div className="text-lg font-bold text-[#1e40af]">Chioma</div>
              <button onClick={() => setMobileOpen(false)}>
                <FaTimes />
              </button>
            </div>

            <nav className="p-2">
              {navItems.map((item) => {
                const isActive =
                  item.href === "/landlords"
                    ? pathname === item.href
                    : pathname.startsWith(item.href);

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileOpen(false)}
                    className={`flex items-center gap-3 px-4 py-3 rounded transition
                      ${
                        isActive
                          ? "bg-blue-100/70 text-[#1e40af] font-semibold"
                          : "hover:bg-gray-100 text-gray-700"
                      }
                    `}
                  >
                    <item.icon className="w-5 h-5" />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </nav>
          </div>

          <button className="group mb-6 flex items-center gap-3 px-4 py-2.5">
            <div className="relative h-10 w-10 overflow-hidden rounded-full">
              <Image
                src="/avatar.png"
                alt="User Avatar"
                width={100}
                height={100}
                className="rounded-full"
              />
            </div>

            <div className="flex flex-col items-start">
              <span className="text-sm font-semibold">James...</span>
              <span className="text-sm text-gray-500">Premium...</span>
            </div>

            <FaArrowRightFromBracket className="ml-auto h-5 w-5 text-gray-400" />
          </button>
        </aside>
      </div>
    </>
  );
}