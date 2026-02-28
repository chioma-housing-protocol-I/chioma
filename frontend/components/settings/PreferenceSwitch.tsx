interface PreferenceSwitchProps {
  id: string;
  label: string;
  description?: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (checked: boolean) => void;
}

export function PreferenceSwitch({
  id,
  label,
  description,
  checked,
  disabled = false,
  onChange,
}: PreferenceSwitchProps) {
  return (
    <div className="flex items-start justify-between gap-4 py-3">
      <div>
        <label
          htmlFor={id}
          className="block text-sm font-medium text-neutral-900"
        >
          {label}
        </label>
        {description && (
          <p className="mt-1 text-xs text-neutral-600">{description}</p>
        )}
      </div>

      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${
          checked ? 'bg-brand-blue' : 'bg-neutral-300'
        } ${disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}`}
      >
        <span
          className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
            checked ? 'translate-x-5' : 'translate-x-0.5'
          }`}
        />
      </button>
    </div>
  );
}
