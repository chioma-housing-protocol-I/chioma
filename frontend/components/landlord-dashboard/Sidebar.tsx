import SidebarItem from './SidebarItem';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { FaBuilding, FaChartPie } from 'react-icons/fa';
import { FaScrewdriverWrench, FaArrowRightFromBracket } from 'react-icons/fa6';
import { HiSquares2X2, HiUsers } from 'react-icons/hi2';
import { IoDocumentTextSharp } from 'react-icons/io5';
import { IoMdSettings, IoMdNotifications } from 'react-icons/io';
import { MdGavel, MdReviews } from 'react-icons/md';
import Logo from '@/components/Logo';

export const navItems = [
  { icon: HiSquares2X2, label: 'Dashboard', href: '/landlords' },
  { icon: FaBuilding, label: 'Properties', href: '/landlords/properties' },
  { icon: HiUsers, label: 'Tenants', href: '/landlords/tenants' },
  { icon: FaChartPie, label: 'Financials', href: '/landlords/financials' },
  {
    icon: FaScrewdriverWrench,
    label: 'Maintenance',
    href: '/landlords/maintenance',
  },
  {
    icon: IoDocumentTextSharp,
    label: 'Documents',
    href: '/landlords/documents',
  },
  {
    icon: IoMdNotifications,
    label: 'Notifications',
    href: '/landlords/notifications',
  },
  { icon: MdGavel, label: 'Disputes', href: '/landlords/disputes' },
  { icon: MdReviews, label: 'Reviews', href: '/landlords/reviews' },
  { icon: IoMdSettings, label: 'Settings', href: '/landlords/settings' },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    // Desktop: full width (unchanged) on lg and up
    // Tablet (md): collapsed icon-only sidebar
    // Mobile (sm): hidden (mobile drawer is handled by Topbar)
    <aside className="hidden md:flex md:flex-col md:w-20 lg:w-56 h-screen backdrop-blur-xl bg-slate-900/50 border-r border-white/10">
      <Logo
        size="lg"
        href="/"
        className="justify-center lg:justify-start"
        textClassName="hidden lg:block text-2xl lg:text-3xl font-bold bg-gradient-to-r from-blue-300 to-indigo-300 bg-clip-text text-transparent"
      />

      <nav className="flex-1">
        {navItems.map((item) => {
          // Check if it's the root landlord path, require exact match
          const isActive =
            item.href === '/landlords'
              ? pathname === '/landlords'
              : pathname.startsWith(item.href);

          return (
            <SidebarItem
              key={item.href}
              icon={item.icon}
              label={item.label}
              href={item.href}
              isActive={isActive}
            />
          );
        })}
      </nav>

      <div className="hidden lg:block p-4 border-t border-white/10">
        <button className="group flex items-center gap-3 rounded-xl px-4 py-2.5 hover:bg-white/10 transition-colors cursor-pointer w-full text-left">
          <div className="relative h-10 w-10 overflow-hidden rounded-full border border-white/20">
            <Image
              src="/avatar.png"
              alt="User Avatar"
              width={100}
              height={100}
              sizes="40px"
              className="rounded-full"
            />
          </div>

          <div className="flex flex-col items-start overflow-hidden">
            <span className="text-sm font-semibold text-white truncate w-full">
              James Smith
            </span>
            <span className="text-xs text-blue-300/60">Premium Landlord</span>
          </div>

          <FaArrowRightFromBracket className="h-5 w-5 text-blue-300/40 group-hover:text-blue-300 transition-colors ml-auto" />
        </button>
      </div>
    </aside>
  );
}
