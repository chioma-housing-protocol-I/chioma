'use client';

import React, { useState } from 'react';
import { toast } from 'react-hot-toast';
import { Uploader } from '@/components/ui/Uploader';
import { useKycSubmit } from '@/lib/query/hooks/use-kyc-submit';

interface KycSubmissionFormProps {
  defaultValues?: {
    firstName?: string;
    lastName?: string;
    email?: string;
  };
  onSubmitted?: () => void;
}

const fileToBase64 = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
  });

const inputClass =
  'w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder:text-blue-200/30 focus:border-blue-400 focus:outline-none';

export function KycSubmissionForm({
  defaultValues,
  onSubmitted,
}: KycSubmissionFormProps) {
  const submitKyc = useKycSubmit();
  const [form, setForm] = useState({
    firstName: defaultValues?.firstName ?? '',
    lastName: defaultValues?.lastName ?? '',
    dob: '',
    country: '',
    address: '',
    idType: 'passport',
    idNumber: '',
  });
  const [idFiles, setIdFiles] = useState<File[]>([]);
  const [addressFiles, setAddressFiles] = useState<File[]>([]);
  const [error, setError] = useState<string | null>(null);

  const update =
    (key: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm((prev) => ({ ...prev, [key]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const missing =
      !form.firstName ||
      !form.lastName ||
      !form.dob ||
      !form.country ||
      !form.idNumber ||
      idFiles.length === 0 ||
      addressFiles.length === 0;
    if (missing) {
      setError('Please complete all fields and upload both documents.');
      return;
    }
    setError(null);

    try {
      const [idDocument, addressDocument] = await Promise.all([
        fileToBase64(idFiles[0]),
        fileToBase64(addressFiles[0]),
      ]);
      await submitKyc.mutateAsync({
        first_name: form.firstName,
        last_name: form.lastName,
        email_address: defaultValues?.email,
        birth_date: form.dob,
        address_country_code: form.country,
        address: form.address,
        id_type: form.idType,
        id_number: form.idNumber,
        photo_id_front: idDocument,
        proof_of_address: addressDocument,
      });
      toast.success('Verification submitted. We will review it shortly.');
      onSubmitted?.();
    } catch {
      setError('Submission failed. Please try again.');
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-5"
      aria-label="KYC submission form"
      noValidate
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="space-y-1 text-sm text-blue-200/70">
          <span>First name</span>
          <input
            className={inputClass}
            value={form.firstName}
            onChange={update('firstName')}
            name="firstName"
          />
        </label>
        <label className="space-y-1 text-sm text-blue-200/70">
          <span>Last name</span>
          <input
            className={inputClass}
            value={form.lastName}
            onChange={update('lastName')}
            name="lastName"
          />
        </label>
        <label className="space-y-1 text-sm text-blue-200/70">
          <span>Date of birth</span>
          <input
            type="date"
            className={inputClass}
            value={form.dob}
            onChange={update('dob')}
            name="dob"
          />
        </label>
        <label className="space-y-1 text-sm text-blue-200/70">
          <span>Country</span>
          <input
            className={inputClass}
            value={form.country}
            onChange={update('country')}
            placeholder="e.g. NG"
            name="country"
          />
        </label>
        <label className="space-y-1 text-sm text-blue-200/70 sm:col-span-2">
          <span>Residential address</span>
          <input
            className={inputClass}
            value={form.address}
            onChange={update('address')}
            name="address"
          />
        </label>
        <label className="space-y-1 text-sm text-blue-200/70">
          <span>ID type</span>
          <select
            className={inputClass}
            value={form.idType}
            onChange={update('idType')}
            name="idType"
          >
            <option value="passport">Passport</option>
            <option value="drivers_license">Driver&apos;s license</option>
            <option value="national_id">National ID</option>
          </select>
        </label>
        <label className="space-y-1 text-sm text-blue-200/70">
          <span>ID number</span>
          <input
            className={inputClass}
            value={form.idNumber}
            onChange={update('idNumber')}
            name="idNumber"
          />
        </label>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Uploader
          label="Government-issued ID"
          accept="image/*,.pdf"
          onFilesSelected={setIdFiles}
          maxFiles={1}
        />
        <Uploader
          label="Proof of address"
          accept="image/*,.pdf"
          onFilesSelected={setAddressFiles}
          maxFiles={1}
        />
      </div>

      {error ? (
        <p role="alert" className="text-sm text-red-300">
          {error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={submitKyc.isPending}
        className="w-full rounded-xl bg-blue-600 px-4 py-3 text-sm font-bold text-white transition hover:bg-blue-500 disabled:opacity-50"
      >
        {submitKyc.isPending ? 'Submitting…' : 'Submit for verification'}
      </button>
    </form>
  );
}

export default KycSubmissionForm;
