'use client';

import React, { useState, useEffect } from 'react';
import {
  Shield,
  AlertTriangle,
  CheckCircle2,
  TrendingUp,
  Download,
  MousePointer2,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
} from 'recharts';
import toast from 'react-hot-toast';

// Types for auth metrics data
interface AuthStats {
  totalAttempts: number;
  successfulAttempts: number;
  failedAttempts: number;
  successRate: number;
  averageDuration: number;
  methodBreakdown: {
    password: {
      attempts: number;
      successes: number;
      failures: number;
      successRate: number;
      averageDuration: number;
    };
    stellar: {
      attempts: number;
      successes: number;
      failures: number;
      successRate: number;
      averageDuration: number;
    };
  };
  dailyTrend: Array<{
    date: string;
    attempts: number;
    successes: number;
    failures: number;
  }>;
  errorBreakdown: Array<{
    error: string;
    count: number;
    percentage: number;
  }>;
}

// Mock data generator
const generateMockAuthStats = (): AuthStats => {
  const dates = Array.from({ length: 30 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (29 - i));
    return d.toISOString().split('T')[0];
  });

  return {
    totalAttempts: 1250,
    successfulAttempts: 1180,
    failedAttempts: 70,
    successRate: 94.4,
    averageDuration: 245.67,
    methodBreakdown: {
      password: {
        attempts: 850,
        successes: 820,
        failures: 30,
        successRate: 96.47,
        averageDuration: 180.45,
      },
      stellar: {
        attempts: 400,
        successes: 360,
        failures: 40,
        successRate: 90.0,
        averageDuration: 380.23,
      },
    },
    dailyTrend: dates.map((date) => ({
      date,
      attempts: Math.floor(Math.random() * 50) + 20,
      successes: Math.floor(Math.random() * 40) + 15,
      failures: Math.floor(Math.random() * 5),
    })),
    errorBreakdown: [
      { error: 'Invalid credentials', count: 35, percentage: 50 },
      { error: 'Invalid signature', count: 20, percentage: 28.57 },
      { error: 'Account locked', count: 10, percentage: 14.29 },
      { error: 'MFA failed', count: 5, percentage: 7.14 },
    ],
  };
};

