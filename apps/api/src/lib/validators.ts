import { z } from 'zod';

export const email = z.string().trim().toLowerCase().max(160).email('Enter a valid email address');

export const password = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(128, 'Password must be at most 128 characters')
  .regex(/[A-Za-z]/, 'Password must include a letter')
  .regex(/[0-9]/, 'Password must include a number');

export const personName = z.string().trim().min(2, 'Enter your full name').max(80, 'Name is too long');

export const indianPhone = z
  .string()
  .trim()
  .transform((s) => s.replace(/[\s-]/g, ''))
  .pipe(z.string().regex(/^(\+91)?[6-9]\d{9}$/, 'Enter a valid 10-digit Indian mobile number'));

export const INDIAN_STATES = [
  'Andaman and Nicobar Islands', 'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chandigarh', 'Chhattisgarh',
  'Dadra and Nagar Haveli and Daman and Diu', 'Delhi', 'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jammu and Kashmir',
  'Jharkhand', 'Karnataka', 'Kerala', 'Ladakh', 'Lakshadweep', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya',
  'Mizoram', 'Nagaland', 'Odisha', 'Puducherry', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura',
  'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
] as const;

export const addressInput = z.object({
  label: z.string().trim().max(30).optional().nullable(),
  fullName: personName,
  phone: indianPhone,
  line1: z.string().trim().min(3, 'Enter the street address').max(120),
  line2: z.string().trim().max(120).optional().nullable(),
  city: z.string().trim().min(2, 'Enter a city').max(60),
  state: z.enum(INDIAN_STATES, { error: 'Select a state' }),
  postalCode: z.string().trim().regex(/^[1-9]\d{5}$/, 'Enter a valid 6-digit PIN code'),
  country: z.literal('India', { error: 'We currently ship within India only' }).default('India'),
  isDefault: z.boolean().optional(),
});
