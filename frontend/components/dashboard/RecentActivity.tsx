"use client";

import React from "react";
import { Wrench, FileCheck, CreditCard, ChevronRight } from "lucide-react";
import { formatDistanceToNow } from "date-fns";


const RecentActivity = () => {
  const MOCK_NOW = new Date("2025-01-24T12:00:00");

  const activities = [
    {
      id: 1,
      type: "maintenance",
      title: "Maintenance Request - Unit 12",
      description: "Leak reported in master bathroom",
      timestamp: new Date(MOCK_NOW.getTime() - 2 * 60 * 60 * 1000),
      status: "pending",
      icon: Wrench,
      iconBg: "bg-orange-100",
      iconColor: "text-orange-600",
    },
    {
      id: 2,
      type: "lease",
      title: "Lease Signed - Apt 12",
      description: "New tenant: Michael Johnson",
      timestamp: new Date(MOCK_NOW.getTime() - 5 * 60 * 60 * 1000),
      status: "completed",
      icon: FileCheck,
      iconBg: "bg-green-100",
      iconColor: "text-brand-green",
      avatar: "/avatars/michael.jpg",
    },
    {
      id: 3,
      type: "payment",
      title: "Rent Payment - Unit 101",
      description: "Received ₦2.5M via Stellar",
      timestamp: new Date(MOCK_NOW.getTime() - 24 * 60 * 60 * 1000),
      status: "received",
      icon: CreditCard,
      iconBg: "bg-blue-100",
      iconColor: "text-brand-blue",
    },
  ];

  const getStatusBadge = (status: string) => {
    const badges = {
      pending: {
        text: "Pending",
        color: "bg-orange-100 text-orange-600",
      },
      completed: {
        text: "Completed",
        color: "bg-green-100 text-brand-green",
      },
      received: {
        text: "Received",
        color: "bg-blue-100 text-brand-blue",
      },
    };

    return badges[status as keyof typeof badges] || badges.pending;
  };

  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-neutral-200 h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-neutral-900">Recent Activity</h2>
        <button className="text-sm font-semibold text-brand-blue hover:text-brand-blue-dark transition-colors">
          View All
        </button>
      </div>

      {/* Activity List */}
      <div className="space-y-4">
        {activities.map((activity) => {
          const Icon = activity.icon;
          const badge = getStatusBadge(activity.status);

          return (
            <div
              key={activity.id}
              className="flex items-start space-x-4 p-4 rounded-xl hover:bg-neutral-50 transition-colors cursor-pointer group"
            >
              <div className={`p-3 rounded-lg ${activity.iconBg} shrink-0`}>
                <Icon className={activity.iconColor} size={20} />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between mb-1">
                  <h4 className="text-sm font-semibold text-neutral-900 group-hover:text-brand-blue transition-colors">
                    {activity.title}
                  </h4>
                  <span className="text-xs text-neutral-400 shrink-0 ml-2">
                    {formatDistanceToNow(activity.timestamp, {
                      addSuffix: true,
                    })}
                  </span>
                </div>
                <p className="text-sm text-neutral-500 mb-2">
                  {activity.description}
                </p>
                <span
                  className={`inline-block px-2.5 py-1 rounded-full text-xs font-semibold ${badge.color}`}
                >
                  {badge.text}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      <button className="mt-4 w-full flex items-center justify-center space-x-2 py-3 text-sm font-semibold text-neutral-600 hover:text-brand-blue hover:bg-neutral-50 rounded-lg transition-colors group">
        <span>View All Activity</span>
        <ChevronRight
          size={16}
          className="group-hover:translate-x-1 transition-transform"
        />
      </button>
    </div>
  );
};

export default RecentActivity;