export default function AuthMetricsPage() {
  const [stats, setStats] = useState<AuthStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [days, setDays] = useState(30);

  useEffect(() => {
    // Simulate API call
    setTimeout(() => {
      setStats(generateMockAuthStats());
      setIsLoading(false);
    }, 1000);
  }, [days]);

  const handleExport = () => {
    toast.success('Metrics exported successfully');
  };

  if (isLoading || !stats) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-blue-500/10 text-blue-400 rounded-3xl flex items-center justify-center border border-blue-500/20 shadow-lg">
            <Shield size={32} />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-white">
              Auth Metrics
            </h1>
            <p className="text-blue-200/60 mt-1">
              Real-time authentication patterns and security insights.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
            className="bg-white/5 border border-white/10 text-white rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value={7}>Last 7 Days</option>
            <option value={30}>Last 30 Days</option>
            <option value={90}>Last 90 Days</option>
          </select>
          <button
            onClick={handleExport}
            className="flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-xl font-medium transition-all shadow-lg hover:shadow-xl"
          >
            <Download size={18} />
            <span>Export</span>
          </button>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          title="Total Login Attempts"
          value={stats.totalAttempts}
          icon={MousePointer2}
          trend="up"
          trendValue="+12%"
        />
        <MetricCard
          title="Successful Logins"
          value={stats.successfulAttempts}
          icon={CheckCircle2}
          color="emerald"
        />
        <MetricCard
          title="Failed Logins"
          value={stats.failedAttempts}
          icon={AlertTriangle}
          color="red"
        />
        <MetricCard
          title="Success Rate"
          value={`${stats.successRate}%`}
          icon={TrendingUp}
          color="indigo"
        />
      </div>

      {/* Main Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6">
          <h3 className="text-lg font-semibold text-white mb-6">
            Login Trends
          </h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={stats.dailyTrend}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="rgba(255,255,255,0.1)"
                  vertical={false}
                />
                <XAxis
                  dataKey="date"
                  stroke="rgba(255,255,255,0.5)"
                  tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 12 }}
                  tickFormatter={(val) => val.split('-').slice(1).join('/')}
                />
                <YAxis
                  stroke="rgba(255,255,255,0.5)"
                  tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 12 }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0F172A',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '12px',
                  }}
                  itemStyle={{ color: '#fff' }}
                />
                <Line
                  type="monotone"
                  dataKey="successes"
                  name="Success"
                  stroke="#10b981"
                  strokeWidth={3}
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="failures"
                  name="Failure"
                  stroke="#ef4444"
                  strokeWidth={3}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6">
          <h3 className="text-lg font-semibold text-white mb-6">
            Method Breakdown
          </h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={[
                  {
                    name: 'Password',
                    attempts: stats.methodBreakdown.password.attempts,
                    successes: stats.methodBreakdown.password.successes,
                  },
                  {
                    name: 'Stellar Auth',
                    attempts: stats.methodBreakdown.stellar.attempts,
                    successes: stats.methodBreakdown.stellar.successes,
                  },
                ]}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="rgba(255,255,255,0.1)"
                  vertical={false}
                />
                <XAxis
                  dataKey="name"
                  stroke="rgba(255,255,255,0.5)"
                  tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 12 }}
                />
                <YAxis
                  stroke="rgba(255,255,255,0.5)"
                  tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 12 }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0F172A',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '12px',
                  }}
                />
                <Bar
                  dataKey="attempts"
                  name="Attempts"
                  fill="#3b82f6"
                  radius={[4, 4, 0, 0]}
                  barSize={40}
                />
                <Bar
                  dataKey="successes"
                  name="Successes"
                  fill="#10b981"
                  radius={[4, 4, 0, 0]}
                  barSize={40}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Error Analysis */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6">
          <h3 className="text-lg font-semibold text-white mb-6">
            Error Analysis
          </h3>
          <div className="space-y-6">
            {stats.errorBreakdown.map((error, idx) => (
              <div key={idx} className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-white font-medium">{error.error}</span>
                  <span className="text-blue-200/60">
                    {error.count} occurrences ({error.percentage}%)
                  </span>
                </div>
                <div className="w-full bg-white/5 rounded-full h-2">
                  <div
                    className="bg-red-500 h-2 rounded-full transition-all duration-500"
                    style={{ width: `${error.percentage}%` }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6">
          <h3 className="text-lg font-semibold text-white mb-6">
            System Health
          </h3>
          <div className="space-y-6">
            <HealthIndicator label="MFA Adoption" value="32%" status="good" />
            <HealthIndicator
              label="Avg. Response Time"
              value="245ms"
              status="good"
            />
            <HealthIndicator
              label="Brute-force Blocked"
              value="12"
              status="warning"
            />
            <HealthIndicator
              label="Account Lockouts"
              value="4"
              status="normal"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

interface MetricCardProps {
  title: string;
  value: string | number;
  icon: React.ElementType;
  color?: 'blue' | 'emerald' | 'red' | 'indigo';
  trend?: 'up' | 'down';
  trendValue?: string;
}

function MetricCard({
  title,
  value,
  icon: Icon,
  color = 'blue',
  trend,
  trendValue,
}: MetricCardProps) {
  const colors: Record<string, string> = {
    blue: 'bg-blue-500/20 text-blue-400 border-blue-500/20',
    emerald: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/20',
    red: 'bg-red-500/20 text-red-400 border-red-500/20',
    indigo: 'bg-indigo-500/20 text-indigo-400 border-indigo-500/20',
  };

  return (
    <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6 hover:bg-white/10 transition-all duration-300 group">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-blue-200/60 text-sm font-medium mb-1">{title}</p>
          <p className="text-3xl font-bold text-white tabular-nums">{value}</p>
          {trend && (
            <p
              className={`mt-2 text-xs flex items-center ${trend === 'up' ? 'text-emerald-400' : 'text-red-400'}`}
            >
              <TrendingUp
                size={12}
                className={`mr-1 ${trend === 'down' ? 'rotate-180' : ''}`}
              />
              {trendValue} from last period
            </p>
          )}
        </div>
        <div
          className={`w-12 h-12 ${colors[color]} rounded-2xl flex items-center justify-center border group-hover:scale-110 transition-transform duration-300`}
        >
          <Icon size={24} />
        </div>
      </div>
    </div>
  );
}

function HealthIndicator({
  label,
  value,
  status,
}: {
  label: string;
  value: string;
  status: 'good' | 'warning' | 'normal';
}) {
  const dots: Record<string, string> = {
    good: 'bg-emerald-400',
    warning: 'bg-yellow-400',
    normal: 'bg-blue-400',
  };

  return (
    <div className="flex items-center justify-between p-4 bg-white/5 border border-white/5 rounded-2xl">
      <div className="flex items-center gap-3">
        <div
          className={`w-2 h-2 rounded-full ${dots[status]} shadow-[0_0_8px_rgba(0,0,0,0.5)]`}
        ></div>
        <span className="text-blue-200/70 text-sm">{label}</span>
      </div>
      <span className="text-white font-bold">{value}</span>
    </div>
  );
}
