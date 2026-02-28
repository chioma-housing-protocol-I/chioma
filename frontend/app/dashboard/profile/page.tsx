'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import {
  User,
  Mail,
  Phone,
  Wallet,
  Copy,
  CheckCircle2,
  ShieldCheck,
  AlertCircle,
  ExternalLink,
  Camera,
  Lock,
  ChevronRight,
} from 'lucide-react';
import { useAuth } from '@/store/authStore';
import { getFreighterPublicKey } from '@/lib/stellar-auth';
import { Uploader } from '@/components/ui/Uploader';
import { toast } from 'react-hot-toast';

// --- Types ---
interface UserProfile {
  fullName: string;
  email: string;
  phone: string;
  profilePicture: string | null;
  isEmailVerified: boolean;
  walletAddress: string | null;
}

interface KycStatus {
  level: 'Unverified' | 'Basic' | 'Full';
  status: 'pending' | 'verified' | 'rejected' | 'none';
  progress: number;
}

export default function ProfilePage() {
  const { user, accessToken } = useAuth();

  // State for profile data
  const [profile, setProfile] = useState<UserProfile>({
    fullName: `${user?.firstName || ''} ${user?.lastName || ''}`.trim(),
    email: user?.email || '',
    phone: '',
    profilePicture: null,
    isEmailVerified: true,
    walletAddress: null,
  });

  // State for KYC status
  const [kyc, setKyc] = useState<KycStatus>({
    level: 'Unverified',
    status: 'none',
    progress: 0,
  });

  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isConnectingWallet, setIsConnectingWallet] = useState(false);

  // Fetch initial data
  useEffect(() => {
    const fetchData = async () => {
      if (!accessToken) return;

      try {
        setIsLoading(true);

        // Fetch Profile
        const profileRes = await fetch('/api/profile', {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        if (profileRes.ok) {
          const data = await profileRes.json();
          setProfile((prev) => ({ ...prev, ...data }));
        }

        // Fetch KYC
        const kycRes = await fetch('/api/stellar/kyc', {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        if (kycRes.ok) {
          const data = await kycRes.json();
          setKyc(data);
        } else {
          // Mock data for demonstration if API fails
          setKyc({
            level: 'Basic',
            status: 'verified',
            progress: 33,
          });
        }
      } catch (error) {
        console.error('Error fetching profile data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [accessToken, user]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUpdating(true);

    try {
      const res = await fetch('/api/profile', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          fullName: profile.fullName,
          phone: profile.phone,
        }),
      });

      if (res.ok) {
        toast.success('Profile updated successfully');
        setIsEditing(false);
      } else {
        throw new Error('Failed to update profile');
      }
    } catch {
      toast.error('Update failed. Please try again.');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleConnectWallet = async () => {
    setIsConnectingWallet(true);
    try {
      const publicKey = await getFreighterPublicKey();
      setProfile((prev) => ({ ...prev, walletAddress: publicKey }));
      toast.success('Wallet connected: ' + maskAddress(publicKey));
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : 'Failed to connect wallet';
      toast.error(message);
    } finally {
      setIsConnectingWallet(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  };

  const maskAddress = (address: string) => {
    if (!address) return '';
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const getKycBadge = () => {
    switch (kyc.level) {
      case 'Full':
        return (
          <span className="px-3 py-1 rounded-full bg-green-100 text-green-700 text-xs font-bold border border-green-200">
            Full Verified
          </span>
        );
      case 'Basic':
        return (
          <span className="px-3 py-1 rounded-full bg-blue-100 text-blue-700 text-xs font-bold border border-blue-200">
            Basic Verification
          </span>
        );
      default:
        return (
          <span className="px-3 py-1 rounded-full bg-neutral-100 text-neutral-600 text-xs font-bold border border-neutral-200">
            Unverified
          </span>
        );
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-blue"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-12">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-neutral-900 tracking-tight">
            User Profile
          </h1>
          <p className="text-neutral-500 mt-1">
            Manage your account details and verification status.
          </p>
        </div>
        <div className="flex items-center space-x-3">
          {getKycBadge()}
          {kyc.level !== 'Full' && (
            <button className="text-sm font-semibold text-brand-blue hover:underline flex items-center">
              Learn about KYC <ExternalLink size={14} className="ml-1" />
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column - Profile Summary */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white rounded-3xl p-8 border border-neutral-200 shadow-sm flex flex-col items-center text-center">
            <div className="relative group">
              <div className="w-32 h-32 rounded-full overflow-hidden bg-neutral-100 border-4 border-white shadow-md relative">
                {profile.profilePicture ? (
                  <Image
                    src={profile.profilePicture}
                    alt="Profile"
                    fill
                    className="object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-neutral-300">
                    <User size={64} />
                  </div>
                )}
              </div>
              <button className="absolute bottom-0 right-0 p-2 bg-brand-blue text-white rounded-full shadow-lg hover:scale-110 transition-transform">
                <Camera size={18} />
              </button>
            </div>

            <h2 className="mt-4 text-xl font-bold text-neutral-900">
              {profile.fullName || 'User Name'}
            </h2>
            <p className="text-neutral-500 text-sm">{profile.email}</p>

            <div className="w-full mt-6 pt-6 border-t border-neutral-100 space-y-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-neutral-500">Member since</span>
                <span className="font-medium text-neutral-900">Jan 2024</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-neutral-500">Account Type</span>
                <span className="font-medium capitalize text-neutral-900">
                  {user?.role || 'Tenant'}
                </span>
              </div>
            </div>
          </div>

          {/* Wallet Status Card */}
          <div className="bg-neutral-900 rounded-3xl p-6 text-white shadow-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-10">
              <Wallet size={80} />
            </div>

            <div className="relative z-10 space-y-4">
              <div className="flex items-center space-x-2">
                <Wallet size={20} className="text-brand-blue" />
                <h3 className="font-bold">Stellar Wallet</h3>
              </div>

              {profile.walletAddress ? (
                <div className="space-y-4">
                  <div className="bg-white/10 rounded-xl p-3 border border-white/10 flex items-center justify-between">
                    <span className="font-mono text-xs opacity-80">
                      {maskAddress(profile.walletAddress)}
                    </span>
                    <button
                      onClick={() => copyToClipboard(profile.walletAddress!)}
                      className="p-1.5 hover:bg-white/10 rounded-lg transition-colors"
                    >
                      <Copy size={14} />
                    </button>
                  </div>
                  <button className="w-full py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-sm font-semibold transition-colors flex items-center justify-center">
                    Disconnect Wallet
                  </button>
                </div>
              ) : (
                <div className="space-y-4 text-center py-2">
                  <p className="text-xs text-neutral-400">
                    Connect your wallet to enable blockchain payments and asset
                    management.
                  </p>
                  <button
                    onClick={handleConnectWallet}
                    disabled={isConnectingWallet}
                    className="w-full py-2.5 rounded-xl bg-brand-blue hover:bg-brand-blue-dark text-white text-sm font-bold transition-all shadow-lg active:scale-95 disabled:opacity-60"
                  >
                    {isConnectingWallet ? 'Connecting...' : 'Connect Wallet'}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column - Profile Details & KYC */}
        <div className="lg:col-span-2 space-y-6">
          {/* Profile Form */}
          <section className="bg-white rounded-3xl p-8 border border-neutral-200 shadow-sm overflow-hidden">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-neutral-900">
                Personal Information
              </h3>
              <button
                onClick={() => setIsEditing(!isEditing)}
                className="text-sm font-semibold text-brand-blue hover:text-brand-blue-dark transition-colors"
              >
                {isEditing ? 'Cancel' : 'Edit Profile'}
              </button>
            </div>

            <form onSubmit={handleUpdateProfile} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-neutral-700">
                    Full Name
                  </label>
                  <div className="relative">
                    <User
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400"
                      size={18}
                    />
                    <input
                      type="text"
                      disabled={!isEditing}
                      value={profile.fullName}
                      onChange={(e) =>
                        setProfile((prev) => ({
                          ...prev,
                          fullName: e.target.value,
                        }))
                      }
                      className="w-full pl-10 pr-4 py-3 rounded-xl border border-neutral-200 bg-neutral-50 focus:bg-white focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue outline-none transition-all disabled:opacity-70"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold text-neutral-700">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400"
                      size={18}
                    />
                    <input
                      type="email"
                      readOnly
                      value={profile.email}
                      className="w-full pl-10 pr-12 py-3 rounded-xl border border-neutral-200 bg-neutral-100 text-neutral-500 outline-none transition-all cursor-not-allowed"
                    />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 group">
                      <Lock size={16} className="text-neutral-400" />
                      <div className="absolute bottom-full right-0 mb-2 w-48 p-2 bg-neutral-800 text-white text-[10px] rounded disappear group-hover:block hidden">
                        Email cannot be changed once verified.
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold text-neutral-700">
                    Phone Number
                  </label>
                  <div className="relative">
                    <Phone
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400"
                      size={18}
                    />
                    <input
                      type="tel"
                      disabled={!isEditing}
                      placeholder="+234 000 000 0000"
                      value={profile.phone}
                      onChange={(e) =>
                        setProfile((prev) => ({
                          ...prev,
                          phone: e.target.value,
                        }))
                      }
                      className="w-full pl-10 pr-4 py-3 rounded-xl border border-neutral-200 bg-neutral-50 focus:bg-white focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue outline-none transition-all disabled:opacity-70"
                    />
                  </div>
                </div>
              </div>

              {isEditing && (
                <div className="flex justify-end pt-4">
                  <button
                    type="submit"
                    disabled={isUpdating}
                    className="px-6 py-2.5 bg-brand-blue text-white font-bold rounded-xl shadow-lg shadow-brand-blue/20 hover:bg-brand-blue-dark transition-all active:scale-95 disabled:opacity-60"
                  >
                    {isUpdating ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              )}
            </form>
          </section>

          {/* KYC Verification Section */}
          <section className="bg-white rounded-3xl p-8 border border-neutral-200 shadow-sm relative overflow-hidden">
            <div className="flex items-center space-x-2 mb-2">
              <ShieldCheck className="text-brand-blue" size={24} />
              <h3 className="text-xl font-bold text-neutral-900">
                Identity Verification
              </h3>
            </div>
            <p className="text-neutral-500 text-sm mb-6">
              Complete KYC to unlock full platform features and higher
              transaction limits.
            </p>

            {/* KYC Progress UI */}
            <div className="mb-8 space-y-4">
              <div className="flex items-center justify-between text-sm mb-1">
                <span className="font-semibold text-neutral-700">
                  Verification Progress
                </span>
                <span className="text-brand-blue font-bold">
                  {kyc.progress}%
                </span>
              </div>
              <div className="h-2 w-full bg-neutral-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-blue-400 to-brand-blue transition-all duration-1000 ease-out"
                  style={{ width: `${kyc.progress}%` }}
                />
              </div>

              <div className="grid grid-cols-3 gap-2 pt-2">
                <div className="flex flex-col items-center space-y-1">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center ${kyc.progress >= 33 ? 'bg-brand-blue text-white' : 'bg-neutral-100 text-neutral-400'}`}
                  >
                    <CheckCircle2 size={16} />
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">
                    Unverified
                  </span>
                </div>
                <div className="flex flex-col items-center space-y-1">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center ${kyc.progress >= 66 ? 'bg-brand-blue text-white' : 'bg-neutral-100 text-neutral-400'}`}
                  >
                    {kyc.progress >= 66 ? (
                      <CheckCircle2 size={16} />
                    ) : (
                      <span className="text-xs font-bold">2</span>
                    )}
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">
                    Basic
                  </span>
                </div>
                <div className="flex flex-col items-center space-y-1">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center ${kyc.progress >= 100 ? 'bg-brand-blue text-white' : 'bg-neutral-100 text-neutral-400'}`}
                  >
                    {kyc.progress >= 100 ? (
                      <CheckCircle2 size={16} />
                    ) : (
                      <span className="text-xs font-bold">3</span>
                    )}
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">
                    Full
                  </span>
                </div>
              </div>
            </div>

            {kyc.level !== 'Full' ? (
              <div className="bg-blue-50/50 rounded-2xl p-6 border border-blue-100 space-y-6">
                <div className="flex items-start space-x-3">
                  <AlertCircle
                    className="text-brand-blue shrink-0 mt-0.5"
                    size={20}
                  />
                  <div>
                    <h4 className="font-bold text-neutral-900 text-sm">
                      Action Required
                    </h4>
                    <p className="text-xs text-neutral-600 mt-1 leading-relaxed">
                      To reach the{' '}
                      <strong>
                        {kyc.level === 'Unverified' ? 'Basic' : 'Full'}
                      </strong>{' '}
                      level, please upload a valid Government-issued ID and a
                      proof of address.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Uploader
                    label="Government ID"
                    description="Upload Passport or Driver License"
                    onFilesSelected={(files) => console.log('ID Files:', files)}
                  />
                  <Uploader
                    label="Proof of Address"
                    description="Utility Bill or Bank Statement"
                    onFilesSelected={(files) =>
                      console.log('Address Files:', files)
                    }
                  />
                </div>

                <button className="w-full py-3.5 bg-brand-blue hover:bg-brand-blue-dark text-white font-bold rounded-2xl shadow-xl shadow-brand-blue/20 transition-all flex items-center justify-center space-x-2 active:scale-[0.98]">
                  <span>Submit for Verification</span>
                  <ChevronRight size={18} />
                </button>
              </div>
            ) : (
              <div className="bg-green-50 rounded-2xl p-6 border border-green-100 flex items-center space-x-4">
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center text-green-600">
                  <ShieldCheck size={28} />
                </div>
                <div>
                  <h4 className="font-bold text-neutral-900">
                    Account Fully Verified
                  </h4>
                  <p className="text-xs text-green-700 mt-0.5">
                    You have full access to all Chioma services and high
                    transaction limits.
                  </p>
                </div>
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
