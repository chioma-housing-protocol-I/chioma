'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2, Mail, MessageSquare, Phone, Send, User } from 'lucide-react';
import { cloneElement, isValidElement, type ReactElement } from 'react';
import { useForm } from 'react-hook-form';
import { fieldErrorId } from '@/lib/forms/a11y';
import { FormErrorSummary } from '@/components/forms/FormErrorSummary';
import {
  contactSchema,
  type ContactFormData,
} from '@/lib/validation/forms';

export type { ContactFormData };

interface ContactFormProps {
  onSubmit: (data: ContactFormData) => Promise<void>;
  defaultSubject?: string;
  submitLabel?: string;
}

export function ContactForm({
  onSubmit,
  defaultSubject = '',
  submitLabel = 'Send message',
}: ContactFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting, submitCount },
    reset,
  } = useForm<ContactFormData>({
    resolver: zodResolver(contactSchema),
    defaultValues: {
      name: '',
      email: '',
      phone: '',
      subject: defaultSubject,
      message: '',
    },
  });

  const submit = async (data: ContactFormData) => {
    await onSubmit(data);
    reset({
      name: '',
      email: '',
      phone: '',
      subject: defaultSubject,
      message: '',
    });
  };

  return (
    <form
      onSubmit={handleSubmit((data) => void submit(data))}
      className="rounded-[2rem] border border-white/10 bg-white/5 p-6 shadow-xl backdrop-blur-sm"
    >
      <div>
        <h2 className="text-xl font-semibold text-white">Contact form</h2>
        <p className="mt-1 text-sm text-blue-100/55">
          Reach out directly with structured contact details and a validated
          message.
        </p>
      </div>

      <FormErrorSummary errors={errors} submitCount={submitCount} />

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <Field
          name="name"
          label="Name"
          icon={User}
          error={errors.name?.message}
        >
          <input
            {...register('name')}
            className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-white outline-none transition placeholder:text-blue-100/30 focus:border-blue-400/60"
            placeholder="Jane Doe"
          />
        </Field>
        <Field
          name="email"
          label="Email"
          icon={Mail}
          error={errors.email?.message}
        >
          <input
            type="email"
            {...register('email')}
            className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-white outline-none transition placeholder:text-blue-100/30 focus:border-blue-400/60"
            placeholder="jane@example.com"
          />
        </Field>
        <Field
          name="phone"
          label="Phone"
          icon={Phone}
          error={errors.phone?.message}
        >
          <input
            {...register('phone')}
            className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-white outline-none transition placeholder:text-blue-100/30 focus:border-blue-400/60"
            placeholder="+234 800 000 0000"
          />
        </Field>
        <Field
          name="subject"
          label="Subject"
          icon={MessageSquare}
          error={errors.subject?.message}
        >
          <input
            {...register('subject')}
            className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-white outline-none transition placeholder:text-blue-100/30 focus:border-blue-400/60"
            placeholder="Property inquiry"
          />
        </Field>
      </div>

      <Field
        name="message"
        label="Message"
        icon={Send}
        error={errors.message?.message}
        className="mt-4"
      >
        <textarea
          {...register('message')}
          rows={6}
          className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-white outline-none transition placeholder:text-blue-100/30 focus:border-blue-400/60"
          placeholder="Share the details you want the recipient to act on. Emoji and @mentions are supported in the message body."
        />
      </Field>

      <div className="mt-5 flex justify-end">
        <button
          type="submit"
          disabled={isSubmitting}
          className="inline-flex items-center gap-2 rounded-full bg-blue-500 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-400 disabled:pointer-events-none disabled:opacity-50"
        >
          {isSubmitting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
          {isSubmitting ? 'Sending...' : submitLabel}
        </button>
      </div>
    </form>
  );
}

function Field({
  name,
  label,
  icon: Icon,
  error,
  children,
  className = '',
}: {
  name: string;
  label: string;
  icon: typeof User;
  error?: string;
  children: ReactElement;
  className?: string;
}) {
  const errorId = fieldErrorId(name);
  const child = isValidElement(children)
    ? cloneElement(children, {
        id: name,
        'aria-invalid': error ? true : undefined,
        'aria-describedby': error ? errorId : undefined,
      } as Record<string, unknown>)
    : children;

  return (
    <div className={className}>
      <label
        htmlFor={name}
        className="mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-blue-100/45"
      >
        <Icon className="h-3.5 w-3.5" />
        {label}
      </label>
      {child}
      {error ? (
        <p id={errorId} className="mt-2 text-xs text-rose-300">
          {error}
        </p>
      ) : null}
    </div>
  );
}