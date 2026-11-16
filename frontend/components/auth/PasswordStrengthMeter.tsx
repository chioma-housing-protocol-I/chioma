'use client';

import * as React from 'react';
import { Check, X } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface PasswordStrength {
  score: number; // 0-5
  label: 'Very Weak' | 'Weak' | 'Fair' | 'Good' | 'Strong' | 'Very Strong';
  color: string;
  suggestions: string[];
}

export interface PasswordRequirement {
  met: boolean;
  label: string;
}

export interface PasswordStrengthResult {
  strength: PasswordStrength;
  requirements: PasswordRequirement[];
  isValid: boolean;
}

/**
 * Calculate password strength based on various criteria
 */
export function calculatePasswordStrength(password: string): PasswordStrengthResult {
  let score = 0;
  const suggestions: string[] = [];

  // Length check
  const hasMinLength = password.length >= 8;
  const hasGoodLength = password.length >= 12;
  const hasGreatLength = password.length >= 16;

  if (hasMinLength) score++;
  if (hasGoodLength) score++;
  if (hasGreatLength) score++;
  if (password.length < 8) {
    suggestions.push('Use at least 8 characters');
  }

  // Character variety
  const hasLowercase = /[a-z]/.test(password);
  const hasUppercase = /[A-Z]/.test(password);
  const hasNumber = /\d/.test(password);
  const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(password);

  if (hasLowercase && hasUppercase && hasNumber) score++;
  if (hasSpecial) score++;

  if (!hasUppercase) suggestions.push('Add uppercase letters');
  if (!hasLowercase) suggestions.push('Add lowercase letters');
  if (!hasNumber) suggestions.push('Add numbers');
  if (!hasSpecial) suggestions.push('Add special characters (!@#$%^&*)');

  // Weakness checks
  const hasRepeatedChars = /(.)\1{2,}/.test(password);
  const hasSequential = /(?:abc|bcd|cde|def|efg|fgh|ghi|hij|ijk|jkl|klm|lmn|mno|nop|opq|pqr|qrs|rst|stu|tuv|uvw|vwx|wxy|xyz|012|123|234|345|456|567|678|789)/i.test(
    password,
  );
  const hasKeyboardPattern = /(?:qwerty|asdfgh|zxcvbn|qwertz)/i.test(password);

  if (hasRepeatedChars) {
    score = Math.max(0, score - 1);
    suggestions.push('Avoid repeated characters');
  }
  if (hasSequential) {
    score = Math.max(0, score - 1);
    suggestions.push('Avoid sequential patterns');
  }
  if (hasKeyboardPattern) {
    score = Math.max(0, score - 1);
    suggestions.push('Avoid keyboard patterns');
  }

  // Common password check (basic)
  const commonPasswords = [
    'password',
    'password123',
    '12345678',
    'qwerty',
    'abc123',
    'letmein',
    'welcome',
    'monkey',
    'dragon',
  ];
  if (commonPasswords.some((common) => password.toLowerCase().includes(common))) {
    score = 0;
    suggestions.unshift('This password is too common');
  }

  // Determine strength label and color
  let label: PasswordStrength['label'];
  let color: string;

  if (score === 0) {
    label = 'Very Weak';
    color = 'text-red-600 dark:text-red-400';
  } else if (score === 1) {
    label = 'Weak';
    color = 'text-orange-600 dark:text-orange-400';
  } else if (score === 2) {
    label = 'Fair';
    color = 'text-yellow-600 dark:text-yellow-400';
  } else if (score === 3) {
    label = 'Good';
    color = 'text-blue-600 dark:text-blue-400';
  } else if (score === 4) {
    label = 'Strong';
    color = 'text-green-600 dark:text-green-400';
  } else {
    label = 'Very Strong';
    color = 'text-green-700 dark:text-green-300';
  }

  // Requirements check
  const requirements: PasswordRequirement[] = [
    { met: hasMinLength, label: 'At least 8 characters' },
    { met: hasUppercase, label: 'One uppercase letter' },
    { met: hasLowercase, label: 'One lowercase letter' },
    { met: hasNumber || hasSpecial, label: 'One number or special character' },
  ];

  const isValid = requirements.every((req) => req.met);

  return {
    strength: { score, label, color, suggestions },
    requirements,
    isValid,
  };
}

