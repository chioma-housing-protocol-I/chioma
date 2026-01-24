'use client';

import React, { useState } from 'react';
import {
    User,
    Shield,
    Bell,
    Globe,
    Moon,
    Sun,
    Camera,
    Save,
    Eye,
    EyeOff
} from 'lucide-react';

export default function SettingsPage() {
    const [darkMode, setDarkMode] = useState(false);
    const [emailNotifications, setEmailNotifications] = useState(true);
    const [pushNotifications, setPushNotifications] = useState(true);
    const [showPassword, setShowPassword] = useState(false);

    const [profile, setProfile] = useState({
        fullName: 'Alex Johnson',
        email: 'alex.johnson@email.com',
        phone: '+1 (555) 123-4567',
        company: 'Johnson Properties LLC',
    });

    const handleProfileChange = (field: string, value: string) => {
        setProfile((prev) => ({ ...prev, [field]: value }));
    };

    return (
        <div className="space-y-6 max-w-4xl">
            {/* Header */}
            <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-neutral-900 dark:text-white">
                    Settings
                </h1>
                <p className="text-neutral-500 dark:text-neutral-400 mt-1">
                    Manage your account preferences and settings
                </p>
            </div>

            {/* Profile Section */}
            <section className="bg-white dark:bg-neutral-800 rounded-2xl border border-neutral-200 dark:border-neutral-700 p-6">
                <h2 className="text-lg font-semibold text-neutral-900 dark:text-white mb-6 flex items-center gap-2">
                    <User size={20} />
                    Profile Information
                </h2>

                <div className="flex flex-col sm:flex-row gap-6 mb-6">
                    {/* Avatar */}
                    <div className="flex flex-col items-center gap-3">
                        <div className="relative">
                            <div className="w-24 h-24 rounded-full bg-brand-blue flex items-center justify-center text-white text-3xl font-bold">
                                AJ
                            </div>
                            <button className="absolute bottom-0 right-0 w-8 h-8 bg-white dark:bg-neutral-700 border border-neutral-200 dark:border-neutral-600 rounded-full flex items-center justify-center hover:bg-neutral-50 dark:hover:bg-neutral-600 transition-colors">
                                <Camera size={16} className="text-neutral-600 dark:text-neutral-400" />
                            </button>
                        </div>
                        <button className="text-sm text-brand-blue font-medium hover:underline">
                            Change Photo
                        </button>
                    </div>

                    {/* Form */}
                    <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                                Full Name
                            </label>
                            <input
                                type="text"
                                value={profile.fullName}
                                onChange={(e) => handleProfileChange('fullName', e.target.value)}
                                className="w-full px-4 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-blue"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                                Email
                            </label>
                            <input
                                type="email"
                                value={profile.email}
                                onChange={(e) => handleProfileChange('email', e.target.value)}
                                className="w-full px-4 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-blue"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                                Phone
                            </label>
                            <input
                                type="tel"
                                value={profile.phone}
                                onChange={(e) => handleProfileChange('phone', e.target.value)}
                                className="w-full px-4 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-blue"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                                Company
                            </label>
                            <input
                                type="text"
                                value={profile.company}
                                onChange={(e) => handleProfileChange('company', e.target.value)}
                                className="w-full px-4 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-blue"
                            />
                        </div>
                    </div>
                </div>

                <button className="flex items-center gap-2 bg-brand-blue hover:bg-brand-blue-dark text-white px-5 py-2.5 rounded-xl font-semibold transition-colors">
                    <Save size={18} />
                    Save Changes
                </button>
            </section>

            {/* Security Section */}
            <section className="bg-white dark:bg-neutral-800 rounded-2xl border border-neutral-200 dark:border-neutral-700 p-6">
                <h2 className="text-lg font-semibold text-neutral-900 dark:text-white mb-6 flex items-center gap-2">
                    <Shield size={20} />
                    Security
                </h2>

                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                            Current Password
                        </label>
                        <div className="relative max-w-md">
                            <input
                                type={showPassword ? 'text' : 'password'}
                                placeholder="Enter current password"
                                className="w-full px-4 py-2.5 pr-12 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-blue"
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-4 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600"
                            >
                                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                        </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-md">
                        <div>
                            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                                New Password
                            </label>
                            <input
                                type="password"
                                placeholder="New password"
                                className="w-full px-4 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-blue"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                                Confirm Password
                            </label>
                            <input
                                type="password"
                                placeholder="Confirm password"
                                className="w-full px-4 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-blue"
                            />
                        </div>
                    </div>
                    <button className="text-brand-blue font-medium text-sm hover:underline">
                        Update Password
                    </button>
                </div>
            </section>

            {/* Notifications Section */}
            <section className="bg-white dark:bg-neutral-800 rounded-2xl border border-neutral-200 dark:border-neutral-700 p-6">
                <h2 className="text-lg font-semibold text-neutral-900 dark:text-white mb-6 flex items-center gap-2">
                    <Bell size={20} />
                    Notifications
                </h2>

                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="font-medium text-neutral-900 dark:text-white">Email Notifications</p>
                            <p className="text-sm text-neutral-500 dark:text-neutral-400">Receive updates via email</p>
                        </div>
                        <button
                            onClick={() => setEmailNotifications(!emailNotifications)}
                            className={`w-12 h-6 rounded-full transition-colors ${emailNotifications ? 'bg-brand-blue' : 'bg-neutral-300 dark:bg-neutral-600'}`}
                        >
                            <div className={`w-5 h-5 bg-white rounded-full shadow transition-transform ${emailNotifications ? 'translate-x-6' : 'translate-x-0.5'}`} />
                        </button>
                    </div>
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="font-medium text-neutral-900 dark:text-white">Push Notifications</p>
                            <p className="text-sm text-neutral-500 dark:text-neutral-400">Receive push notifications</p>
                        </div>
                        <button
                            onClick={() => setPushNotifications(!pushNotifications)}
                            className={`w-12 h-6 rounded-full transition-colors ${pushNotifications ? 'bg-brand-blue' : 'bg-neutral-300 dark:bg-neutral-600'}`}
                        >
                            <div className={`w-5 h-5 bg-white rounded-full shadow transition-transform ${pushNotifications ? 'translate-x-6' : 'translate-x-0.5'}`} />
                        </button>
                    </div>
                </div>
            </section>

            {/* Appearance Section */}
            <section className="bg-white dark:bg-neutral-800 rounded-2xl border border-neutral-200 dark:border-neutral-700 p-6">
                <h2 className="text-lg font-semibold text-neutral-900 dark:text-white mb-6 flex items-center gap-2">
                    <Globe size={20} />
                    Appearance
                </h2>

                <div className="flex items-center justify-between">
                    <div>
                        <p className="font-medium text-neutral-900 dark:text-white">Dark Mode</p>
                        <p className="text-sm text-neutral-500 dark:text-neutral-400">Toggle dark theme</p>
                    </div>
                    <button
                        onClick={() => setDarkMode(!darkMode)}
                        className={`w-12 h-6 rounded-full transition-colors flex items-center ${darkMode ? 'bg-brand-blue' : 'bg-neutral-300 dark:bg-neutral-600'}`}
                    >
                        <div className={`w-5 h-5 bg-white rounded-full shadow transition-transform flex items-center justify-center ${darkMode ? 'translate-x-6' : 'translate-x-0.5'}`}>
                            {darkMode ? <Moon size={12} className="text-brand-blue" /> : <Sun size={12} className="text-amber-500" />}
                        </div>
                    </button>
                </div>
            </section>

            {/* Danger Zone */}
            <section className="bg-red-50 dark:bg-red-900/10 rounded-2xl border border-red-200 dark:border-red-900/30 p-6">
                <h2 className="text-lg font-semibold text-red-700 dark:text-red-400 mb-2">Danger Zone</h2>
                <p className="text-sm text-red-600 dark:text-red-400/80 mb-4">
                    Once you delete your account, there is no going back. Please be certain.
                </p>
                <button className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-xl transition-colors">
                    Delete Account
                </button>
            </section>
        </div>
    );
}
