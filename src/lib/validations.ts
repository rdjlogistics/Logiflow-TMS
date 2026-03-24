import { z } from 'zod';

// Common field schemas
export const emailSchema = z.string().email('Ongeldig e-mailadres');
export const phoneSchema = z.string().regex(/^(\+31|0)[1-9][0-9]{8}$/, 'Ongeldig telefoonnummer');
export const postalCodeNLSchema = z.string().regex(/^[1-9][0-9]{3}\s?[A-Za-z]{2}$/, 'Ongeldige postcode');
export const ibanSchema = z.string().regex(/^[A-Z]{2}[0-9]{2}[A-Z0-9]{4}[0-9]{7}([A-Z0-9]?){0,16}$/, 'Ongeldig IBAN');
export const vatNumberSchema = z.string().regex(/^NL[0-9]{9}B[0-9]{2}$/, 'Ongeldig BTW-nummer');
export const kvkNumberSchema = z.string().regex(/^[0-9]{8}$/, 'Ongeldig KVK-nummer');

// Address schema
export const addressSchema = z.object({
  street: z.string().min(1, 'Straat is verplicht'),
  houseNumber: z.string().min(1, 'Huisnummer is verplicht'),
  postalCode: postalCodeNLSchema,
  city: z.string().min(1, 'Plaats is verplicht'),
  country: z.string().default('NL'),
});

// Customer schema
export const customerSchema = z.object({
  companyName: z.string().min(2, 'Bedrijfsnaam moet minimaal 2 karakters zijn'),
  contactName: z.string().optional(),
  email: emailSchema,
  phone: phoneSchema.optional(),
  address: addressSchema.optional(),
  vatNumber: vatNumberSchema.optional(),
  kvkNumber: kvkNumberSchema.optional(),
  paymentTermsDays: z.number().min(0).max(120).default(30),
  creditLimit: z.number().min(0).optional(),
  isActive: z.boolean().default(true),
});

// Order schema
export const orderSchema = z.object({
  customerId: z.string().uuid('Selecteer een klant'),
  pickupAddress: addressSchema,
  deliveryAddress: addressSchema,
  pickupDate: z.date({ required_error: 'Ophaaldatum is verplicht' }),
  deliveryDate: z.date({ required_error: 'Leverdatum is verplicht' }),
  weight: z.number().min(0, 'Gewicht moet positief zijn').optional(),
  volume: z.number().min(0, 'Volume moet positief zijn').optional(),
  reference: z.string().optional(),
  notes: z.string().optional(),
  price: z.number().min(0, 'Prijs moet positief zijn').optional(),
}).refine((data) => data.deliveryDate >= data.pickupDate, {
  message: 'Leverdatum moet na ophaaldatum zijn',
  path: ['deliveryDate'],
});

// Trip schema
export const tripSchema = z.object({
  driverId: z.string().uuid('Selecteer een chauffeur').optional(),
  vehicleId: z.string().uuid('Selecteer een voertuig').optional(),
  startDate: z.date({ required_error: 'Startdatum is verplicht' }),
  endDate: z.date().optional(),
  notes: z.string().optional(),
});

// Invoice schema
export const invoiceSchema = z.object({
  customerId: z.string().uuid('Selecteer een klant'),
  dueDate: z.date({ required_error: 'Vervaldatum is verplicht' }),
  lines: z.array(z.object({
    description: z.string().min(1, 'Omschrijving is verplicht'),
    quantity: z.number().min(1, 'Aantal moet minimaal 1 zijn'),
    unitPrice: z.number().min(0, 'Prijs moet positief zijn'),
    vatRate: z.number().min(0).max(100).default(21),
  })).min(1, 'Minimaal 1 regel is verplicht'),
  notes: z.string().optional(),
});

// Driver schema
export const driverSchema = z.object({
  fullName: z.string().min(2, 'Naam moet minimaal 2 karakters zijn'),
  email: emailSchema,
  phone: phoneSchema,
  licenseNumber: z.string().min(1, 'Rijbewijsnummer is verplicht'),
  licenseExpiry: z.date({ required_error: 'Verloopdatum is verplicht' }),
  isActive: z.boolean().default(true),
});

// Vehicle schema
export const vehicleSchema = z.object({
  licensePlate: z.string().regex(/^[A-Z0-9-]+$/, 'Ongeldige kentekenplaat'),
  brand: z.string().min(1, 'Merk is verplicht'),
  model: z.string().min(1, 'Model is verplicht'),
  vehicleType: z.enum(['bus', 'vrachtwagen', 'bestelbus', 'aanhanger']),
  maxWeight: z.number().min(0).optional(),
  maxVolume: z.number().min(0).optional(),
  apkExpiry: z.date().optional(),
  isActive: z.boolean().default(true),
});

// Login schema
export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(6, 'Wachtwoord moet minimaal 6 karakters zijn'),
});

// Register schema
export const registerSchema = z.object({
  email: emailSchema,
  password: z.string().min(8, 'Wachtwoord moet minimaal 8 karakters zijn'),
  confirmPassword: z.string(),
  fullName: z.string().min(2, 'Naam moet minimaal 2 karakters zijn'),
  companyName: z.string().min(2, 'Bedrijfsnaam moet minimaal 2 karakters zijn'),
  acceptTerms: z.boolean().refine((val) => val === true, 'Accepteer de voorwaarden'),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Wachtwoorden komen niet overeen',
  path: ['confirmPassword'],
});

// Type exports
export type CustomerFormData = z.infer<typeof customerSchema>;
export type OrderFormData = z.infer<typeof orderSchema>;
export type TripFormData = z.infer<typeof tripSchema>;
export type InvoiceFormData = z.infer<typeof invoiceSchema>;
export type DriverFormData = z.infer<typeof driverSchema>;
export type VehicleFormData = z.infer<typeof vehicleSchema>;
export type LoginFormData = z.infer<typeof loginSchema>;
export type RegisterFormData = z.infer<typeof registerSchema>;
export type AddressFormData = z.infer<typeof addressSchema>;
