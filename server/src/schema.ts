import { z } from 'zod';

// User role enum
export const userRoleSchema = z.enum(['admin', 'participant', 'speaker']);
export type UserRole = z.infer<typeof userRoleSchema>;

// Registration type enum
export const registrationTypeSchema = z.enum(['free', 'approval_required', 'payment_required']);
export type RegistrationType = z.infer<typeof registrationTypeSchema>;

// Registration status enum
export const registrationStatusSchema = z.enum(['pending', 'approved', 'rejected', 'paid', 'cancelled']);
export type RegistrationStatus = z.infer<typeof registrationStatusSchema>;

// User schema
export const userSchema = z.object({
  id: z.number(),
  name: z.string(),
  email: z.string().email(),
  role: userRoleSchema,
  password: z.string(),
  created_at: z.coerce.date()
});

export type User = z.infer<typeof userSchema>;

// Input schema for creating users
export const createUserInputSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  role: userRoleSchema,
  password: z.string().min(6)
});

export type CreateUserInput = z.infer<typeof createUserInputSchema>;

// Input schema for updating users
export const updateUserInputSchema = z.object({
  id: z.number(),
  name: z.string().min(1).optional(),
  email: z.string().email().optional(),
  role: userRoleSchema.optional(),
  password: z.string().min(6).optional()
});

export type UpdateUserInput = z.infer<typeof updateUserInputSchema>;

// Seminar schema
export const seminarSchema = z.object({
  id: z.number(),
  title: z.string(),
  description: z.string(),
  date: z.coerce.date(),
  time: z.string(),
  location: z.string(),
  speaker_id: z.number(),
  capacity: z.number().int(),
  cost: z.number().nonnegative().nullable(),
  registration_type: registrationTypeSchema,
  created_at: z.coerce.date()
});

export type Seminar = z.infer<typeof seminarSchema>;

// Input schema for creating seminars
export const createSeminarInputSchema = z.object({
  title: z.string().min(1),
  description: z.string(),
  date: z.coerce.date(),
  time: z.string(),
  location: z.string().min(1),
  speaker_id: z.number(),
  capacity: z.number().int().positive(),
  cost: z.number().nonnegative().nullable().default(0),
  registration_type: registrationTypeSchema.default('free')
});

export type CreateSeminarInput = z.infer<typeof createSeminarInputSchema>;

// Input schema for updating seminars
export const updateSeminarInputSchema = z.object({
  id: z.number(),
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  date: z.coerce.date().optional(),
  time: z.string().optional(),
  location: z.string().min(1).optional(),
  speaker_id: z.number().optional(),
  capacity: z.number().int().positive().optional(),
  cost: z.number().nonnegative().nullable().optional(),
  registration_type: registrationTypeSchema.optional()
});

export type UpdateSeminarInput = z.infer<typeof updateSeminarInputSchema>;

// Registration schema
export const registrationSchema = z.object({
  id: z.number(),
  seminar_id: z.number(),
  participant_id: z.number(),
  registration_date: z.coerce.date(),
  status: registrationStatusSchema,
  created_at: z.coerce.date()
});

export type Registration = z.infer<typeof registrationSchema>;

// Input schema for creating registrations
export const createRegistrationInputSchema = z.object({
  seminar_id: z.number(),
  participant_id: z.number(),
  status: registrationStatusSchema.default('pending')
});

export type CreateRegistrationInput = z.infer<typeof createRegistrationInputSchema>;

// Input schema for updating registration status
export const updateRegistrationStatusInputSchema = z.object({
  id: z.number(),
  status: registrationStatusSchema
});

export type UpdateRegistrationStatusInput = z.infer<typeof updateRegistrationStatusInputSchema>;

// Attendance schema
export const attendanceSchema = z.object({
  id: z.number(),
  registration_id: z.number(),
  attended: z.boolean(),
  attendance_date: z.coerce.date(),
  created_at: z.coerce.date()
});

export type Attendance = z.infer<typeof attendanceSchema>;

// Input schema for creating/updating attendance
export const updateAttendanceInputSchema = z.object({
  registration_id: z.number(),
  attended: z.boolean()
});

export type UpdateAttendanceInput = z.infer<typeof updateAttendanceInputSchema>;

// Certificate schema
export const certificateSchema = z.object({
  id: z.number(),
  registration_id: z.number(),
  issue_date: z.coerce.date(),
  certificate_url: z.string(),
  created_at: z.coerce.date()
});

export type Certificate = z.infer<typeof certificateSchema>;

// Input schema for generating certificates
export const generateCertificateInputSchema = z.object({
  registration_id: z.number()
});

export type GenerateCertificateInput = z.infer<typeof generateCertificateInputSchema>;

// Query input schemas
export const getUserInputSchema = z.object({
  id: z.number()
});

export type GetUserInput = z.infer<typeof getUserInputSchema>;

export const getSeminarInputSchema = z.object({
  id: z.number()
});

export type GetSeminarInput = z.infer<typeof getSeminarInputSchema>;

export const getRegistrationsByUserInputSchema = z.object({
  participant_id: z.number()
});

export type GetRegistrationsByUserInput = z.infer<typeof getRegistrationsByUserInputSchema>;

export const getRegistrationsBySeminarInputSchema = z.object({
  seminar_id: z.number()
});

export type GetRegistrationsBySeminarInput = z.infer<typeof getRegistrationsBySeminarInputSchema>;

export const getAttendanceByRegistrationInputSchema = z.object({
  registration_id: z.number()
});

export type GetAttendanceByRegistrationInput = z.infer<typeof getAttendanceByRegistrationInputSchema>;

export const getCertificateByRegistrationInputSchema = z.object({
  registration_id: z.number()
});

export type GetCertificateByRegistrationInput = z.infer<typeof getCertificateByRegistrationInputSchema>;