// ============================================================================
// PasswordStrengthMeter Component
// ============================================================================

export interface PasswordStrengthMeterProps {
  password: string;
  showRequirements?: boolean;
  showSuggestions?: boolean;
  className?: string;
}

export function PasswordStrengthMeter({
  password,
  showRequirements = true,
  showSuggestions = false,
  className,
}: PasswordStrengthMeterProps) {
  const result = React.useMemo(
    () => calculatePasswordStrength(password),
    [password],
  );

  // Don't show anything for empty password
  if (!password) {
    return null;
  }

  const { strength, requirements } = result;
  const filledBars = Math.max(1, strength.score);

  return (
    <div className={cn('space-y-3', className)}>
      {/* Strength bars */}
      <div>
        <div className="mb-1.5 flex items-center justify-between">
          <span className="text-xs font-medium text-muted-foreground">
            Password strength
          </span>
          <span className={cn('text-xs font-semibold', strength.color)}>
            {strength.label}
          </span>
        </div>
        <div className="flex gap-1.5">
          {[1, 2, 3, 4, 5].map((bar) => (
            <div
              key={bar}
              className={cn(
                'h-1.5 flex-1 rounded-full transition-all duration-300',
                bar <= filledBars
                  ? getBarColor(strength.score)
                  : 'bg-muted/30',
              )}
            />
          ))}
        </div>
      </div>

      {/* Requirements checklist */}
      {showRequirements && (
        <ul className="space-y-1.5">
          {requirements.map((req, index) => (
            <li
              key={index}
              className="flex items-start gap-2 text-xs"
            >
              <div
                className={cn(
                  'mt-0.5 flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full transition-colors',
                  req.met
                    ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                    : 'bg-muted text-muted-foreground',
                )}
              >
                {req.met ? (
                  <Check className="h-3 w-3" strokeWidth={3} />
                ) : (
                  <X className="h-3 w-3" strokeWidth={2} />
                )}
              </div>
              <span
                className={cn(
                  'leading-tight',
                  req.met
                    ? 'text-foreground'
                    : 'text-muted-foreground',
                )}
              >
                {req.label}
              </span>
            </li>
          ))}
        </ul>
      )}

      {/* Suggestions */}
      {showSuggestions && strength.suggestions.length > 0 && (
        <div className="rounded-md bg-blue-50 p-3 dark:bg-blue-950/30">
          <p className="mb-1.5 text-xs font-semibold text-blue-900 dark:text-blue-300">
            Suggestions:
          </p>
          <ul className="space-y-1">
            {strength.suggestions.slice(0, 3).map((suggestion, index) => (
              <li
                key={index}
                className="text-xs text-blue-700 dark:text-blue-400"
              >
                • {suggestion}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function getBarColor(score: number): string {
  if (score === 0) return 'bg-red-500';
  if (score === 1) return 'bg-orange-500';
  if (score === 2) return 'bg-yellow-500';
  if (score === 3) return 'bg-blue-500';
  if (score === 4) return 'bg-green-500';
  return 'bg-green-600';
}

// ============================================================================
// Compact Password Strength Indicator
// ============================================================================

export interface PasswordStrengthIndicatorProps {
  password: string;
  className?: string;
}

/**
 * Compact password strength indicator (just the bars and label)
 */
export function PasswordStrengthIndicator({
  password,
  className,
}: PasswordStrengthIndicatorProps) {
  const { strength } = React.useMemo(
    () => calculatePasswordStrength(password),
    [password],
  );

  if (!password) {
    return null;
  }

  const filledBars = Math.max(1, strength.score);

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <div className="flex gap-1 flex-1">
        {[1, 2, 3, 4, 5].map((bar) => (
          <div
            key={bar}
            className={cn(
              'h-1 flex-1 rounded-full transition-all duration-300',
              bar <= filledBars ? getBarColor(strength.score) : 'bg-muted/30',
            )}
          />
        ))}
      </div>
      <span className={cn('text-xs font-medium whitespace-nowrap', strength.color)}>
        {strength.label}
      </span>
    </div>
  );
}

export default PasswordStrengthMeter;
