'use client';

import React, { useState } from 'react';
import { Bell, Wrench, LayoutGrid, List } from 'lucide-react';
import AnnouncementsFeed from '@/components/announcements/AnnouncementsFeed';
import TenantMaintenanceTracker from '@/components/maintenance/TenantMaintenanceTracker';

type ViewTab = 'announcements' | 'maintenance';
type ViewMode = 'combined' | 'separate';

export default function PropertyUpdatesPage() {
  const [activeTab, setActiveTab] = useState<ViewTab>('announcements');
  const [viewMode, setViewMode] = useState<ViewMode>('combined');

  const tabs = [
    {
      id: 'announcements' as ViewTab,
      label: 'Announcements',
      icon: Bell,
      description: 'Updates from your landlord',
    },
    {
      id: 'maintenance' as ViewTab,
      label: 'Maintenance',
      icon: Wrench,
      description: 'Track your maintenance requests',
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Property Updates & Maintenance
          </h1>
          <p className="text-gray-600">
            Stay informed with announcements and manage your maintenance
            requests
          </p>
        </div>

        {/* View Mode Toggle */}
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-2 bg-white rounded-lg border border-gray-200 p-1">
            <button
              onClick={() => setViewMode('combined')}
              className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                viewMode === 'combined'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <LayoutGrid size={16} />
              Combined View
            </button>
            <button
              onClick={() => setViewMode('separate')}
              className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                viewMode === 'separate'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <List size={16} />
              Separate View
            </button>
          </div>
        </div>

        {/* Content */}
        {viewMode === 'combined' ? (
          // Combined View - Show both sections
          <div className="space-y-8">
            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
              <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-50 rounded-lg">
                    <Bell className="text-blue-600" size={20} />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-600">
                      New Announcements
                    </p>
                    <p className="text-2xl font-bold text-gray-900">3</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-amber-50 rounded-lg">
                    <Wrench className="text-amber-600" size={20} />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-600">
                      Open Requests
                    </p>
                    <p className="text-2xl font-bold text-gray-900">2</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-emerald-50 rounded-lg">
                    <Wrench className="text-emerald-600" size={20} />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-600">
                      Resolved This Month
                    </p>
                    <p className="text-2xl font-bold text-gray-900">5</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Two Column Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Announcements Column */}
              <div>
                <AnnouncementsFeed />
              </div>

              {/* Maintenance Column */}
              <div>
                <TenantMaintenanceTracker />
              </div>
            </div>
          </div>
        ) : (
          // Separate View - Tabbed interface
          <div>
            {/* Tab Navigation */}
            <div className="border-b border-gray-200 mb-8">
              <nav className="flex space-x-8">
                {tabs.map((tab) => {
                  const Icon = tab.icon;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                        activeTab === tab.id
                          ? 'border-blue-600 text-blue-600'
                          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      }`}
                    >
                      <Icon size={18} />
                      <span>{tab.label}</span>
                    </button>
                  );
                })}
              </nav>
            </div>

            {/* Tab Content */}
            <div>
              {activeTab === 'announcements' && (
                <div>
                  <div className="mb-6">
                    <h2 className="text-xl font-semibold text-gray-900 mb-2">
                      Property Announcements
                    </h2>
                    <p className="text-gray-600">
                      {tabs.find((t) => t.id === 'announcements')?.description}
                    </p>
                  </div>
                  <AnnouncementsFeed />
                </div>
              )}

              {activeTab === 'maintenance' && (
                <div>
                  <div className="mb-6">
                    <h2 className="text-xl font-semibold text-gray-900 mb-2">
                      Maintenance Requests
                    </h2>
                    <p className="text-gray-600">
                      {tabs.find((t) => t.id === 'maintenance')?.description}
                    </p>
                  </div>
                  <TenantMaintenanceTracker />
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
