import { z } from 'zod';

export const userSchema = z.object({
  email: z.email(),
  name: z.string().min(2).max(50),
  avatar: z.string().max(255).optional(),
  status: z.enum(["online", "offline", "away", "busy"]).optional(),
});

export type UserSchema = z.infer<typeof userSchema>;
