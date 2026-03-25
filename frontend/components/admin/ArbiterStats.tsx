'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface StatsData {
  totalArbiters: number;
  activeArbiters: number;
  avgResolutionTime: number;
  avgRating: string;
}

interface ArbiterStatsProps {
  stats: StatsData;
}

export function ArbiterStats({ stats }: ArbiterStatsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-gray-500">
            Total Arbiters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.totalArbiters}</div>
          <p className="text-xs text-gray-500 mt-1">
            {stats.activeArbiters} active
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-gray-500">
            Active Arbiters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-green-600">
            {stats.activeArbiters}
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Available for assignment
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-gray-500">
            Avg. Resolution Time
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.avgResolutionTime}h</div>
          <p className="text-xs text-gray-500 mt-1">hours</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-gray-500">
            Average Rating
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {stats.avgRating}⭐
          </div>
          <p className="text-xs text-gray-500 mt-1">out of 5</p>
        </CardContent>
      </Card>
    </div>
  );
}
