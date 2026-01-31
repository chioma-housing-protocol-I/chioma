"use client";

import Sidebar from "../../components/landlord-dashboard/Sidebar";
import Topbar from "../../components/landlord-dashboard/Topbar";
import { usePathname } from "next/navigation";
import { ReactNode } from "react";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  const pageTitleMap: Record<string, string> = {
    "/landlords": "Dashboard Overview",
    "/landlords/properties": "Properties",
    "/landlords/properties/add": "Add New Property",
    "/landlords/tenants": "Tenants",
    "/landlords/financials": "Financials",
    "/landlords/maintenance": "Maintenance",
    "/landlords/documents": "Documents",
    "/landlords/settings": "Settings",
  };

  const pageTitle = pageTitleMap[pathname] ?? "Dashboard";

  return (
    <div className="flex h-screen bg-gray-100 overflow-x-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Topbar pageTitle={pageTitle} />
        <main className="p-6 overflow-auto flex-1">{children}</main>
      </div>
    </div>
  );
}
