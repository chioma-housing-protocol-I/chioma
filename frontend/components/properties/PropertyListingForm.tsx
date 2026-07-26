'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Building2,
  MapPin,
  Bed,
  DollarSign,
  Image as ImageIcon,
  CheckCircle2,
  ChevronRight,
  ChevronLeft,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import { Uploader } from '../ui/Uploader';
import {
  useCreateProperty,
  useUploadPropertyImage,
} from '@/lib/query/hooks/use-properties';

const formSchema = z.object({
  title: z.string().min(5, 'Title must be at least 5 characters'),
  description: z.string().min(20, 'Description must be at least 20 characters'),
  price: z.string().regex(/^\d+(\.\d{1,2})?$/, 'Enter a valid price'),
  address: z.string().min(5, 'Address is required'),
  city: z.string().min(2, 'City is required'),
  state: z.string().optional(),
  country: z.string().optional(),
  beds: z.number().min(0),
  baths: z.number().min(0),
  area: z.number().min(0),
  type: z.enum(['apartment', 'house', 'commercial', 'land', 'other']),
});

type FormValues = z.infer<typeof formSchema>;

export default function PropertyListingForm() {
  const [step, setStep] = useState(1);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const createProperty = useCreateProperty();
  const uploadImage = useUploadPropertyImage();

  const {
    register,
    handleSubmit,
    formState: { errors },
    getValues,
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      beds: 0,
      baths: 0,
      area: 0,
      type: 'apartment',
    },
  });

  const nextStep = () => setStep((s) => s + 1);
  const prevStep = () => setStep((s) => s - 1);

  const onSubmit = async (data: FormValues) => {
    setUploadError(null);

    try {
      // Upload all selected images in parallel and collect their URLs
      const imageUploads = await Promise.all(
        selectedFiles.map((file) => uploadImage.mutateAsync(file)),
      );

      const images = imageUploads.map((result, index) => ({
        url: result.url,
        sortOrder: index,
        isPrimary: index === 0,
      }));

      await createProperty.mutateAsync({
        title: data.title,
        description: data.description,
        address: data.address,
        city: data.city,
        state: data.state,
        country: data.country,
        price: parseFloat(data.price),
        bedrooms: data.beds,
        bathrooms: data.baths,
        area: data.area,
        type: data.type,
        images,
      });

      nextStep(); // Move to success step
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : 'Failed to create listing. Please try again.';
      setUploadError(message);
    }
  };

  const isSubmitting = createProperty.isPending || uploadImage.isPending;

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <div className="space-y-6 animate-in slide-in-from-right duration-500">
            <div className="space-y-4">
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <Building2 className="w-5 h-5 text-blue-400" />
                Basic Information
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-blue-200/50 mb-1.5 pl-1">
                    Property Title
                  </label>
                  <input
                    {...register('title')}
                    className="w-full bg-slate-900/50 border border-white/10 rounded-xl py-3 px-4 text-white focus:ring-2 focus:ring-blue-500/50 transition-all outline-none"
                    placeholder="e.g. Modern Luxury Apartment with City View"
                  />
                  {errors.title && (
                    <p className="text-red-400 text-xs mt-1 ml-1">
                      {errors.title.message}
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-blue-200/50 mb-1.5 pl-1">
                    Description
                  </label>
                  <textarea
                    {...register('description')}
                    rows={4}
                    className="w-full bg-slate-900/50 border border-white/10 rounded-xl py-3 px-4 text-white focus:ring-2 focus:ring-blue-500/50 transition-all outline-none"
                    placeholder="Describe the property's best features..."
                  />
                  {errors.description && (
                    <p className="text-red-400 text-xs mt-1 ml-1">
                      {errors.description.message}
                    </p>
                  )}
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={nextStep}
              className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg active:scale-95"
            >
              <span>Next: Location &amp; Pricing</span>
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6 animate-in slide-in-from-right duration-500">
            <div className="space-y-4">
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <MapPin className="w-5 h-5 text-blue-400" />
                Location &amp; Pricing
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-blue-200/50 mb-1.5 pl-1">
                    Street Address
                  </label>
                  <input
                    {...register('address')}
                    className="w-full bg-slate-900/50 border border-white/10 rounded-xl py-3 px-4 text-white focus:ring-2 focus:ring-blue-500/50 transition-all outline-none"
                    placeholder="123 Main Street, Apt 4B"
                  />
                  {errors.address && (
                    <p className="text-red-400 text-xs mt-1 ml-1">
                      {errors.address.message}
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-blue-200/50 mb-1.5 pl-1">
                    City
                  </label>
                  <input
                    {...register('city')}
                    className="w-full bg-slate-900/50 border border-white/10 rounded-xl py-3 px-4 text-white focus:ring-2 focus:ring-blue-500/50 transition-all outline-none"
                    placeholder="New York"
                  />
                  {errors.city && (
                    <p className="text-red-400 text-xs mt-1 ml-1">
                      {errors.city.message}
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-blue-200/50 mb-1.5 pl-1">
                    State / Province
                  </label>
                  <input
                    {...register('state')}
                    className="w-full bg-slate-900/50 border border-white/10 rounded-xl py-3 px-4 text-white focus:ring-2 focus:ring-blue-500/50 transition-all outline-none"
                    placeholder="NY"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-blue-200/50 mb-1.5 pl-1">
                    Monthly Rent ($)
                  </label>
                  <div className="relative">
                    <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-200/30" />
                    <input
                      {...register('price')}
                      className="w-full bg-slate-900/50 border border-white/10 rounded-xl py-3 pl-10 pr-4 text-white focus:ring-2 focus:ring-blue-500/50 transition-all outline-none"
                      placeholder="2500"
                    />
                  </div>
                  {errors.price && (
                    <p className="text-red-400 text-xs mt-1 ml-1">
                      {errors.price.message}
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-blue-200/50 mb-1.5 pl-1">
                    Property Type
                  </label>
                  <select
                    {...register('type')}
                    className="w-full bg-slate-900/50 border border-white/10 rounded-xl py-3 px-4 text-white focus:ring-2 focus:ring-blue-500/50 transition-all outline-none appearance-none"
                  >
                    <option value="apartment">Apartment</option>
                    <option value="house">House</option>
                    <option value="commercial">Commercial</option>
                    <option value="land">Land</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="flex gap-4">
              <button
                type="button"
                onClick={prevStep}
                className="flex-1 bg-slate-800 hover:bg-slate-700 text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2 transition-all"
              >
                <ChevronLeft className="w-5 h-5" />
                <span>Back</span>
              </button>
              <button
                type="button"
                onClick={nextStep}
                className="flex-2 bg-blue-600 hover:bg-blue-500 text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2 transition-all"
              >
                <span>Next: Details</span>
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-6 animate-in slide-in-from-right duration-500">
            <div className="space-y-4">
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <Bed className="w-5 h-5 text-blue-400" />
                Property Details
              </h3>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-blue-200/50 mb-1.5 pl-1">
                    Beds
                  </label>
                  <input
                    type="number"
                    min={0}
                    {...register('beds', { valueAsNumber: true })}
                    className="w-full bg-slate-900/50 border border-white/10 rounded-xl py-3 px-4 text-white focus:ring-2 focus:ring-blue-500/50 transition-all outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-blue-200/50 mb-1.5 pl-1">
                    Baths
                  </label>
                  <input
                    type="number"
                    min={0}
                    {...register('baths', { valueAsNumber: true })}
                    className="w-full bg-slate-900/50 border border-white/10 rounded-xl py-3 px-4 text-white focus:ring-2 focus:ring-blue-500/50 transition-all outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-blue-200/50 mb-1.5 pl-1">
                    Area (m²)
                  </label>
                  <input
                    type="number"
                    min={0}
                    {...register('area', { valueAsNumber: true })}
                    className="w-full bg-slate-900/50 border border-white/10 rounded-xl py-3 px-4 text-white focus:ring-2 focus:ring-blue-500/50 transition-all outline-none"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <ImageIcon className="w-5 h-5 text-blue-400" />
                Photos
              </h3>
              <Uploader
                label="Property Images"
                accept="image/*"
                multiple
                maxFiles={10}
                onFilesSelected={setSelectedFiles}
                description="Upload high-quality images of the property (max 10)"
              />
            </div>

            {/* Submission error */}
            {uploadError && (
              <div className="flex items-start gap-3 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">
                <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                <span>{uploadError}</span>
              </div>
            )}

            <div className="flex gap-4">
              <button
                type="button"
                onClick={prevStep}
                disabled={isSubmitting}
                className="flex-1 bg-slate-800 hover:bg-slate-700 text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2 transition-all disabled:opacity-50"
              >
                <ChevronLeft className="w-5 h-5" />
                <span>Back</span>
              </button>
              <button
                type="button"
                onClick={handleSubmit(onSubmit)}
                disabled={isSubmitting}
                className="flex-2 bg-blue-600 hover:bg-blue-500 text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-blue-500/20 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Publishing…</span>
                  </>
                ) : (
                  <>
                    <span>Publish Listing</span>
                    <CheckCircle2 className="w-5 h-5" />
                  </>
                )}
              </button>
            </div>
          </div>
        );

      case 4:
        return (
          <div className="text-center py-12 space-y-6 animate-in zoom-in duration-500">
            <div className="w-20 h-20 bg-emerald-500/20 text-emerald-500 rounded-full flex items-center justify-center mx-auto border border-emerald-500/20">
              <CheckCircle2 className="w-10 h-10" />
            </div>
            <div className="space-y-2">
              <h2 className="text-3xl font-black text-white">
                Listing Created!
              </h2>
              <p className="text-blue-200/50 max-w-sm mx-auto">
                Your property listing has been successfully submitted as a
                draft. Publish it from your dashboard to make it visible to
                tenants.
              </p>
            </div>
            <button
              type="button"
              onClick={() => (window.location.href = '/landlords/properties')}
              className="bg-slate-800 hover:bg-slate-700 text-white font-bold px-8 py-3.5 rounded-2xl transition-all"
            >
              Go to Dashboard
            </button>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="max-w-3xl mx-auto backdrop-blur-2xl bg-slate-900/50 border border-white/10 rounded-[2.5rem] p-8 md:p-12 shadow-2xl">
      {/* Progress Header */}
      {step < 4 && (
        <div className="mb-12 space-y-4">
          <div className="flex justify-between items-end">
            <div>
              <p className="text-blue-200/30 text-xs font-black uppercase tracking-[0.2em] mb-1">
                Step {step} of 3
              </p>
              <h2 className="text-3xl font-black text-white tracking-tight">
                {step === 1
                  ? 'Start with basics'
                  : step === 2
                    ? 'Where and how much?'
                    : 'Final details'}
              </h2>
            </div>
            <span className="text-blue-200/50 font-bold text-lg">
              {Math.round((step / 3) * 100)}%
            </span>
          </div>
          <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-600 transition-all duration-500 ease-out rounded-full"
              style={{ width: `${(step / 3) * 100}%` }}
            />
          </div>
        </div>
      )}

      {renderStep()}
    </div>
  );
}
