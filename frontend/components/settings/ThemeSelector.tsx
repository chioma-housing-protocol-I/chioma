import { ThemePreference } from './types';

interface ThemeSelectorProps {
  value: ThemePreference;
  disabled?: boolean;
  onChange: (theme: ThemePreference) => void;
}

const THEMES: Array<{ value: ThemePreference; label: string }> = [
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
  { value: 'system', label: 'System' },
];

export function ThemeSelector({
  value,
  disabled = false,
  onChange,
}: ThemeSelectorProps) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      {THEMES.map((theme) => {
        const isActive = value === theme.value;
        return (
          <button
            key={theme.value}
            type="button"
            disabled={disabled}
            onClick={() => onChange(theme.value)}
            className={`rounded-xl border px-4 py-3 text-sm font-medium transition-colors ${
              isActive
                ? 'border-blue-500 bg-blue-500 text-white'
                : 'border-white/10 bg-white/5 text-blue-200/70 hover:bg-white/10 hover:text-white'
            } ${disabled ? 'cursor-not-allowed opacity-60' : ''}`}
          >
            {theme.label}
          </button>
        );
      })}
    </div>
  );
}
