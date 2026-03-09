'use client';

type FormErrorAlertProps = {
  message: string;
};

export default function FormErrorAlert({ message }: FormErrorAlertProps) {
  return (
    <div
      className="mb-6 rounded-xl border border-red-400/30 bg-red-500/20 p-4"
      role="alert"
      aria-live="assertive"
      aria-atomic="true"
    >
      <p className="text-sm text-red-200">{message}</p>
    </div>
  );
}
