'use client';

import React, { useState } from 'react';
import { MultiStepFormWizard, WizardStep } from './MultiStepFormWizard';
import { User, Mail, Lock, CreditCard, FileText, Check } from 'lucide-react';

// Example Step Components
const PersonalInfoStep = ({ formData, onChange }: any) => {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">
        Personal Information
      </h2>
      <p className="text-neutral-600 dark:text-neutral-400">
        Let's start with your basic information.
      </p>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
            Full Name
          </label>
          <input
            type="text"
            value={formData.fullName || ''}
            onChange={(e) => onChange({ ...formData, fullName: e.target.value })}
            placeholder="John Doe"
            className="w-full px-4 py-3 rounded-lg border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
            Date of Birth
          </label>
          <input
            type="date"
            value={formData.dateOfBirth || ''}
            onChange={(e) => onChange({ ...formData, dateOfBirth: e.target.value })}
            className="w-full px-4 py-3 rounded-lg border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
            Phone Number
          </label>
          <input
            type="tel"
            value={formData.phone || ''}
            onChange={(e) => onChange({ ...formData, phone: e.target.value })}
            placeholder="+1 (555) 123-4567"
            className="w-full px-4 py-3 rounded-lg border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>
    </div>
  );
};

const AccountDetailsStep = ({ formData, onChange }: any) => {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">
        Account Details
      </h2>
      <p className="text-neutral-600 dark:text-neutral-400">
        Create your account credentials.
      </p>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
            Email Address
          </label>
          <input
            type="email"
            value={formData.email || ''}
            onChange={(e) => onChange({ ...formData, email: e.target.value })}
            placeholder="john.doe@example.com"
            className="w-full px-4 py-3 rounded-lg border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
            Username
          </label>
          <input
            type="text"
            value={formData.username || ''}
            onChange={(e) => onChange({ ...formData, username: e.target.value })}
            placeholder="johndoe123"
            className="w-full px-4 py-3 rounded-lg border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
            Password
          </label>
          <input
            type="password"
            value={formData.password || ''}
            onChange={(e) => onChange({ ...formData, password: e.target.value })}
            placeholder="••••••••"
            className="w-full px-4 py-3 rounded-lg border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
            Confirm Password
          </label>
          <input
            type="password"
            value={formData.confirmPassword || ''}
            onChange={(e) =>
              onChange({ ...formData, confirmPassword: e.target.value })
            }
            placeholder="••••••••"
            className="w-full px-4 py-3 rounded-lg border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>
    </div>
  );
};

const PaymentStep = ({ formData, onChange }: any) => {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">
        Payment Information
      </h2>
      <p className="text-neutral-600 dark:text-neutral-400">
        Secure your payment details.
      </p>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
            Card Number
          </label>
          <input
            type="text"
            value={formData.cardNumber || ''}
            onChange={(e) => onChange({ ...formData, cardNumber: e.target.value })}
            placeholder="1234 5678 9012 3456"
            maxLength={19}
            className="w-full px-4 py-3 rounded-lg border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
              Expiry Date
            </label>
            <input
              type="text"
              value={formData.expiryDate || ''}
              onChange={(e) =>
                onChange({ ...formData, expiryDate: e.target.value })
              }
              placeholder="MM/YY"
              maxLength={5}
              className="w-full px-4 py-3 rounded-lg border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
              CVV
            </label>
            <input
              type="text"
              value={formData.cvv || ''}
              onChange={(e) => onChange({ ...formData, cvv: e.target.value })}
              placeholder="123"
              maxLength={4}
              className="w-full px-4 py-3 rounded-lg border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
            Cardholder Name
          </label>
          <input
            type="text"
            value={formData.cardholderName || ''}
            onChange={(e) =>
              onChange({ ...formData, cardholderName: e.target.value })
            }
            placeholder="JOHN DOE"
            className="w-full px-4 py-3 rounded-lg border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>
    </div>
  );
};

