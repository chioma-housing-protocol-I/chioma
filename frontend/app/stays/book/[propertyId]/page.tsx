'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { BookingStep1 } from '@/components/booking/BookingStep1';
import { BookingStep2 } from '@/components/booking/BookingStep2';
import { BookingStep3 } from '@/components/booking/BookingStep3';
import { BookingStep4 } from '@/components/booking/BookingStep4';
import { useProperty } from '@/lib/query/hooks';
import toast from 'react-hot-toast';

interface BookingData {
  checkIn: string;
  checkOut: string;
  guests: number;
  specialRequests: string;
  paymentMethod: string;
}

const STEPS = ['Dates', 'Requests', 'Payment', 'Review'];

export default function BookingPage() {
  const { propertyId } = useParams<{ propertyId: string }>();
  const router = useRouter();
  const { data: property } = useProperty(propertyId);
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [bookingData, setBookingData] = useState<BookingData>({
    checkIn: '',
    checkOut: '',
    guests: 1,
    specialRequests: '',
    paymentMethod: 'card',
  });

  const handleNext = (data: Partial<BookingData>) => {
    setBookingData((prev) => ({ ...prev, ...data }));
    setStep((s) => s + 1);
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ propertyId, ...bookingData }),
      });
      if (!res.ok) throw new Error('Booking failed');
      toast.success('Booking confirmed!');
      router.push('/guest/trips');
    } catch {
      toast.error('Something went wrong. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 text-white px-4 py-8">
      <div className="max-w-lg mx-auto">
        <Link
          href={`/stays/${propertyId}`}
          className="inline-flex items-center gap-2 text-blue-300/60 hover:text-white mb-8 transition-colors"
        >
          <ArrowLeft size={18} /> Back to property
        </Link>

        {/* Step indicator */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-3">
            {STEPS.map((label, i) => (
              <div key={label} className="flex items-center gap-2 flex-1">
                <div
                  className={`flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold shrink-0 ${i + 1 <= step ? 'bg-blue-500 text-white' : 'bg-white/10 text-blue-300/40'}`}
                >
                  {i + 1}
                </div>
                <div
                  className={`flex-1 h-1 rounded ${i + 1 < step ? 'bg-blue-500' : 'bg-white/10'} ${i === STEPS.length - 1 ? 'hidden' : ''}`}
                />
              </div>
            ))}
          </div>
          <p className="text-sm text-blue-300/60">
            Step {step} of {STEPS.length}: {STEPS[step - 1]}
          </p>
        </div>

        <div className="backdrop-blur-xl bg-slate-800/50 border border-white/10 rounded-2xl p-6">
          {step === 1 && (
            <BookingStep1
              onNext={handleNext}
              propertyId={propertyId}
              pricePerNight={property?.price}
              currency={property?.currency}
            />
          )}
          {step === 2 && (
            <BookingStep2 onNext={handleNext} onPrevious={() => setStep(1)} />
          )}
          {step === 3 && (
            <BookingStep3 onNext={handleNext} onPrevious={() => setStep(2)} />
          )}
          {step === 4 && (
            <BookingStep4
              bookingData={bookingData}
              onSubmit={handleSubmit}
              onPrevious={() => setStep(3)}
              isSubmitting={isSubmitting}
            />
          )}
        </div>
      </div>
    </div>
  );
}
