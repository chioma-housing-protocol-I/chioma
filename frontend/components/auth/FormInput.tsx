'use client';

import React, { ReactNode } from 'react';
import { UseFormRegisterReturn } from 'react-hook-form';

interface FormInputProps {
  id: string;
  type?: string;
  placeholder?: string;
  icon?: ReactNode;
  error?: string;
  disabled?: boolean;
  registration: UseFormRegisterReturn;
}

export default function FormInput({
  id,
  type = 'text',
  placeholder,
  icon,
  error,
  disabled,
  registration,
}: FormInputProps) {
  return (
    <div className="space-y-1">
      <div className="relative">
        {icon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-white/50 pointer-events-none">
            {icon}
          </div>
        )}
        <input
          id={id}
          type={type}
          placeholder={placeholder}
          disabled={disabled}
          className={`w-full ${icon ? 'pl-10' : 'pl-4'} pr-4 py-3 rounded-xl bg-white/10 text-white placeholder:text-white/50 border focus:ring-2 outline-none transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed ${
            error
              ? 'border-red-400/60 focus:ring-red-400/30'
              : 'border-white/20 focus:ring-white/30 focus:border-white/40'
          }`}
          {...registration}
        />
      </div>
      {error && <p className="text-sm text-red-300 pl-1">{error}</p>}
    </div>
  );
}
