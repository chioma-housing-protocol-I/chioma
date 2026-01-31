"use client";

import React, { useState } from "react";
import {
  Upload,
  X,
  Check,
  AlertCircle,
  Home,
  DollarSign,
  Image as ImageIcon,
} from "lucide-react";
import Image from "next/image";

interface FormData {
  name: string;
  address: string;
  city: string;
  state: string;
  propertyType: string;
  bedrooms: string;
  bathrooms: string;
  squareFeet: string;
  rentAmount: string;
  currency: string;
  paymentPeriod: string;
  description: string;
  amenities: string[];
}

interface Notification {
  type: "success" | "error";
  message: string;
}

export default function AddPropertyPage() {
  const [formData, setFormData] = useState<FormData>({
    name: "",
    address: "",
    city: "",
    state: "",
    propertyType: "",
    bedrooms: "",
    bathrooms: "",
    squareFeet: "",
    rentAmount: "",
    currency: "₦",
    paymentPeriod: "monthly",
    description: "",
    amenities: [],
  });

  const [images, setImages] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>(
    {},
  );
  const [notification, setNotification] = useState<Notification | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const propertyTypes = [
    "Apartment",
    "House",
    "Duplex",
    "Penthouse",
    "Commercial",
    "Office Space",
    "Land",
  ];

  const availableAmenities = [
    "Parking",
    "Swimming Pool",
    "Gym",
    "24/7 Security",
    "Generator",
    "Air Conditioning",
    "Balcony",
    "Garden",
    "Elevator",
    "WiFi",
  ];

  const currencies = ["₦", "$", "€", "£"];

  const handleInputChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >,
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    // Clear error for this field
    if (errors[name as keyof FormData]) {
      setErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  const handleAmenityToggle = (amenity: string) => {
    setFormData((prev) => ({
      ...prev,
      amenities: prev.amenities.includes(amenity)
        ? prev.amenities.filter((a) => a !== amenity)
        : [...prev.amenities, amenity],
    }));
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const validFiles = files.filter((file) => {
      const isValid = file.type.startsWith("image/");
      const isUnder5MB = file.size <= 5 * 1024 * 1024;
      return isValid && isUnder5MB;
    });

    if (validFiles.length !== files.length) {
      showNotification(
        "error",
        "Some files were skipped. Only images under 5MB are allowed.",
      );
    }

    setImages((prev) => [...prev, ...validFiles]);

    // Create previews
    validFiles.forEach((file) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreviews((prev) => [...prev, reader.result as string]);
      };
      reader.readAsDataURL(file);
    });
  };

  const removeImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
    setImagePreviews((prev) => prev.filter((_, i) => i !== index));
  };

  const validateForm = (): boolean => {
    const newErrors: Partial<Record<keyof FormData, string>> = {};

    if (!formData.name.trim()) newErrors.name = "Property name is required";
    if (!formData.address.trim()) newErrors.address = "Address is required";
    if (!formData.city.trim()) newErrors.city = "City is required";
    if (!formData.state.trim()) newErrors.state = "State is required";
    if (!formData.propertyType)
      newErrors.propertyType = "Property type is required";
    if (!formData.bedrooms || parseInt(formData.bedrooms) < 0)
      newErrors.bedrooms = "Valid number of bedrooms is required";
    if (!formData.bathrooms || parseInt(formData.bathrooms) < 0)
      newErrors.bathrooms = "Valid number of bathrooms is required";
    if (!formData.squareFeet || parseInt(formData.squareFeet) <= 0)
      newErrors.squareFeet = "Valid square footage is required";
    if (!formData.rentAmount || parseFloat(formData.rentAmount) <= 0)
      newErrors.rentAmount = "Valid rent amount is required";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const showNotification = (type: "success" | "error", message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 5000);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      showNotification("error", "Please fix the errors in the form");
      return;
    }

    if (images.length === 0) {
      showNotification("error", "Please upload at least one property image");
      return;
    }

    setIsSubmitting(true);

    // Simulate API call
    setTimeout(() => {
      console.log("Form Data:", formData);
      console.log("Images:", images);
      showNotification("success", "Property added successfully!");
      setIsSubmitting(false);

      // Reset form
      setFormData({
        name: "",
        address: "",
        city: "",
        state: "",
        propertyType: "",
        bedrooms: "",
        bathrooms: "",
        squareFeet: "",
        rentAmount: "",
        currency: "₦",
        paymentPeriod: "monthly",
        description: "",
        amenities: [],
      });
      setImages([]);
      setImagePreviews([]);
    }, 1500);
  };

  return (
    <div className="max-w-5xl mx-auto">
      {/* Notification Toast */}
      {notification && (
        <div
          className={`fixed top-6 right-6 z-50 flex items-center space-x-3 px-6 py-4 rounded-xl shadow-lg border animate-slide-in ${
            notification.type === "success"
              ? "bg-green-50 border-brand-green text-brand-green"
              : "bg-red-50 border-red-500 text-red-600"
          }`}
        >
          {notification.type === "success" ? (
            <Check className="w-5 h-5" />
          ) : (
            <AlertCircle className="w-5 h-5" />
          )}
          <span className="font-semibold">{notification.message}</span>
        </div>
      )}

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-neutral-900 mb-2">
          Add New Property
        </h1>
        <p className="text-neutral-500">
          Fill in the details to list your property
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Property Information */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-neutral-200">
          <div className="flex items-center space-x-3 mb-6">
            <div className="p-2.5 rounded-lg bg-blue-100">
              <Home className="text-brand-blue" size={20} />
            </div>
            <h2 className="text-xl font-bold text-neutral-900">
              Property Information
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Property Name */}
            <div className="md:col-span-2">
              <label className="block text-sm font-semibold text-neutral-700 mb-2">
                Property Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                placeholder="e.g., Luxury Apartment at Victoria Island"
                className={`w-full px-4 py-3 rounded-lg border ${
                  errors.name ? "border-red-500" : "border-neutral-200"
                } focus:outline-none focus:ring-2 focus:ring-brand-blue focus:border-transparent transition-all`}
              />
              {errors.name && (
                <p className="text-red-500 text-sm mt-1">{errors.name}</p>
              )}
            </div>

            {/* Address */}
            <div className="md:col-span-2">
              <label className="block text-sm font-semibold text-neutral-700 mb-2">
                Street Address <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="address"
                value={formData.address}
                onChange={handleInputChange}
                placeholder="e.g., 101 Adeola Odeku Street"
                className={`w-full px-4 py-3 rounded-lg border ${
                  errors.address ? "border-red-500" : "border-neutral-200"
                } focus:outline-none focus:ring-2 focus:ring-brand-blue focus:border-transparent transition-all`}
              />
              {errors.address && (
                <p className="text-red-500 text-sm mt-1">{errors.address}</p>
              )}
            </div>

            {/* City */}
            <div>
              <label className="block text-sm font-semibold text-neutral-700 mb-2">
                City <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="city"
                value={formData.city}
                onChange={handleInputChange}
                placeholder="e.g., Lagos"
                className={`w-full px-4 py-3 rounded-lg border ${
                  errors.city ? "border-red-500" : "border-neutral-200"
                } focus:outline-none focus:ring-2 focus:ring-brand-blue focus:border-transparent transition-all`}
              />
              {errors.city && (
                <p className="text-red-500 text-sm mt-1">{errors.city}</p>
              )}
            </div>

            {/* State */}
            <div>
              <label className="block text-sm font-semibold text-neutral-700 mb-2">
                State <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="state"
                value={formData.state}
                onChange={handleInputChange}
                placeholder="e.g., Lagos State"
                className={`w-full px-4 py-3 rounded-lg border ${
                  errors.state ? "border-red-500" : "border-neutral-200"
                } focus:outline-none focus:ring-2 focus:ring-brand-blue focus:border-transparent transition-all`}
              />
              {errors.state && (
                <p className="text-red-500 text-sm mt-1">{errors.state}</p>
              )}
            </div>

            {/* Property Type */}
            <div>
              <label className="block text-sm font-semibold text-neutral-700 mb-2">
                Property Type <span className="text-red-500">*</span>
              </label>
              <select
                name="propertyType"
                value={formData.propertyType}
                onChange={handleInputChange}
                className={`w-full px-4 py-3 rounded-lg border ${
                  errors.propertyType ? "border-red-500" : "border-neutral-200"
                } focus:outline-none focus:ring-2 focus:ring-brand-blue focus:border-transparent transition-all`}
              >
                <option value="">Select type</option>
                {propertyTypes.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
              {errors.propertyType && (
                <p className="text-red-500 text-sm mt-1">
                  {errors.propertyType}
                </p>
              )}
            </div>

            {/* Square Feet */}
            <div>
              <label className="block text-sm font-semibold text-neutral-700 mb-2">
                Square Feet <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                name="squareFeet"
                value={formData.squareFeet}
                onChange={handleInputChange}
                placeholder="e.g., 1200"
                min="0"
                className={`w-full px-4 py-3 rounded-lg border ${
                  errors.squareFeet ? "border-red-500" : "border-neutral-200"
                } focus:outline-none focus:ring-2 focus:ring-brand-blue focus:border-transparent transition-all`}
              />
              {errors.squareFeet && (
                <p className="text-red-500 text-sm mt-1">{errors.squareFeet}</p>
              )}
            </div>

            {/* Bedrooms */}
            <div>
              <label className="block text-sm font-semibold text-neutral-700 mb-2">
                Bedrooms <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                name="bedrooms"
                value={formData.bedrooms}
                onChange={handleInputChange}
                placeholder="e.g., 3"
                min="0"
                className={`w-full px-4 py-3 rounded-lg border ${
                  errors.bedrooms ? "border-red-500" : "border-neutral-200"
                } focus:outline-none focus:ring-2 focus:ring-brand-blue focus:border-transparent transition-all`}
              />
              {errors.bedrooms && (
                <p className="text-red-500 text-sm mt-1">{errors.bedrooms}</p>
              )}
            </div>

            {/* Bathrooms */}
            <div>
              <label className="block text-sm font-semibold text-neutral-700 mb-2">
                Bathrooms <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                name="bathrooms"
                value={formData.bathrooms}
                onChange={handleInputChange}
                placeholder="e.g., 2"
                min="0"
                className={`w-full px-4 py-3 rounded-lg border ${
                  errors.bathrooms ? "border-red-500" : "border-neutral-200"
                } focus:outline-none focus:ring-2 focus:ring-brand-blue focus:border-transparent transition-all`}
              />
              {errors.bathrooms && (
                <p className="text-red-500 text-sm mt-1">{errors.bathrooms}</p>
              )}
            </div>

            {/* Description */}
            <div className="md:col-span-2">
              <label className="block text-sm font-semibold text-neutral-700 mb-2">
                Description
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                placeholder="Describe your property..."
                rows={4}
                className="w-full px-4 py-3 rounded-lg border border-neutral-200 focus:outline-none focus:ring-2 focus:ring-brand-blue focus:border-transparent transition-all resize-none"
              />
            </div>
          </div>
        </div>

        {/* Financial Details */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-neutral-200">
          <div className="flex items-center space-x-3 mb-6">
            <div className="p-2.5 rounded-lg bg-green-100">
              <DollarSign className="text-brand-green" size={20} />
            </div>
            <h2 className="text-xl font-bold text-neutral-900">
              Financial Details
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Rent Amount */}
            <div>
              <label className="block text-sm font-semibold text-neutral-700 mb-2">
                Rent Amount <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                name="rentAmount"
                value={formData.rentAmount}
                onChange={handleInputChange}
                placeholder="e.g., 2500000"
                min="0"
                step="0.01"
                className={`w-full px-4 py-3 rounded-lg border ${
                  errors.rentAmount ? "border-red-500" : "border-neutral-200"
                } focus:outline-none focus:ring-2 focus:ring-brand-blue focus:border-transparent transition-all`}
              />
              {errors.rentAmount && (
                <p className="text-red-500 text-sm mt-1">{errors.rentAmount}</p>
              )}
            </div>

            {/* Currency */}
            <div>
              <label className="block text-sm font-semibold text-neutral-700 mb-2">
                Currency
              </label>
              <select
                name="currency"
                value={formData.currency}
                onChange={handleInputChange}
                className="w-full px-4 py-3 rounded-lg border border-neutral-200 focus:outline-none focus:ring-2 focus:ring-brand-blue focus:border-transparent transition-all"
              >
                {currencies.map((curr) => (
                  <option key={curr} value={curr}>
                    {curr}
                  </option>
                ))}
              </select>
            </div>

            {/* Payment Period */}
            <div>
              <label className="block text-sm font-semibold text-neutral-700 mb-2">
                Payment Period
              </label>
              <select
                name="paymentPeriod"
                value={formData.paymentPeriod}
                onChange={handleInputChange}
                className="w-full px-4 py-3 rounded-lg border border-neutral-200 focus:outline-none focus:ring-2 focus:ring-brand-blue focus:border-transparent transition-all"
              >
                <option value="monthly">Monthly</option>
                <option value="yearly">Yearly</option>
              </select>
            </div>
          </div>
        </div>

        {/* Amenities */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-neutral-200">
          <h2 className="text-xl font-bold text-neutral-900 mb-4">Amenities</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
            {availableAmenities.map((amenity) => (
              <button
                key={amenity}
                type="button"
                onClick={() => handleAmenityToggle(amenity)}
                className={`px-4 py-3 rounded-lg border-2 text-sm font-semibold transition-all ${
                  formData.amenities.includes(amenity)
                    ? "border-brand-blue bg-blue-50 text-brand-blue"
                    : "border-neutral-200 bg-white text-neutral-700 hover:border-neutral-300"
                }`}
              >
                {amenity}
              </button>
            ))}
          </div>
        </div>

        {/* Image Upload */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-neutral-200">
          <div className="flex items-center space-x-3 mb-6">
            <div className="p-2.5 rounded-lg bg-purple-100">
              <ImageIcon className="text-purple-600" size={20} />
            </div>
            <h2 className="text-xl font-bold text-neutral-900">
              Property Images
            </h2>
          </div>

          {/* Upload Area */}
          <div className="mb-6">
            <label className="block">
              <div className="border-2 border-dashed border-neutral-300 rounded-xl p-8 text-center hover:border-brand-blue hover:bg-blue-50 transition-all cursor-pointer">
                <Upload className="mx-auto text-neutral-400 mb-3" size={40} />
                <p className="text-neutral-700 font-semibold mb-1">
                  Click to upload or drag and drop
                </p>
                <p className="text-sm text-neutral-500">
                  PNG, JPG, WEBP up to 5MB each
                </p>
              </div>
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={handleImageUpload}
                className="hidden"
              />
            </label>
          </div>

          {/* Image Previews */}
          {imagePreviews.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {imagePreviews.map((preview, index) => (
                <div key={index} className="relative group">
                  <div className="relative w-full h-32 rounded-lg overflow-hidden border border-neutral-200">
                    <Image
                      src={preview}
                      alt={`Preview ${index + 1}`}
                      fill
                      className="object-cover"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => removeImage(index)}
                    className="absolute -top-2 -right-2 p-1.5 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                  >
                    <X size={16} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Submit Button */}
        <div className="flex items-center justify-end space-x-4">
          <button
            type="button"
            onClick={() => window.history.back()}
            className="px-6 py-3 bg-neutral-100 text-neutral-700 font-semibold rounded-lg hover:bg-neutral-200 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-8 py-3 bg-brand-blue text-white font-semibold rounded-lg hover:bg-brand-blue-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
          >
            {isSubmitting ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Adding Property...</span>
              </>
            ) : (
              <span>Add Property</span>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
