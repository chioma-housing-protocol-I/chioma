'use client';

import React, { useState } from 'react';
import {
    Bell,
    Check,
    CheckCheck,
    DollarSign,
    FileText,
    AlertCircle,
    UserPlus,
    Wrench,
    Trash2,
    Settings
} from 'lucide-react';

// Mock notifications data
const mockNotifications = [
    {
        id: '1',
        type: 'payment',
        title: 'Rent Payment Received',
        message: 'John Smith has paid $1,200 for Unit 4B at Sunset Apartments.',
        time: '2 hours ago',
        read: false,
        icon: DollarSign,
        iconBg: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400',
    },
    {
        id: '2',
        type: 'document',
        title: 'Lease Agreement Pending',
        message: 'Oak View Residence lease is awaiting your signature.',
        time: '5 hours ago',
        read: false,
        icon: FileText,
        iconBg: 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400',
    },
    {
        id: '3',
        type: 'alert',
        title: 'Lease Expiring Soon',
        message: 'Michael Chen\'s lease at Pine Road Duplex expires in 30 days.',
        time: '1 day ago',
        read: false,
        icon: AlertCircle,
        iconBg: 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400',
    },
    {
        id: '4',
        type: 'tenant',
        title: 'New Application Received',
        message: 'New tenant application for Maple Heights property.',
        time: '2 days ago',
        read: true,
        icon: UserPlus,
        iconBg: 'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400',
    },
    {
        id: '5',
        type: 'maintenance',
        title: 'Maintenance Request',
        message: 'HVAC repair needed at Elm Street House.',
        time: '3 days ago',
        read: true,
        icon: Wrench,
        iconBg: 'bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400',
    },
    {
        id: '6',
        type: 'payment',
        title: 'Rent Payment Received',
        message: 'Emily Davis has paid $2,200 for Cedar Lane Condo.',
        time: '4 days ago',
        read: true,
        icon: DollarSign,
        iconBg: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400',
    },
];

export default function NotificationsPage() {
    const [notifications, setNotifications] = useState(mockNotifications);
    const [filter, setFilter] = useState<'all' | 'unread'>('all');

    const unreadCount = notifications.filter((n) => !n.read).length;
    const filteredNotifications = filter === 'unread'
        ? notifications.filter((n) => !n.read)
        : notifications;

    const markAsRead = (id: string) => {
        setNotifications((prev) =>
            prev.map((n) => (n.id === id ? { ...n, read: true } : n))
        );
    };

    const markAllAsRead = () => {
        setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    };

    const deleteNotification = (id: string) => {
        setNotifications((prev) => prev.filter((n) => n.id !== id));
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-bold text-neutral-900 dark:text-white">
                        Notifications
                    </h1>
                    <p className="text-neutral-500 dark:text-neutral-400 mt-1">
                        {unreadCount > 0 ? `You have ${unreadCount} unread notifications` : 'All caught up!'}
                    </p>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={markAllAsRead}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-neutral-200 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-700 font-medium transition-colors"
                    >
                        <CheckCheck size={18} />
                        Mark all read
                    </button>
                    <button className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-neutral-200 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-700 font-medium transition-colors">
                        <Settings size={18} />
                        Settings
                    </button>
                </div>
            </div>

            {/* Filter Tabs */}
            <div className="flex gap-2">
                <button
                    onClick={() => setFilter('all')}
                    className={`px-4 py-2 rounded-lg font-medium transition-colors ${filter === 'all'
                            ? 'bg-brand-blue text-white'
                            : 'bg-neutral-100 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-600'
                        }`}
                >
                    All
                </button>
                <button
                    onClick={() => setFilter('unread')}
                    className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${filter === 'unread'
                            ? 'bg-brand-blue text-white'
                            : 'bg-neutral-100 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-600'
                        }`}
                >
                    Unread
                    {unreadCount > 0 && (
                        <span className={`px-2 py-0.5 rounded-full text-xs ${filter === 'unread' ? 'bg-white/20' : 'bg-brand-blue text-white'
                            }`}>
                            {unreadCount}
                        </span>
                    )}
                </button>
            </div>

            {/* Notifications List */}
            <div className="bg-white dark:bg-neutral-800 rounded-2xl border border-neutral-200 dark:border-neutral-700 overflow-hidden">
                {filteredNotifications.length === 0 ? (
                    <div className="py-12 text-center">
                        <Bell size={48} className="mx-auto text-neutral-300 dark:text-neutral-600 mb-4" />
                        <p className="text-neutral-500 dark:text-neutral-400">No notifications to show.</p>
                    </div>
                ) : (
                    <div className="divide-y divide-neutral-100 dark:divide-neutral-700">
                        {filteredNotifications.map((notification) => {
                            const Icon = notification.icon;
                            return (
                                <div
                                    key={notification.id}
                                    className={`px-6 py-4 flex items-start gap-4 hover:bg-neutral-50 dark:hover:bg-neutral-700/30 transition-colors ${!notification.read ? 'bg-blue-50/50 dark:bg-blue-900/10' : ''
                                        }`}
                                >
                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${notification.iconBg}`}>
                                        <Icon size={20} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-start justify-between gap-2">
                                            <div>
                                                <p className={`font-medium ${!notification.read ? 'text-neutral-900 dark:text-white' : 'text-neutral-700 dark:text-neutral-300'}`}>
                                                    {notification.title}
                                                </p>
                                                <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-0.5">
                                                    {notification.message}
                                                </p>
                                                <p className="text-xs text-neutral-400 dark:text-neutral-500 mt-2">
                                                    {notification.time}
                                                </p>
                                            </div>
                                            {!notification.read && (
                                                <span className="w-2 h-2 rounded-full bg-brand-blue flex-shrink-0 mt-2" />
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        {!notification.read && (
                                            <button
                                                onClick={() => markAsRead(notification.id)}
                                                className="p-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors"
                                                aria-label="Mark as read"
                                            >
                                                <Check size={16} className="text-neutral-500" />
                                            </button>
                                        )}
                                        <button
                                            onClick={() => deleteNotification(notification.id)}
                                            className="p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                                            aria-label="Delete notification"
                                        >
                                            <Trash2 size={16} className="text-red-500" />
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
