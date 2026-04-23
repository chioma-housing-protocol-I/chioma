/**
 * User Dashboard Types
 * Shared types for all dashboard components
 */

import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';

/**
 * Navigation item for sidebar
 */
export interface NavItem {
  name: string;
  href: string;
  icon: LucideIcon;
  badge?: number;
  visibleFor?: ('user' | 'admin')[];
}

/**
 * KPI (Key Performance Indicator) data
 */
export interface KPIData {
  label: string;
  value: string | number;
  change?: number;
  changeType?: 'increase' | 'decrease' | 'neutral';
  icon?: ReactNode;
  color?: 'blue' | 'green' | 'red' | 'yellow';
}

/**
 * Transaction record
 */
export interface Transaction {
  id: string;
  type: 'rent' | 'deposit' | 'refund' | 'commission' | 'maintenance' | 'other';
  amount: number;
  currency: string;
  status: 'completed' | 'pending' | 'failed';
  date: string;
  description: string;
  reference?: string;
  counterparty?: string;
}

/**
 * Recent activity item
 */
export interface ActivityItem {
  id: string;
  type: 'transaction' | 'dispute' | 'maintenance' | 'review' | 'document';
  title: string;
  description?: string;
  timestamp: string;
  icon?: ReactNode;
  status?: 'pending' | 'completed' | 'failed';
}

/**
 * Property portfolio item
 */
export interface PropertyPortfolioItem {
  id: string;
  name: string;
  address: string;
  image?: string;
  status: 'active' | 'inactive' | 'maintenance';
  occupancy?: number;
  monthlyRevenue?: number;
  tenants?: number;
}

/**
 * Security deposit record
 */
export interface SecurityDeposit {
  id: string;
  propertyId: string;
  propertyName: string;
  tenantName: string;
  amount: number;
  currency: string;
  status: 'held' | 'released' | 'disputed';
  releaseDate?: string;
  notes?: string;
}

/**
 * Dashboard layout props
 */
export interface DashboardLayoutProps {
  children: ReactNode;
  sidebar?: ReactNode;
  topbar?: ReactNode;
  className?: string;
}

/**
 * Sidebar props
 */
export interface SidebarProps {
  navItems: NavItem[];
  isOpen?: boolean;
  onClose?: () => void;
  userRole?: 'user' | 'admin';
  className?: string;
}

/**
 * Topbar props
 */
export interface TopbarProps {
  pageTitle?: string;
  showSearch?: boolean;
  showNotifications?: boolean;
  showUserMenu?: boolean;
  className?: string;
}

/**
 * KPI Cards props
 */
export interface KPICardsProps {
  data: KPIData[];
  columns?: 1 | 2 | 3 | 4;
  className?: string;
}

/**
 * Recent Activity props
 */
export interface RecentActivityProps {
  items: ActivityItem[];
  maxItems?: number;
  onItemClick?: (item: ActivityItem) => void;
  className?: string;
}

/**
 * Transactions Table props
 */
export interface TransactionsTableProps {
  transactions: Transaction[];
  maxRows?: number;
  onRowClick?: (transaction: Transaction) => void;
  showFilters?: boolean;
  className?: string;
}

/**
 * Property Portfolio props
 */
export interface PropertyPortfolioProps {
  properties: PropertyPortfolioItem[];
  onPropertyClick?: (property: PropertyPortfolioItem) => void;
  className?: string;
}

/**
 * Security Deposits Section props
 */
export interface SecurityDepositsSectionProps {
  deposits: SecurityDeposit[];
  onDepositClick?: (deposit: SecurityDeposit) => void;
  className?: string;
}
