import { z } from 'zod'

export const emailSchema = z.string().email().max(255)

export const passwordSchema = z
  .string()
  .min(12, 'Mot de passe trop court (min. 12)')
  .max(128)
  .regex(/[A-Z]/, 'Au moins une majuscule')
  .regex(/[a-z]/, 'Au moins une minuscule')
  .regex(/[0-9]/, 'Au moins un chiffre')
  .regex(/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/, 'Au moins un symbole')

export const reservationCreateSchema = z.object({
  startDate: z.string().min(1),
  endDate: z.string().min(1),
  guests: z.coerce.number().int().min(1).max(50),
  comment: z.string().max(2000).optional().nullable(),
  userId: z.string().uuid().optional(),
})

export const invitationSchema = z.object({
  email: emailSchema,
})

export const firstUserSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  name: z.string().min(1).max(120).optional().nullable(),
  turnstileToken: z.string().optional().nullable(),
})

export const registerSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  name: z.string().min(1).max(120).optional().nullable(),
  token: z.string().min(10),
  turnstileToken: z.string().optional().nullable(),
})
