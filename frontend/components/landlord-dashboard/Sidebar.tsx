import SidebarItem from "./SidebarItem";
import Image from "next/image";
import { FaBuilding, FaChartPie } from "react-icons/fa";
import { FaScrewdriverWrench, FaArrowRightFromBracket } from "react-icons/fa6";
import { HiSquares2X2, HiUsers } from "react-icons/hi2";
import { IoDocumentTextSharp } from "react-icons/io5";
import { IoMdSettings } from "react-icons/io";

export const navItems = [
  { icon: HiSquares2X2, label: "Dashboard", href: "/landlords" },
  { icon: FaBuilding, label: "Properties", href: "/landlords/properties" },
  { icon: HiUsers, label: "Tenants", href: "/landlords/tenants" },
  { icon: FaChartPie, label: "Financials", href: "/landlords/financials" },
  {
    icon: FaScrewdriverWrench,
    label: "Maintenance",
    href: "/landlords/maintenance",
  },
  {
    icon: IoDocumentTextSharp,
    label: "Documents",
    href: "/landlords/documents",
  },
  { icon: IoMdSettings, label: "Settings", href: "/landlords/settings" },
];

export default function Sidebar() {
  return (
    // Desktop: full width (unchanged) on lg and up
    // Tablet (md): collapsed icon-only sidebar
    // Mobile (sm): hidden (mobile drawer is handled by Topbar)
    <aside className="hidden md:flex md:flex-col md:w-20 lg:w-56 h-screen bg-white shadow">
      <div className="p-4 lg:p-10 text-2xl lg:text-3xl font-bold text-[#1e40af] flex items-center justify-center lg:justify-start">
        <span className="hidden lg:block">Chioma</span>
        <span className="lg:hidden">C</span>
      </div>

      <nav className="flex-1">
        {navItems.map((item) => (
          <SidebarItem
            key={item.href}
            icon={item.icon}
            label={item.label}
            href={item.href}
          />
        ))}
      </nav>

      <div className="hidden lg:block">
        <button className="group mb-10 flex items-center gap-3 rounded-xl px-4 py-2.5 hover:bg-white/10 transition-colors cursor-pointer">
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

          <FaArrowRightFromBracket className="h-5 w-5 text-gray-400" />
        </button>
      </div>
    </aside>
  );
}