const ReviewStep = ({ formData }: any) => {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">
        Review & Confirm
      </h2>
      <p className="text-neutral-600 dark:text-neutral-400">
        Please review your information before submitting.
      </p>

      <div className="space-y-6">
        <div className="p-4 bg-neutral-50 dark:bg-neutral-900 rounded-lg">
          <h3 className="font-semibold text-neutral-900 dark:text-neutral-100 mb-3">
            Personal Information
          </h3>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-neutral-600 dark:text-neutral-400">Name:</dt>
              <dd className="text-neutral-900 dark:text-neutral-100 font-medium">
                {formData.fullName || 'Not provided'}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-neutral-600 dark:text-neutral-400">
                Date of Birth:
              </dt>
              <dd className="text-neutral-900 dark:text-neutral-100 font-medium">
                {formData.dateOfBirth || 'Not provided'}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-neutral-600 dark:text-neutral-400">Phone:</dt>
              <dd className="text-neutral-900 dark:text-neutral-100 font-medium">
                {formData.phone || 'Not provided'}
              </dd>
            </div>
          </dl>
        </div>

        <div className="p-4 bg-neutral-50 dark:bg-neutral-900 rounded-lg">
          <h3 className="font-semibold text-neutral-900 dark:text-neutral-100 mb-3">
            Account Details
          </h3>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-neutral-600 dark:text-neutral-400">Email:</dt>
              <dd className="text-neutral-900 dark:text-neutral-100 font-medium">
                {formData.email || 'Not provided'}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-neutral-600 dark:text-neutral-400">Username:</dt>
              <dd className="text-neutral-900 dark:text-neutral-100 font-medium">
                {formData.username || 'Not provided'}
              </dd>
            </div>
          </dl>
        </div>

        <div className="p-4 bg-neutral-50 dark:bg-neutral-900 rounded-lg">
          <h3 className="font-semibold text-neutral-900 dark:text-neutral-100 mb-3">
            Payment Information
          </h3>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-neutral-600 dark:text-neutral-400">
                Card Number:
              </dt>
              <dd className="text-neutral-900 dark:text-neutral-100 font-medium">
                {formData.cardNumber
                  ? `**** **** **** ${formData.cardNumber.slice(-4)}`
                  : 'Not provided'}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-neutral-600 dark:text-neutral-400">
                Cardholder:
              </dt>
              <dd className="text-neutral-900 dark:text-neutral-100 font-medium">
                {formData.cardholderName || 'Not provided'}
              </dd>
            </div>
          </dl>
        </div>
      </div>
    </div>
  );
};

// Main Example Component
export const MultiStepFormWizardExample: React.FC = () => {
  const [formData, setFormData] = useState({
    fullName: '',
    dateOfBirth: '',
    phone: '',
    email: '',
    username: '',
    password: '',
    confirmPassword: '',
    cardNumber: '',
    expiryDate: '',
    cvv: '',
    cardholderName: '',
  });

  const steps: WizardStep[] = [
    {
      id: 'personal-info',
      title: 'Personal Info',
      description: 'Basic details',
      icon: <User className="w-5 h-5" />,
      component: (
        <PersonalInfoStep formData={formData} onChange={setFormData} />
      ),
      isValid: !!(
        formData.fullName &&
        formData.dateOfBirth &&
        formData.phone
      ),
    },
    {
      id: 'account-details',
      title: 'Account',
      description: 'Login credentials',
      icon: <Lock className="w-5 h-5" />,
      component: (
        <AccountDetailsStep formData={formData} onChange={setFormData} />
      ),
      isValid: !!(
        formData.email &&
        formData.username &&
        formData.password &&
        formData.password === formData.confirmPassword
      ),
    },
    {
      id: 'payment',
      title: 'Payment',
      description: 'Payment details',
      icon: <CreditCard className="w-5 h-5" />,
      component: <PaymentStep formData={formData} onChange={setFormData} />,
      isValid: !!(
        formData.cardNumber &&
        formData.expiryDate &&
        formData.cvv &&
        formData.cardholderName
      ),
    },
    {
      id: 'review',
      title: 'Review',
      description: 'Confirm details',
      icon: <Check className="w-5 h-5" />,
      component: <ReviewStep formData={formData} />,
      isValid: true,
    },
  ];

  const handleComplete = async (data: Record<string, any>) => {
    console.log('Form submitted:', data);
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 2000));
    alert('Form submitted successfully!');
  };

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 py-12 px-4">
      <MultiStepFormWizard
        steps={steps}
        onComplete={handleComplete}
        formData={formData}
        onFormDataChange={setFormData}
        showStepNumbers={false}
      />
    </div>
  );
};
