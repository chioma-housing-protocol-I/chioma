// Dashboard type definitions

export type StatusType =
  | 'occupied'
  | 'vacant'
  | 'maintenance'
  | 'pending'
  | 'completed'
  | 'received';

export interface KPIData {
  title: string;
  value: string;
  subtitle: string;
  trend?: {
    direction: 'up' | 'down';
    percentage: number;
  };
  icon?: string;
}

export interface WalletData {
  balance: string;
  usdEquivalent?: string;
}

export interface RevenueDataPoint {
  month: string;
  revenue: number;
  date: string;
}

export interface Activity {
  id: string;
  title: string;
  description: string;
  timestamp: string;
  status: StatusType;
  icon: 'payment' | 'document' | 'inspection' | 'maintenance' | 'tenant';
}

export interface Property {
  id: string;
  name: string;
  address: string;
  status: 'occupied' | 'vacant' | 'maintenance';
  tenant: string | null;
  contractValue: string;
  leaseEnds: string | null;
  image: string;
}

export type TimeRange = '6months' | '1year' | 'alltime';

export interface DashboardData {
  kpis: {
    totalRevenue: KPIData;
    occupancyRate: number;
    propertiesOwned: KPIData;
    walletBalance: WalletData;
  };
  revenueData: Record<TimeRange, RevenueDataPoint[]>;
  activities: Activity[];
  properties: Property[];
}
