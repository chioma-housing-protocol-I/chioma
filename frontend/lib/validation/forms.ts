'use client';

import { z } from 'zod';

// ─── Maintenance Form ──────────────────────────────────────────────────────────

export const maintenanceSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200, 'Title cannot exceed 200 characters'),
  description: z.string().min(1, 'Description is required').max(2000, 'Description cannot exceed 2000 characters'),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']),
  propertyId: z.string().optional(),
  propertyName: z.string().optional(),
});

export type MaintenanceFormData = z.infer<typeof maintenanceSchema>;

// ─── Contact Form ──────────────────────────────────────────────────────────────

export const contactSchema = z.object({
  name: z.string().min(2, 'Enter your name'),
  email: z.string().email('Enter a valid email address'),
  phone: z
    .string()
    .min(7, 'Enter a valid phone number')
    .optional()
    .or(z.literal('')),
  subject: z.string().min(4, 'Enter a subject'),
  message: z.string().min(12, 'Message should be at least 12 characters'),
});

export type ContactFormData = z.infer<typeof contactSchema>;

// ─── Property Inquiry Form ─────────────────────────────────────────────────────

export const propertyInquirySchema = z.object({
  propertyId: z.string().optional(),
  propertyTitle: z.string().optional(),
  name: z.string().min(1, 'Name is required').max(100, 'Name cannot exceed 100 characters'),
  email: z.string().email('Enter a valid email address'),
  phone: z.string().optional().or(z.literal('')),
  message: z.string().min(10, 'Message must be at least 10 characters'),
});

export type PropertyInquiryFormData = z.infer<typeof propertyInquirySchema>;

// ─── Dispute Filing Form ───────────────────────────────────────────────────────

export const disputeFilingSchema = z.object({
  agreementId: z.string().min(1, 'Agreement ID is required'),
  disputeType: z.enum([
    'RENT_PAYMENT',
    'SECURITY_DEPOSIT',
    'PROPERTY_DAMAGE',
    'MAINTENANCE',
    'TERMINATION',
    'OTHER',
  ]),
  description: z
    .string()
    .min(20, 'Description must be at least 20 characters')
    .max(2000, 'Description cannot exceed 2000 characters'),
  requestedAmount: z
    .string()
    .optional()
    .refine(
      (val) => !val || (!isNaN(Number(val)) && Number(val) > 0),
      'Must be a positive number',
    ),
});

export type DisputeFilingFormData = z.infer<typeof disputeFilingSchema>;

// ─── Tenant Onboarding Form ────────────────────────────────────────────────────

export const tenantOnboardingProfileSchema = z.object({
  phone: z.string().optional().or(z.literal('')),
  bio: z.string().max(300, 'Bio cannot exceed 300 characters').optional().or(z.literal('')),
  location: z.string().optional().or(z.literal('')),
});

export const tenantOnboardingSearchSchema = z.object({
  savedSearchCity: z.string().min(1, 'Please enter a city or neighborhood'),
  notificationsEnabled: z.boolean(),
  searchRadius: z.string().optional(),
});

export const tenantOnboardingDiscoverySchema = z.object({
  paymentsAcknowledged: z
    .boolean()
    .refine(
      (val) => val === true,
      'Please acknowledge the instant rent payments feature',
    ),
  disputesAcknowledged: z
    .boolean()
    .refine(
      (val) => val === true,
      'Please acknowledge the dispute resolution feature',
    ),
  blockchainAcknowledged: z
    .boolean()
    .refine(
      (val) => val === true,
      'Please acknowledge the blockchain lease agreements feature',
    ),
});