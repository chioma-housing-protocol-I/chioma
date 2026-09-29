import { z } from 'zod';

// Maintenance request schema
export const maintenanceFormSchema = z.object({
  title: z.string().trim().min(1, 'Title is required'),
  description: z.string().trim().min(1, 'Description is required'),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']),
  propertyName: z.string().optional(),
});

export type MaintenanceFormData = z.infer<typeof maintenanceFormSchema>;
