/**
 * Mock Dashboard Analytics Data\n */

export interface MonthlyEarning {
  month: string;
  commission: number;
  target: number;
}

export interface ConversionData {
  name: string;
  value: number;
  fill: string;
}

export interface ListingPerformance {
  name: string;
  views: number;
  inquiries: number;
  contracts: number;
}

import type { ElementType, ReactNode } from 'react';

export interface KPISummary {
  label: string;
  value: string;
  change: string;
  positive: boolean;
  icon: ElementType | ReactNode;
  iconBg: string;
  iconColor: string;
}

export interface RatingStats {
  averageRating: number;
  totalReviews: number;
  distribution: Record<number, number>;
}

export const MOCK_MONTHLY_EARNINGS: MonthlyEarning[] = [
  { month: 'Jan', commission: 2800, target: 3000 },
  { month: 'Feb', commission: 3200, target: 3000 },
  { month: 'Mar', commission: 2600, target: 3000 },
  { month: 'Apr', commission: 4100, target: 3500 },
  { month: 'May', commission: 3750, target: 3500 },
  { month: 'Jun', commission: 5200, target: 4000 },
  { month: 'Jul', commission: 4800, target: 4000 },
  { month: 'Aug', commission: 6100, target: 4500 },
  { month: 'Sep', commission: 5500, target: 4500 },
  { month: 'Oct', commission: 7200, target: 5000 },
  { month: 'Nov', commission: 6800, target: 5000 },
  { month: 'Dec', commission: 8400, target: 5500 },
];

export const MOCK_CONVERSION_DATA: ConversionData[] = [
  { name: 'Profile Views', value: 1240, fill: '#3b82f6' },
  { name: 'Inquiries', value: 430, fill: '#8b5cf6' },
  { name: 'Site Visits', value: 182, fill: '#f59e0b' },
  { name: 'Closed Contracts', value: 34, fill: '#10b981' },
];

export const MOCK_LISTING_PERFORMANCE: ListingPerformance[] = [
  { name: '12 Palm Ave', views: 320, inquiries: 45, contracts: 3 },
  { name: '7 Sunset Blvd', views: 210, inquiries: 30, contracts: 2 },
  { name: '88 Maple St', views: 180, inquiries: 22, contracts: 1 },
  { name: '3 River Rd', views: 150, inquiries: 18, contracts: 2 },
  { name: '55 Oak Lane', views: 130, inquiries: 12, contracts: 1 },
];

export const MOCK_RATING_STATS: RatingStats = {
  averageRating: 4.6,
  totalReviews: 24,
  distribution: {
    1: 0,
    2: 1,
    3: 2,
    4: 7,
    5: 14,
  },
};

export function buildRatingStats(
  reviews: Array<{ rating: number }>,
): RatingStats {
  const total = reviews.length;
  const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };

  for (const review of reviews) {
    distribution[review.rating as keyof typeof distribution]++;
  }

  const sum = reviews.reduce((acc, r) => acc + r.rating, 0);
  const average = total > 0 ? sum / total : 0;

  return {
    averageRating: Math.round(average * 10) / 10,
    totalReviews: total,
    distribution,
  };
}
